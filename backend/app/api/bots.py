import json
import logging
from pathlib import Path
from typing import Any, Dict, List
import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File

from app.database import get_db
from app.database_bots import AVAILABLE_USER_FIELDS, DEFAULT_TRACKED_FIELDS, get_bot_db, get_bot_db_path
from app.models.schemas import BotCreateRequest, BotResponse, BotSettingsUpdate
from app.telegram.bot_manager import bot_manager

logger = logging.getLogger("MyBot.BotsAPI")

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
        s = json.loads(r["settings"]) if r["settings"] else {}
        bots.append({
            "id": r["id"],
            "name": r["name"],
            "username": r["username"],
            "telegram_bot_id": r["telegram_bot_id"],
            "is_active": bool(r["is_active"]),
            "settings": s,
            "photo_url": s.get("photo_url"),
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
    settings_dict = json.loads(bot["settings"]) if bot["settings"] else {}
    return {
        "id": bot["id"],
        "name": bot["name"],
        "username": bot["username"],
        "telegram_bot_id": bot["telegram_bot_id"],
        "is_active": bool(bot["is_active"]),
        "settings": settings_dict,
        "photo_url": settings_dict.get("photo_url"),
        "created_at": str(bot["created_at"])
    }

@router.put("/{bot_id}/settings")
async def update_bot_settings(bot_id: int, req: BotSettingsUpdate, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT id, name, is_active, settings FROM bots WHERE id = ?", (bot_id,))
    bot = await cursor.fetchone()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
        
    current = json.loads(bot["settings"]) if bot["settings"] else {}
    update_data = req.model_dump(exclude_unset=True)
    
    name_val = update_data.pop("name", None)
    is_active_val = update_data.pop("is_active", None)
    current.update(update_data)
    
    new_name = name_val if name_val is not None else bot["name"]
    new_active = int(is_active_val) if is_active_val is not None else bot["is_active"]

    await db.execute(
        "UPDATE bots SET name = ?, is_active = ?, settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        (new_name, new_active, json.dumps(current), bot_id)
    )
    await db.commit()
    return {"success": True, "name": new_name, "is_active": bool(new_active), "settings": current}

@router.post("/{bot_id}/toggle-active")
async def toggle_bot_active(bot_id: int, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT is_active FROM bots WHERE id = ?", (bot_id,))
    bot = await cursor.fetchone()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    new_state = 0 if bot["is_active"] else 1
    await db.execute("UPDATE bots SET is_active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", (new_state, bot_id))
    await db.commit()
    return {"success": True, "is_active": bool(new_state)}

@router.delete("/{bot_id}")
async def delete_bot(bot_id: int, db: aiosqlite.Connection = Depends(get_db)):
    await db.execute("DELETE FROM bots WHERE id = ?", (bot_id,))
    await db.commit()
    return {"success": True, "deleted_id": bot_id}

@router.post("/{bot_id}/sync-commands")
async def sync_commands(bot_id: int, db: aiosqlite.Connection = Depends(get_db)):
    await bot_manager.sync_bot_commands(bot_id, db)
    return {"success": True, "message": "Commands synced with Telegram Bot API."}


@router.post("/{bot_id}/refresh")
async def refresh_bot(bot_id: int, db: aiosqlite.Connection = Depends(get_db)):
    try:
        updated = await bot_manager.refresh_bot_info(bot_id, db)
        return {"status": "ok", "bot": updated}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{bot_id}/avatar")
async def upload_bot_avatar(bot_id: int, file: UploadFile = File(...), db: aiosqlite.Connection = Depends(get_db)) -> Dict[str, Any]:
    cursor = await db.execute("SELECT settings FROM bots WHERE id = ?", (bot_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Bot not found")

    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "png"
    if ext not in {"png", "jpg", "jpeg", "webp", "gif"}:
        raise HTTPException(status_code=400, detail="Unsupported image type")

    upload_dir = Path(__file__).resolve().parent.parent.parent / "uploads"
    upload_dir.mkdir(exist_ok=True)
    fname = f"bot_{bot_id}.{ext}"
    dest = upload_dir / fname
    content = await file.read()
    dest.write_bytes(content)

    photo_url = f"/media/{fname}"
    settings_dict = json.loads(row["settings"]) if row["settings"] else {}
    settings_dict["photo_url"] = photo_url
    await db.execute("UPDATE bots SET settings = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                     (json.dumps(settings_dict), bot_id))
    await db.commit()

    return {"status": "ok", "photo_url": photo_url}


@router.get("/{bot_id}/database-schema")
async def get_bot_database_schema(bot_id: int, db: aiosqlite.Connection = Depends(get_db)) -> Dict[str, Any]:
    """Returns database configuration for this specific bot: isolated DB path, active tracked fields, and available fields."""
    cursor = await db.execute("SELECT settings FROM bots WHERE id = ?", (bot_id,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Bot not found")

    settings_dict = json.loads(row["settings"]) if row["settings"] else {}
    tracked = settings_dict.get("tracked_user_fields")
    if not isinstance(tracked, list):
        tracked = DEFAULT_TRACKED_FIELDS

    # Query subscriber count from this bot's own dedicated database
    sub_count = 0
    try:
        bot_db = await get_bot_db(bot_id)
        c = await bot_db.execute("SELECT COUNT(*) AS total FROM subscribers")
        r = await c.fetchone()
        sub_count = r["total"] if r else 0
        await bot_db.close()
    except Exception as e:
        logger.warning(f"Could not read subscriber count from bot_{bot_id}.db: {e}")

    return {
        "bot_id": bot_id,
        "database_file": str(get_bot_db_path(bot_id).name),
        "database_absolute_path": str(get_bot_db_path(bot_id)),
        "subscribers_count": sub_count,
        "tracked_fields": tracked,
        "available_fields": AVAILABLE_USER_FIELDS
    }

