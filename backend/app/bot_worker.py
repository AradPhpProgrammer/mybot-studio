import asyncio
import logging
import json
from pathlib import Path
from contextlib import asynccontextmanager
from weakref import WeakValueDictionary

from aiogram.utils.text_decorations import html_decoration

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


class KeyboardStateStore:
    """One durable source row per bot/chat, separate from studio/subscriber DBs.

    Unknown legacy chats are deliberately not cleared: their source is unknown.
    Connections are short-lived; no database is opened at module import time.
    """

    def __init__(self, db_path, bot_id: int):
        self.db_path = str(db_path)
        self.bot_id = bot_id
        self._locks = WeakValueDictionary()

    def lock(self, chat_id):
        lock = self._locks.get(chat_id)
        if lock is None:
            lock = asyncio.Lock()
            self._locks[chat_id] = lock
        return lock

    @asynccontextmanager
    async def connection(self):
        async with aiosqlite.connect(self.db_path, timeout=30) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS keyboard_state (
                    bot_id INTEGER NOT NULL,
                    chat_id INTEGER NOT NULL,
                    kb_type TEXT NOT NULL CHECK(kb_type IN ('reply', 'inline')),
                    source_node_id TEXT,
                    PRIMARY KEY (bot_id, chat_id)
                )
            """)
            await db.execute("""CREATE TABLE IF NOT EXISTS keyboard_pending (
                bot_id INTEGER NOT NULL, chat_id INTEGER NOT NULL,
                payload TEXT NOT NULL, PRIMARY KEY (bot_id, chat_id))""")
            yield db

    async def get(self, chat_id):
        async with self.connection() as db:
            async with db.execute(
                "SELECT kb_type, source_node_id FROM keyboard_state WHERE bot_id=? AND chat_id=?",
                (self.bot_id, chat_id),
            ) as cursor:
                row = await cursor.fetchone()
                return dict(zip(("kb_type", "source_node_id"), row)) if row else None

    async def pending(self, chat_id):
        async with self.connection() as db:
            cursor = await db.execute("SELECT payload FROM keyboard_pending WHERE bot_id=? AND chat_id=?", (self.bot_id, chat_id))
            row = await cursor.fetchone()
            return json.loads(row[0]) if row else None

    async def save_pending(self, chat_id, payload):
        async with self.connection() as db:
            await db.execute("DELETE FROM keyboard_state WHERE bot_id=? AND chat_id=?", (self.bot_id, chat_id))
            await db.execute("INSERT OR REPLACE INTO keyboard_pending VALUES (?, ?, ?)",
                             (self.bot_id, chat_id, json.dumps(payload)))
            await db.commit()

    async def clear_pending(self, chat_id):
        async with self.connection() as db:
            await db.execute("DELETE FROM keyboard_pending WHERE bot_id=? AND chat_id=?", (self.bot_id, chat_id))
            await db.commit()

    async def record(self, chat_id, kb_type, source_node_id):
        async with self.connection() as db:
            await db.execute("""
                INSERT INTO keyboard_state (bot_id, chat_id, kb_type, source_node_id)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(bot_id, chat_id) DO UPDATE SET
                    kb_type=excluded.kb_type, source_node_id=excluded.source_node_id
            """, (self.bot_id, chat_id, kb_type, source_node_id))
            await db.commit()


class MessageSender:
    """Shared message/callback delivery, including same-source keyboard changes."""

    def __init__(self, state):
        self.state = state
        # Only the last delivery per chat, like last_sent_messages. Used for
        # keyboard-only edits whose final content isn't repeated by the DAG.
        self.last_content = {}

    @staticmethod
    def keyboard_type(markup):
        if isinstance(markup, types.ReplyKeyboardMarkup) and any(markup.keyboard):
            return "reply"
        if isinstance(markup, types.InlineKeyboardMarkup) and any(markup.inline_keyboard):
            return "inline"
        return None

    @staticmethod
    async def send(bot, chat_id, content, markup):
        text = content.get("text") or ""
        media_type = content.get("media_type", "text")
        url = content.get("media_url")
        common = dict(chat_id=chat_id, parse_mode=ParseMode.HTML, reply_markup=markup)
        if media_type in ("photo", "video") and url:
            method = bot.send_photo if media_type == "photo" else bot.send_video
            return await method(**common, **{media_type: url}, caption=text)
        if text:
            return await bot.send_message(**common, text=text)
        return None

    @staticmethod
    async def edit(bot, chat_id, target_id, text, markup):
        # Telegram edit endpoints accept inline markup only.
        if isinstance(markup, types.ReplyKeyboardMarkup):
            return False
        common = dict(chat_id=chat_id, message_id=target_id, reply_markup=markup)
        if text:
            try:
                await bot.edit_message_text(**common, text=text, parse_mode=ParseMode.HTML)
                return True
            except Exception as text_error:
                try:
                    await bot.edit_message_caption(**common, caption=text, parse_mode=ParseMode.HTML)
                    return True
                except Exception:
                    logger.warning("Could not edit message %s: %s", target_id, text_error)
        elif markup is not None:
            try:
                await bot.edit_message_reply_markup(**common)
                return True
            except Exception as error:
                logger.warning("Could not edit message %s markup: %s", target_id, error)
        return False

    def target_content(self, chat_id, target_id, target_message):
        if target_message is not None and target_message.message_id == target_id:
            # html_text/html_caption preserve Telegram entities on copied text.
            text = getattr(target_message, "html_text", None) or getattr(target_message, "html_caption", None)
            if not text:
                raw = getattr(target_message, "text", None) or getattr(target_message, "caption", None) or ""
                text = html_decoration.quote(raw)
            content = {"text": text}
            if getattr(target_message, "photo", None):
                content.update(media_type="photo", media_url=target_message.photo[-1].file_id)
            elif getattr(target_message, "video", None):
                content.update(media_type="video", media_url=target_message.video.file_id)
            return content
        cached = self.last_content.get(chat_id)
        if cached and cached[0] == target_id:
            return dict(cached[1])
        return {}

    async def deliver(self, bot, chat_id, message, last_sent_messages,
                      target_id=None, target_message=None):
        async with self.state.lock(chat_id):
            pending = await self.state.pending(chat_id)
            if pending and pending["message"] == message:
                final_id = pending["message_id"]
                last_sent_messages[chat_id] = final_id
                self.last_content[chat_id] = (final_id, pending["content"])
                await bot.edit_message_reply_markup(chat_id=chat_id, message_id=final_id,
                    reply_markup=build_keyboard_markup(message.get("reply_markup")))
                await self.state.record(chat_id, "inline", pending["source"])
                await self.state.clear_pending(chat_id)
                return final_id
            markup = build_keyboard_markup(message.get("reply_markup"))
            kb_type = self.keyboard_type(markup)
            source = message.get("keyboard_node_id") or message.get("node_id") or None
            source = str(source) if source is not None else None
            previous = await self.state.get(chat_id) if kb_type else None
            # Any inline delivery while a reply keyboard is active removes that
            # keyboard: the outgoing final content itself carries ReplyKeyboardRemove
            # (one visible message, no blank/notice), then the inline markup is
            # attached to that same message. Edit endpoints cannot remove a reply
            # keyboard, so the carrier is always a fresh send.
            transition = (kb_type == "inline" and previous is not None
                          and previous["kb_type"] == "reply")
            is_edit = message.get("is_edit", False)
            if target_id is None:
                target_id = last_sent_messages.get(chat_id)
            content = dict(message)
            if is_edit:
                content = self.target_content(chat_id, target_id, target_message)
                if message.get("text"):
                    content["text"] = message["text"]
                if message.get("media_url"):
                    content.update(media_type=message.get("media_type"), media_url=message["media_url"])

            if transition:
                # The FINAL content carries removal; never send a blank/notice.
                # Media itself is a valid carrier, even without a caption.
                sent = await self.send(bot, chat_id, content, types.ReplyKeyboardRemove(remove_keyboard=True))
                if sent is None:
                    raise ValueError("Cannot transition keyboard without final text or media")
                last_sent_messages[chat_id] = sent.message_id
                self.last_content[chat_id] = (sent.message_id, content)
                await self.state.save_pending(chat_id, {"message": message, "content": content,
                    "message_id": sent.message_id, "source": source})
                await bot.edit_message_reply_markup(
                    chat_id=chat_id, message_id=sent.message_id, reply_markup=markup)
                final_id = sent.message_id
            elif is_edit and target_id and await self.edit(
                    bot, chat_id, target_id, message.get("text"), markup):
                final_id = target_id
            else:
                # A reply keyboard cannot be edited onto a Telegram message.
                # Send final content instead; preserve media on edit fallback.
                sent = await self.send(bot, chat_id, content, markup)
                if sent is None:
                    return None
                final_id = sent.message_id

            last_sent_messages[chat_id] = final_id
            self.last_content[chat_id] = (final_id, content)
            # An unrelated inline message does not remove the active reply keyboard.
            if kb_type and (kb_type == "reply" or transition or not previous or previous["kb_type"] != "reply"):
                await self.state.record(chat_id, kb_type, source)
            await self.state.clear_pending(chat_id)
            return final_id


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
    state = KeyboardStateStore(Path(settings.DATABASE_PATH).with_name("keyboard_state.sqlite"), bot_id)
    sender = MessageSender(state)

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
                target_message = message.reply_to_message
                target_id = last_sent_messages.get(message.chat.id)
                if not target_id and target_message:
                    target_id = target_message.message_id
                await sender.deliver(bot, message.chat.id, m, last_sent_messages,
                                     target_id=target_id, target_message=target_message)

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

            # 2. Process messages (edit or send) through the same transition path.
            if callback.message:
                for m in res.get("messages", []):
                    await sender.deliver(
                        bot, callback.message.chat.id, m, last_sent_messages,
                        target_id=callback.message.message_id,
                        target_message=callback.message,
                    )

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