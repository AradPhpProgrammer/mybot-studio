import json
import shutil
from pathlib import Path
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, UploadFile, File

from app.config import settings

router = APIRouter(prefix="/api/fonts", tags=["fonts"])
FONTS_DIR = Path(settings.FONTS_DIR)
FONTS_DIR.mkdir(parents=True, exist_ok=True)
FONTS_CONFIG = FONTS_DIR / "fonts.json"

DEFAULT_FONTS = [
    {
        "id": "arad",
        "name": "Arad (آراد)",
        "family": "'Arad', 'Vazirmatn', sans-serif",
        "category": "persian",
        "css_url": "/fonts/AradVF.woff2"
    },
    {
        "id": "vazirmatn",
        "name": "Vazirmatn (وزیرمتن)",
        "family": "'Vazirmatn', -apple-system, BlinkMacSystemFont, sans-serif",
        "category": "persian",
        "css_url": "https://cdn.jsdelivr.net/gh/rastikerdar/vazirmatn@v33.003/Vazirmatn-font-face.css"
    },
    {
        "id": "inter",
        "name": "Inter",
        "family": "'Inter', sans-serif",
        "category": "latin",
        "css_url": "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
    },
    {
        "id": "jetbrains-mono",
        "name": "JetBrains Mono",
        "family": "'JetBrains Mono', monospace",
        "category": "monospace",
        "css_url": "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap"
    }
]

def load_fonts() -> List[Dict[str, Any]]:
    if not FONTS_CONFIG.exists():
        with open(FONTS_CONFIG, "w", encoding="utf-8") as f:
            json.dump(DEFAULT_FONTS, f, ensure_ascii=False, indent=2)
        return DEFAULT_FONTS
    try:
        with open(FONTS_CONFIG, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return DEFAULT_FONTS

@router.get("", response_model=List[Dict[str, Any]])
async def list_fonts():
    """Returns the list of installed and available fonts for the entire studio UI."""
    return load_fonts()

@router.post("/upload")
async def upload_font(file: UploadFile = File(...)):
    """Allows uploading custom font files (.woff2, .woff, .ttf) with one click!"""
    ext = Path(file.filename).suffix.lower()
    if ext not in (".woff2", ".woff", ".ttf"):
        raise HTTPException(status_code=400, detail="Only .woff2, .woff, and .ttf font files are accepted.")

    font_id = Path(file.filename).stem.lower().replace(" ", "-")
    dest_path = FONTS_DIR / file.filename

    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    fonts = load_fonts()
    # Check if already exists
    exists = any(f["id"] == font_id for f in fonts)
    if not exists:
        fonts.append({
            "id": font_id,
            "name": font_id.capitalize(),
            "family": f"'{font_id}', sans-serif",
            "category": "custom",
            "file_name": file.filename
        })
        with open(FONTS_CONFIG, "w", encoding="utf-8") as f:
            json.dump(fonts, f, ensure_ascii=False, indent=2)

    return {"success": True, "font_id": font_id, "name": font_id.capitalize()}
