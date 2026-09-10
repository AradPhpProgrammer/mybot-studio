from datetime import datetime, timedelta
import aiosqlite
from fastapi import APIRouter, Depends, HTTPException, status
from passlib.context import CryptContext
from jose import jwt

from app.config import settings
from app.database import get_db
from app.models.schemas import LoginRequest, TokenResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, db: aiosqlite.Connection = Depends(get_db)):
    cursor = await db.execute("SELECT id, password_hash FROM admin_users WHERE username = ?", (req.username,))
    user = await cursor.fetchone()
    
    # Auto-seed default admin if database is fresh
    if not user and req.username == settings.DEFAULT_ADMIN_USER:
        if req.password == settings.DEFAULT_ADMIN_PASS:
            h = pwd_context.hash(req.password)
            await db.execute("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)", (req.username, h))
            await db.commit()
            token = create_access_token({"sub": req.username})
            return TokenResponse(access_token=token, admin_secret_path=settings.ADMIN_SECRET_PATH)
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
        
    if not user or not pwd_context.verify(req.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid username or password")
        
    token = create_access_token({"sub": req.username})
    return TokenResponse(access_token=token, admin_secret_path=settings.ADMIN_SECRET_PATH)
