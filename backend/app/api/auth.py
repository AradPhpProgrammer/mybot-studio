from datetime import datetime, timedelta
from typing import Any, Dict
import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt

from app.config import settings
from app.database import get_db
from app.models.schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class ChangeCredentialsRequest(BaseModel):
    current_password: str
    new_username: str
    new_password: str

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT id, username, password_hash FROM admin_users WHERE username = ?", (req.username.strip(),))
    user = await cursor.fetchone()
    
    # Auto-seed default admin if database is fresh
    if not user and req.username.strip() == settings.DEFAULT_ADMIN_USER:
        if req.password == settings.DEFAULT_ADMIN_PASS:
            h = pwd_context.hash(req.password)
            await db.execute("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)", (req.username.strip(), h))
            await db.commit()
            token = create_access_token({"sub": req.username.strip()})
            return TokenResponse(access_token=token, admin_secret_path=settings.ADMIN_SECRET_PATH)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
        
    if not user or not pwd_context.verify(req.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
        
    token = create_access_token({"sub": user["username"]})
    return TokenResponse(access_token=token, admin_secret_path=settings.ADMIN_SECRET_PATH)

@router.post("/change-credentials")
async def change_credentials(req: ChangeCredentialsRequest, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT id, username, password_hash FROM admin_users LIMIT 1")
    user = await cursor.fetchone()
    
    if not user:
        # If no user in DB, verify with default credentials
        if req.current_password != settings.DEFAULT_ADMIN_PASS:
            raise HTTPException(status_code=400, detail="رمز عبور فعلی اشتباه است.")
        new_hash = pwd_context.hash(req.new_password)
        await db.execute("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)", (req.new_username.strip(), new_hash))
        await db.commit()
        return {"success": True, "message": "اطلاعات ورود با موفقیت بروزرسانی شد."}

    if not pwd_context.verify(req.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="رمز عبور فعلی اشتباه است.")

    new_hash = pwd_context.hash(req.new_password)
    await db.execute("UPDATE admin_users SET username = ?, password_hash = ? WHERE id = ?", (req.new_username.strip(), new_hash, user["id"]))
    await db.commit()
    return {"success": True, "message": "اطلاعات ورود با موفقیت بروزرسانی شد."}
