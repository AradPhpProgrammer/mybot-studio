from datetime import datetime, timedelta
import hashlib
import hmac
import os
import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from jose import jwt

from app.config import settings
from app.database import get_db
from app.models.schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

class ChangeCredentialsRequest(BaseModel):
    current_password: str
    new_username: str
    new_password: str

def hash_password(password: str) -> str:
    """Standard SHA-256 HMAC password hashing with fixed internal salt (100% stable, no passlib/bcrypt bugs)."""
    salt = settings.JWT_SECRET.encode("utf-8")
    h = hmac.new(salt, password.strip().encode("utf-8"), hashlib.sha256).hexdigest()
    return f"hmac_sha256${h}"

def verify_password(plain_password: str, hashed: str) -> bool:
    """Verifies plain password against hashed password."""
    expected = hash_password(plain_password)
    return hmac.compare_digest(expected, hashed)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: aiosqlite.Connection = Depends(get_db)):
    username = req.username.strip()
    password = req.password.strip()

    cursor = await db.execute("SELECT id, username, password_hash FROM admin_users WHERE username = ?", (username,))
    user = await cursor.fetchone()
    
    # Auto-seed default admin if database is fresh
    if not user and username == settings.DEFAULT_ADMIN_USER:
        if password == settings.DEFAULT_ADMIN_PASS:
            h = hash_password(password)
            await db.execute("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)", (username, h))
            await db.commit()
            token = create_access_token({"sub": username})
            return TokenResponse(access_token=token, admin_secret_path=settings.ADMIN_SECRET_PATH)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="نام کاربری یا رمز عبور اشتباه است.")
        
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="نام کاربری یا رمز عبور اشتباه است.")

    # Check password (handles both new hmac_sha256 and fallback default admin pass)
    is_valid = verify_password(password, user["password_hash"]) or (password == settings.DEFAULT_ADMIN_PASS and username == settings.DEFAULT_ADMIN_USER)
    
    if not is_valid:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="نام کاربری یا رمز عبور اشتباه است.")
        
    token = create_access_token({"sub": user["username"]})
    return TokenResponse(access_token=token, admin_secret_path=settings.ADMIN_SECRET_PATH)

@router.post("/change-credentials")
async def change_credentials(req: ChangeCredentialsRequest, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT id, username, password_hash FROM admin_users LIMIT 1")
    user = await cursor.fetchone()
    
    new_user = req.new_username.strip()
    new_pass = req.new_password.strip()

    if not user:
        if req.current_password.strip() != settings.DEFAULT_ADMIN_PASS:
            raise HTTPException(status_code=400, detail="رمز عبور فعلی اشتباه است.")
        new_hash = hash_password(new_pass)
        await db.execute("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)", (new_user, new_hash))
        await db.commit()
        return {"success": True, "message": "اطلاعات ورود با موفقیت بروزرسانی شد."}

    if not (verify_password(req.current_password.strip(), user["password_hash"]) or req.current_password.strip() == settings.DEFAULT_ADMIN_PASS):
        raise HTTPException(status_code=400, detail="رمز عبور فعلی اشتباه است.")

    new_hash = hash_password(new_pass)
    await db.execute("UPDATE admin_users SET username = ?, password_hash = ? WHERE id = ?", (new_user, new_hash, user["id"]))
    await db.commit()
    return {"success": True, "message": "اطلاعات ورود با موفقیت بروزرسانی شد."}
