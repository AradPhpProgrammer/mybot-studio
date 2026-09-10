import json
from typing import Any, Dict, List
import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_db
from app.models.schemas import BotCreateRequest, BotResponse, BotSettingsUpdate
from app.telegram.bot_manager import bot_manager

router = APIRouter(prefix="/api/bots", tags=["bots"])

@router.get("", response_model=List[Dict[str, Any]])
async def list_bots(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("""
        SELECT id, name, username, telegram_bot_id, is_active, settings, created_at
        FROM bots ORDER BY id DESC
    """)
    rows = await cursor.fetchall()
    bots = []
    for r in rows:
        bots.append({
            "id": r["id"],
            "name": r["name"],
            "username": r["username"],
            "telegram_bot_id": r["telegram_bot_id"],
            "is_active": bool(r["is_active"]),
            "settings": json.loads(r["settings"]) if r["settings"] else {},
            "created_at": str(r["created_at"])
        })
    return bots

@router.post("", response_model=Dict[str, Any])
async def create_bot(req: BotCreateRequest, db: aiosqlite.Connection = Depends(get_db)):
    try:
        new_bot = await bot_manager.register_new_bot(
            token=req.token.strip(),
            db=db,
            custom_proxy=req.custom_proxy,
            cf_worker_url=req.cf_worker_url
        )
        return {"success": True, "bot": new_bot}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.get("/{bot_id}")
async def get_bot(bot_id: int, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute(
        "SELECT id, name, username, telegram_bot_id, is_active, settings, created_at FROM bots WHERE id = ?",
        (bot_id,)
    )
    bot = await cursor.fetchone()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    return {
        "id": bot["id"],
        "name": bot["name"],
        "username": bot["username"],
        "telegram_bot_id": bot["telegram_bot_id"],
        "is_active": bool(bot["is_active"]),
        "settings": json.loads(bot["settings"]) if bot["settings"] else {},
        "created_at": str(bot["created_at"])
    }

@router.put("/{bot_id}/settings")
async def update_bot_settings(bot_id: int, req: BotSettingsUpdate, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT settings FROM bots WHERE id = ?", (bot_id,))
    bot = await cursor.fetchone()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
        
    current = json.loads(bot["settings"]) if bot["settings"] else {}
    update_data = req.model_dump(exclude_unset=True)
    current.update(update_data)
    
    await db.execute(
        "UPDATE bots SET settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (json.dumps(current), bot_id)
    )
    await db.commit()
    return {"success": True, "settings": current}

@router.delete("/{bot_id}")
async def delete_bot(bot_id: int, db: aiosqlite.Connection = Depends(get_db)):
    await db.execute("DELETE FROM bots WHERE id = ?", (bot_id,))
    await db.commit()
    return {"success": True, "deleted_id": bot_id}

@router.post("/{bot_id}/sync-commands")
async def sync_commands(bot_id: int, db: aiosqlite.Connection = Depends(get_db)):
    await bot_manager.sync_bot_commands(bot_id, db)
    return {"success": True, "message": "Commands synced with Telegram Bot API."}
