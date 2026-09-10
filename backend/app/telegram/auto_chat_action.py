import asyncio
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

ACTION_MAP = {
    "text": "typing",
    "photo": "upload_photo",
    "video": "upload_video",
    "voice": "record_voice",
    "audio": "upload_audio",
    "document": "upload_document",
    "video_note": "record_video_note",
}

async def dispatch_auto_chat_action(
    bot_client: Any,
    chat_id: int,
    media_type: str = "text",
    delay_ms: int = 400
) -> Optional[str]:
    """
    Automatically sends native Telegram chat action (typing, upload_photo, etc.)
    before the actual content is sent, making the bot interactions feel lifelike.
    """
    action = ACTION_MAP.get(media_type.lower(), "typing")
    try:
        if hasattr(bot_client, "send_chat_action"):
            await bot_client.send_chat_action(chat_id=chat_id, action=action)
        if delay_ms > 0:
            await asyncio.sleep(delay_ms / 1000.0)
        return action
    except Exception as e:
        logger.warning(f"Could not send auto chat action '{action}' to chat {chat_id}: {e}")
        return None
