import asyncio
import logging
from typing import Any, Dict, List
import aiosqlite
from aiogram import Bot
from aiogram.enums import ParseMode

logger = logging.getLogger(__name__)

class BroadcastPlugin:
    """Safely broadcasts messages to all registered users of a bot."""
    
    @staticmethod
    async def run_broadcast(
        bot_id: int,
        text: str,
        db_path: str,
        bot_token: str,
        media_url: str = None
    ) -> Dict[str, Any]:
        bot = Bot(token=bot_token)
        sent = 0
        failed = 0
        
        async with aiosqlite.connect(db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT telegram_id FROM bot_users WHERE bot_id = ?", (bot_id,))
            users = await cursor.fetchall()

        try:
            for u in users:
                uid = u["telegram_id"]
                try:
                    if media_url:
                        await bot.send_photo(chat_id=uid, photo=media_url, caption=text, parse_mode=ParseMode.HTML)
                    else:
                        await bot.send_message(chat_id=uid, text=text, parse_mode=ParseMode.HTML)
                    sent += 1
                except Exception as e:
                    failed += 1
                    logger.warning(f"Failed to send broadcast to user {uid}: {e}")

                # Rate limiting to respect Telegram's 30 msgs/sec limit
                await asyncio.sleep(0.04)

        finally:
            await bot.session.close()

        return {
            "total": len(users),
            "sent": sent,
            "failed": failed
        }
