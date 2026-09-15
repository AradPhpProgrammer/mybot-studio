import asyncio
import logging
import aiosqlite
from aiogram import Bot, Dispatcher, types
from aiogram.enums import ParseMode
from aiogram.exceptions import TelegramAPIError

from app.config import settings
from app.engine.dag_runner import DAGRunner
from app.telegram.bot_manager import bot_manager

logger = logging.getLogger(__name__)

# Track active long-polling tasks by bot_id
ACTIVE_WORKERS = {}

RETRY_DELAY_BASE = 5  # seconds
MAX_RETRY_DELAY = 60  # max 1 minute between retries


def build_telegram_inline_keyboard(markup: dict):
    """
    Builds official InlineKeyboardMarkup with native Bot API button styles:
    - primary (blue)
    - success (green)
    - danger (red)
    - default/none (omitted -> native client theme)
    """
    if not markup or "inline_keyboard" not in markup:
        return None

    rows = []
    for row in markup["inline_keyboard"]:
        row_btns = []
        for b in row:
            btn_kwargs = {
                "text": b.get("text", "Button"),
                "callback_data": b.get("callback_data"),
                "url": b.get("url")
            }
            # Official Telegram Bot API semantic style
            style = b.get("style")
            if style in ("primary", "success", "danger"):
                btn_kwargs["style"] = style

            row_btns.append(types.InlineKeyboardButton(**btn_kwargs))
        rows.append(row_btns)

    return types.InlineKeyboardMarkup(inline_keyboard=rows)


def build_telegram_reply_keyboard(markup: dict):
    """
    Builds official ReplyKeyboardMarkup with native styles.
    """
    if not markup:
        return None

    # Check for reply keyboard structure
    reply_rows = markup.get("keyboard")
    if not reply_rows and markup.get("keyboard_type") == "reply":
        reply_rows = markup.get("buttons")

    if not reply_rows:
        return None

    rows = []
    for row in reply_rows:
        row_btns = []
        for b in row:
            btn_kwargs = {"text": b.get("text", "Button")}
            style = b.get("style")
            if style in ("primary", "success", "danger"):
                btn_kwargs["style"] = style
            row_btns.append(types.KeyboardButton(**btn_kwargs))
        rows.append(row_btns)

    return types.ReplyKeyboardMarkup(keyboard=rows, resize_keyboard=True)


def build_keyboard_markup(markup: dict):
    """Detects whether markup is inline or reply keyboard and builds accordingly."""
    if not markup:
        return None
    if "inline_keyboard" in markup or markup.get("keyboard_type") == "inline":
        return build_telegram_inline_keyboard(markup)
    if "keyboard" in markup or markup.get("keyboard_type") == "reply":
        return build_telegram_reply_keyboard(markup)
    # Default fallback
    return build_telegram_inline_keyboard(markup)


