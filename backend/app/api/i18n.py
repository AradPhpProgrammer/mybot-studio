import json
from pathlib import Path
from typing import Any, Dict, List
from fastapi import APIRouter, HTTPException, UploadFile, File

from app.config import settings

router = APIRouter(prefix="/api/i18n", tags=["i18n"])
LOCALES_DIR = Path(settings.LOCALES_DIR)
LOCALES_DIR.mkdir(parents=True, exist_ok=True)

@router.get("/languages")
async def list_languages() -> List[Dict[str, Any]]:
    """Returns available language packages by scanning the locales directory."""
    languages = []
    for file in LOCALES_DIR.glob("*.json"):
        code = file.stem
        try:
            with open(file, "r", encoding="utf-8") as f:
                data = json.load(f)
                meta = data.get("_meta", {})
                languages.append({
                    "code": code,
                    "name": meta.get("name", code.upper()),
                    "dir": meta.get("dir", "rtl" if code in ("fa", "ar", "he", "ur") else "ltr"),
                    "flag": meta.get("flag", "🌐")
                })
        except Exception:
            languages.append({"code": code, "name": code.upper(), "dir": "ltr", "flag": "🌐"})
    return languages

@router.get("/{lang_code}")
async def get_language_dict(lang_code: str) -> Dict[str, Any]:
    file_path = LOCALES_DIR / f"{lang_code}.json"
    if not file_path.exists():
        # Fallback to en or fa
        fallback = LOCALES_DIR / "fa.json"
        if fallback.exists():
            file_path = fallback
        else:
            raise HTTPException(status_code=404, detail="Language file not found")

    with open(file_path, "r", encoding="utf-8") as f:
        return json.load(f)

@router.post("/upload")
async def upload_language_file(file: UploadFile = File(...)):
    """Allows adding any new language to the entire platform by uploading a single JSON file!"""
    if not file.filename.endswith(".json"):
        raise HTTPException(status_code=400, detail="Only .json files are allowed")

    code = Path(file.filename).stem.lower()
    dest = LOCALES_DIR / f"{code}.json"

    try:
        content = await file.read()
        parsed = json.loads(content.decode("utf-8"))
        with open(dest, "w", encoding="utf-8") as f:
            json.dump(parsed, f, ensure_ascii=False, indent=2)
        return {"success": True, "code": code, "message": f"Language '{code}' installed successfully."}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid JSON file: {e}")
