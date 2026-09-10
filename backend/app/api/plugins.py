import importlib.util
import json
from pathlib import Path
from typing import Any, Dict, List
import aiosqlite
from fastapi import APIRouter, Depends, HTTPException

from app.config import settings
from app.database import get_db
from app.models.schemas import PluginToggleRequest

router = APIRouter(prefix="/api/plugins", tags=["plugins"])
PLUGINS_DIR = Path(settings.PLUGINS_DIR)
PLUGINS_DIR.mkdir(parents=True, exist_ok=True)

def discover_installed_plugins() -> List[Dict[str, Any]]:
    """Scans the plugins directory and loads manifest info."""
    discovered = []
    if not PLUGINS_DIR.exists():
        return discovered

    for plugin_folder in PLUGINS_DIR.iterdir():
        if plugin_folder.is_dir():
            manifest_file = plugin_folder / "manifest.json"
            if manifest_file.exists():
                try:
                    with open(manifest_file, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        data["folder"] = plugin_folder.name
                        discovered.append(data)
                except Exception:
                    pass
    return discovered

@router.get("")
async def list_plugins(db: aiosqlite.Connection = Depends(get_db)):
    installed = discover_installed_plugins()
    cursor = await db.execute("SELECT plugin_key, is_active FROM plugins")
    db_plugins = {r["plugin_key"]: bool(r["is_active"]) for r in await cursor.fetchall()}

    result = []
    for p in installed:
        key = p.get("key", p.get("folder"))
        is_active = db_plugins.get(key, True)
        result.append({
            "key": key,
            "name": p.get("name", key),
            "name_fa": p.get("name_fa", key),
            "description": p.get("description", ""),
            "description_fa": p.get("description_fa", ""),
            "version": p.get("version", "1.0.0"),
            "author": p.get("author", "MyBot Community"),
            "plugin_type": p.get("type", "toolkit"),  # 'toolkit' or 'admin'
            "is_active": is_active,
            "icon": p.get("icon", "Puzzle")
        })
    return result

@router.post("/toggle")
async def toggle_plugin(req: PluginToggleRequest, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT id FROM plugins WHERE plugin_key = ?", (req.plugin_key,))
    row = await cursor.fetchone()
    if row:
        await db.execute("UPDATE plugins SET is_active = ? WHERE plugin_key = ?", (int(req.is_active), req.plugin_key))
    else:
        await db.execute(
            "INSERT INTO plugins (plugin_key, name, version, plugin_type, is_active) VALUES (?, ?, '1.0.0', 'toolkit', ?)",
            (req.plugin_key, req.plugin_key, int(req.is_active))
        )
    await db.commit()
    return {"success": True, "plugin_key": req.plugin_key, "is_active": req.is_active}