async def run_bot_worker(bot_id: int, token: str, settings_dict: dict):
    """Runs long polling loop for a specific bot with exponential backoff on failure."""
    db_proxy = None
    try:
        async with aiosqlite.connect(settings.DATABASE_PATH) as _sdb:
            _sdb.row_factory = aiosqlite.Row
            cur = await _sdb.execute("SELECT value FROM system_settings WHERE key = 'proxy_config'")
            prow = await cur.fetchone()
            if prow and prow["value"]:
                pcfg = json.loads(prow["value"])
                db_proxy = pcfg.get("http_proxy") or pcfg.get("cf_worker_url")
    except Exception:
        pass

    session = bot_manager.get_api_session(
        settings_dict.get("cf_worker_url"),
        settings_dict.get("custom_proxy"),
        db_proxy_url=db_proxy
    )
    bot = Bot(token=token, session=session)
    dp = Dispatcher()

    # Track last sent message ID per chat to enable action_edit_message on standard flows
    last_sent_messages = {}

    @dp.message()
    async def on_message(message: types.Message):
        async with aiosqlite.connect(settings.DATABASE_PATH) as db:
            db.row_factory = aiosqlite.Row
            runner = DAGRunner(bot_id=bot_id, db=db)
            event_type = "command" if message.text and message.text.startswith("/") else "message"
            user_info = {
                "id": message.from_user.id,
                "username": message.from_user.username or "",
                "first_name": message.from_user.first_name or "",
                "last_name": message.from_user.last_name or "",
                "language_code": message.from_user.language_code or "fa"
            }
            res = await runner.execute_flow(
                event_type=event_type,
                payload=message.text or "",
                user_info=user_info,
                bot_client=bot,
                chat_id=message.chat.id
            )

            for m in res.get("messages", []):
                text = m.get("text", "")
                markup = m.get("reply_markup")
                mtype = m.get("media_type", "text")
                murl = m.get("media_url", "")
                is_edit = m.get("is_edit", False)

                reply_markup = build_keyboard_markup(markup)

                if is_edit:
                    target_msg_id = last_sent_messages.get(message.chat.id)
                    if not target_msg_id and message.reply_to_message:
                        target_msg_id = message.reply_to_message.message_id

                    if target_msg_id and text:
                        try:
                            await bot.edit_message_text(
                                chat_id=message.chat.id,
                                message_id=target_msg_id,
                                text=text,
                                parse_mode=ParseMode.HTML,
                                reply_markup=reply_markup
                            )
                            continue
                        except Exception as edit_err:
                            logger.warning(f"Could not edit message {target_msg_id}: {edit_err}. Falling back to send.")

                    # If edit was not possible, send new message and record ID
                    if text:
                        sent = await bot.send_message(
                            chat_id=message.chat.id,
                            text=text,
                            parse_mode=ParseMode.HTML,
                            reply_markup=reply_markup
                        )
                        last_sent_messages[message.chat.id] = sent.message_id
                    continue

                # Standard sending
                sent_msg = None
                if mtype == "text" and text:
                    sent_msg = await bot.send_message(
                        chat_id=message.chat.id,
                        text=text,
                        parse_mode=ParseMode.HTML,
                        reply_markup=reply_markup
                    )
                elif mtype == "photo" and murl:
                    sent_msg = await bot.send_photo(
                        chat_id=message.chat.id,
                        photo=murl,
                        caption=text,
                        parse_mode=ParseMode.HTML,
                        reply_markup=reply_markup
                    )
                elif mtype == "video" and murl:
                    sent_msg = await bot.send_video(
                        chat_id=message.chat.id,
                        video=murl,
                        caption=text,
                        parse_mode=ParseMode.HTML,
                        reply_markup=reply_markup
                    )

                if sent_msg:
                    last_sent_messages[message.chat.id] = sent_msg.message_id

    @dp.callback_query()
    async def on_callback(callback: types.CallbackQuery):
        async with aiosqlite.connect(settings.DATABASE_PATH) as db:
            db.row_factory = aiosqlite.Row
            runner = DAGRunner(bot_id=bot_id, db=db)
            user_info = {
                "id": callback.from_user.id,
                "username": callback.from_user.username or "",
                "first_name": callback.from_user.first_name or "",
                "last_name": callback.from_user.last_name or "",
                "language_code": callback.from_user.language_code or "fa"
            }
            res = await runner.execute_flow(
                event_type="callback",
                payload=callback.data or "",
                user_info=user_info,
                bot_client=bot,
                chat_id=callback.message.chat.id if callback.message else 0
            )

            # 1. Answer callback if alerts/toasts were returned
            answered = False
            for al in res.get("alerts", []):
                await callback.answer(text=al.get("text", ""), show_alert=al.get("show_alert", False))
                answered = True

            if not answered:
                try:
                    await callback.answer()
                except Exception:
                    pass

            # 2. Process messages (edit or send)
            for m in res.get("messages", []):
                text = m.get("text", "")
                markup = m.get("reply_markup")
                mtype = m.get("media_type", "text")
                murl = m.get("media_url", "")
                is_edit = m.get("is_edit", False)

                reply_markup = build_keyboard_markup(markup)

                if is_edit:
                    # Target is the message where the inline button was clicked
                    if text and callback.message and callback.message.message_id:
                        try:
                            await bot.edit_message_text(
                                chat_id=callback.message.chat.id,
                                message_id=callback.message.message_id,
                                text=text,
                                parse_mode=ParseMode.HTML,
                                reply_markup=reply_markup
                            )
                            last_sent_messages[callback.message.chat.id] = callback.message.message_id
                            continue
                        except Exception as err:
                            logger.warning(f"Error editing callback message: {err}")

                    # Fallback to sending new message if edit fails
                    if text and callback.message:
                        sent = await bot.send_message(
                            chat_id=callback.message.chat.id,
                            text=text,
                            parse_mode=ParseMode.HTML,
                            reply_markup=reply_markup
                        )
                        last_sent_messages[callback.message.chat.id] = sent.message_id
                    continue

                if callback.message:
                    sent_msg = None
                    if mtype == "text" and text:
                        sent_msg = await bot.send_message(
                            chat_id=callback.message.chat.id,
                            text=text,
                            parse_mode=ParseMode.HTML,
                            reply_markup=reply_markup
                        )
                    elif mtype == "photo" and murl:
                        sent_msg = await bot.send_photo(
                            chat_id=callback.message.chat.id,
                            photo=murl,
                            caption=text,
                            parse_mode=ParseMode.HTML,
                            reply_markup=reply_markup
                        )
                    elif mtype == "video" and murl:
                        sent_msg = await bot.send_video(
                            chat_id=callback.message.chat.id,
                            video=murl,
                            caption=text,
                            parse_mode=ParseMode.HTML,
                            reply_markup=reply_markup
                        )

                    if sent_msg:
                        last_sent_messages[callback.message.chat.id] = sent_msg.message_id

    # Start Polling with auto-recovery
    delay = RETRY_DELAY_BASE
    while True:
        try:
            logger.info(f"Starting long polling for bot {bot_id}...")
            await dp.start_polling(bot, handle_signals=False)
            break
        except asyncio.CancelledError:
            logger.info(f"Polling task for bot {bot_id} cancelled.")
            await bot.session.close()
            break
        except TelegramAPIError as api_err:
            logger.error(f"Telegram API error for bot {bot_id}: {api_err}. Retrying in {delay}s...")
            await asyncio.sleep(delay)
            delay = min(delay * 2, MAX_RETRY_DELAY)
        except Exception as e:
            logger.error(f"Unexpected error in polling for bot {bot_id}: {e}. Retrying in {delay}s...")
            await asyncio.sleep(delay)
            delay = min(delay * 2, MAX_RETRY_DELAY)


def start_bot_worker(bot_id: int, token: str, settings_dict: dict):
    """Spawns an async polling task for a bot and registers it."""
    stop_bot_worker(bot_id)
    loop = asyncio.get_event_loop()
    task = loop.create_task(run_bot_worker(bot_id, token, settings_dict))
    ACTIVE_WORKERS[bot_id] = task
    logger.info(f"Worker task registered for bot {bot_id}.")
    return task


def stop_bot_worker(bot_id: int):
    """Cancels and cleans up a bot polling task if running."""
    if bot_id in ACTIVE_WORKERS:
        task = ACTIVE_WORKERS.pop(bot_id)
        if not task.done():
            task.cancel()
        logger.info(f"Worker task stopped for bot {bot_id}.")
