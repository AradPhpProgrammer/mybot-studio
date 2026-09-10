import asyncio
import json
import logging
import signal
import sys
import aiosqlite
from aiogram import Bot, Dispatcher, types
from aiogram.enums import ParseMode

from app.config import settings
from app.database import init_db
from app.engine.dag_runner import DAGRunner
from app.telegram.bot_manager import bot_manager

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [BotWorker] %(message)s")
logger = logging.getLogger("BotWorker")

active_tasks: dict = {}
is_running = True
RETRY_DELAY_BASE = 5  # seconds
MAX_RETRY_DELAY = 60  # max 1 minute between retries

async def run_bot_polling(bot_id: int, token: str, settings_dict: dict):
    """Runs long polling loop for a specific bot with exponential backoff on failure."""
    session = bot_manager.get_api_session(
        settings_dict.get("cf_worker_url"), settings_dict.get("custom_proxy")
    )
    bot = Bot(token=token, session=session)
    dp = Dispatcher()

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

                reply_markup = None
                if markup and "inline_keyboard" in markup:
                    reply_markup = types.InlineKeyboardMarkup(
                        inline_keyboard=[
                            [
                                types.InlineKeyboardButton(
                                    text=b["text"],
                                    callback_data=b.get("callback_data"),
                                    url=b.get("url")
                                )
                                for b in row
                            ]
                            for row in markup["inline_keyboard"]
                        ]
                    )

                if mtype == "text":
                    await bot.send_message(chat_id=message.chat.id, text=text, parse_mode=ParseMode.HTML, reply_markup=reply_markup)
                elif mtype == "photo" and murl:
                    await bot.send_photo(chat_id=message.chat.id, photo=murl, caption=text, parse_mode=ParseMode.HTML, reply_markup=reply_markup)
                elif mtype == "video" and murl:
                    await bot.send_video(chat_id=message.chat.id, video=murl, caption=text, parse_mode=ParseMode.HTML, reply_markup=reply_markup)

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
            chat_id = callback.message.chat.id if callback.message else callback.from_user.id
            res = await runner.execute_flow(
                event_type="callback",
                payload=callback.data or "",
                user_info=user_info,
                bot_client=bot,
                chat_id=chat_id
            )
            for m in res.get("messages", []):
                text = m.get("text", "")
                markup = m.get("reply_markup")
                reply_markup = None
                if markup and "inline_keyboard" in markup:
                    reply_markup = types.InlineKeyboardMarkup(
                        inline_keyboard=[
                            [
                                types.InlineKeyboardButton(
                                    text=b["text"],
                                    callback_data=b.get("callback_data"),
                                    url=b.get("url")
                                )
                                for b in row
                            ]
                            for row in markup["inline_keyboard"]
                        ]
                    )
                await bot.send_message(chat_id=chat_id, text=text, parse_mode=ParseMode.HTML, reply_markup=reply_markup)

            alerts = res.get("alerts", [])
            alert_text = alerts[0]["text"] if alerts else None
            show_alert = alerts[0].get("show_alert", False) if alerts else False
            await callback.answer(text=alert_text, show_alert=show_alert)

    try:
        logger.info(f"Bot #{bot_id} polling started.")
        await dp.start_polling(bot)
    except Exception as e:
        err_str = str(e)
        logger.error(f"Bot #{bot_id} encountered polling error: {err_str[:200]}")
    finally:
        try:
            await bot.session.close()
        except Exception:
            pass

async def supervisor_loop():
    """Supervises all active bots from the shared SQLite DB with exponential backoff on errors."""
    await init_db()
    logger.info("Supervisor loop initiated. Zero-downtime bot engine is online.")
    last_error_time = 0
    
    while is_running:
        try:
            async with aiosqlite.connect(settings.DATABASE_PATH) as db:
                db.row_factory = aiosqlite.Row
                cursor = await db.execute("SELECT id, token, settings FROM bots WHERE is_active = 1")
                bots = await cursor.fetchall()

                current_ids = set()
                for b in bots:
                    bid = b["id"]
                    current_ids.add(bid)
                    if bid not in active_tasks or active_tasks[bid].done():
                        st = json.loads(b["settings"]) if b["settings"] else {}
                        task = asyncio.create_task(run_bot_polling(bid, b["token"], st))
                        active_tasks[bid] = task

                for existing_id in list(active_tasks.keys()):
                    if existing_id not in current_ids:
                        active_tasks[existing_id].cancel()
                        try:
                            await active_tasks[existing_id]
                        except asyncio.CancelledError:
                            pass
                        del active_tasks[existing_id]

        except Exception as e:
            now = asyncio.get_event_loop().time()
            if now - last_error_time > 30:  # Log at most once per 30s
                logger.error(f"Supervisor loop error: {e}")
                last_error_time = now

        # Exponential backoff: sleep between 5s and 60s based on errors
        await asyncio.sleep(RETRY_DELAY_BASE)

def handle_sigterm(sig, frame):
    global is_running
    is_running = False
    logger.info("Received termination signal. Gracefully stopping bots...")
    for task in active_tasks.values():
        task.cancel()
    sys.exit(0)

if __name__ == "__main__":
    signal.signal(signal.SIGINT, handle_sigterm)
    signal.signal(signal.SIGTERM, handle_sigterm)
    asyncio.run(supervisor_loop())
