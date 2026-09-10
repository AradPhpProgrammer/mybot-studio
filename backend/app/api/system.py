import os
import subprocess
from typing import Any, Dict
import httpx
from fastapi import APIRouter, HTTPException

from app.config import settings

router = APIRouter(prefix="/api/system", tags=["system"])

GITHUB_REPO = "mybot-engine/mybot"  # Target repo for release tags

@router.get("/info")
async def get_system_info() -> Dict[str, Any]:
    return {
        "app_name": settings.APP_NAME,
        "version": settings.VERSION,
        "admin_secret_path": settings.ADMIN_SECRET_PATH,
        "is_docker": os.path.exists("/.dockerenv"),
        "debug": settings.DEBUG
    }

@router.get("/check-update")
async def check_update() -> Dict[str, Any]:
    """Checks remote repository for newer releases and reports status."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest")
            if resp.status_code == 200:
                data = resp.json()
                latest_version = data.get("tag_name", "").lstrip("v")
                has_update = latest_version > settings.VERSION if latest_version else False
                return {
                    "current_version": settings.VERSION,
                    "latest_version": latest_version,
                    "has_update": has_update,
                    "release_notes": data.get("body", ""),
                    "published_at": data.get("published_at", "")
                }
    except Exception:
        pass

    return {
        "current_version": settings.VERSION,
        "latest_version": settings.VERSION,
        "has_update": False,
        "release_notes": "Up to date."
    }

@router.post("/update")
async def trigger_update():
    """
    Executes deploy/update.sh to pull newest panel image and restart the panel
    WITHOUT touching or stopping the bot-engine container (ZERO DOWNTIME for bots!).
    """
    update_script = "/app/deploy/update.sh"
    if os.path.exists(update_script):
        subprocess.Popen(["bash", update_script])
        return {"success": True, "message": "Zero-downtime update initiated in background."}
    return {"success": False, "message": "Update script not found in environment."}
