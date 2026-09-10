import json
import os
import subprocess
import time
from typing import Any, Dict
import aiosqlite
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.database import get_db

router = APIRouter(prefix="/api/system", tags=["system"])

GITHUB_REPO = "mybot-engine/mybot"

class ProxyConfigRequest(BaseModel):
    cf_worker_url: str = ""
    http_proxy: str = ""
    proxy_mode: str = "all"  # 'all', 'selected', 'none'

@router.get("/info")
async def get_system_info() -> Dict[str, Any]:
    return {
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "admin_secret_path": settings.ADMIN_SECRET_PATH,
        "is_docker": os.path.exists("/.dockerenv"),
        "debug": settings.DEBUG
    }

@router.get("/proxy")
async def get_proxy_config(db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT value FROM system_settings WHERE key = 'proxy_config'")
    row = await cursor.fetchone()
    if row and row["value"]:
        return json.loads(row["value"])
    return {
        "cf_worker_url": settings.CF_PROXY_URL,
        "http_proxy": settings.HTTP_PROXY,
        "proxy_mode": "all"
    }

@router.post("/proxy")
async def save_proxy_config(req: ProxyConfigRequest, db: aiosqlite.Connection = Depends(get_db)):
    val = req.model_dump()
    await db.execute("""
        INSERT INTO system_settings (key, value, updated_at)
        VALUES ('proxy_config', ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    """, (json.dumps(val),))
    await db.commit()

    # If proxy_mode is 'all', update all bots settings
    if req.proxy_mode == "all":
        cursor = await db.execute("SELECT id, settings FROM bots")
        bots = await cursor.fetchall()
        for b in bots:
            st = json.loads(b["settings"]) if b["settings"] else {}
            st["cf_worker_url"] = req.cf_worker_url
            st["custom_proxy"] = req.http_proxy
            await db.execute("UPDATE bots SET settings = ? WHERE id = ?", (json.dumps(st), b["id"]))
        await db.commit()

    return {"success": True, "config": val}

@router.post("/proxy/test")
async def test_proxy_latency(req: ProxyConfigRequest):
    """Tests latency to Cloudflare worker or Telegram API."""
    target_url = req.cf_worker_url.rstrip("/") if req.cf_worker_url else "https://api.telegram.org"
    start = time.time()
    try:
        async with httpx.AsyncClient(timeout=6.0, proxy=req.http_proxy or None) as client:
            resp = await client.get(target_url)
            latency = round((time.time() - start) * 1000, 1)
            return {
                "success": True,
                "status_code": resp.status_code,
                "latency_ms": latency,
                "url": target_url,
                "message": f"Connection successful ({latency} ms)"
            }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "url": target_url,
            "message": f"Connection failed: {str(e)}"
        }

@router.get("/check-update")
async def check_update() -> Dict[str, Any]:
    return {
        "current_version": settings.VERSION,
        "latest_version": settings.VERSION,
        "has_update": False,
        "release_notes": "Up to date."
    }

@router.post("/update")
async def trigger_update():
    update_script = "/app/deploy/update.sh"
    if os.path.exists(update_script):
        subprocess.Popen(["bash", update_script])
        return {"success": True, "message": "Zero-downtime update initiated in background."}
    return {"success": False, "message": "Update script not found in environment."}
