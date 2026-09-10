import os
from pathlib import Path
from pydantic_settings import BaseSettings

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseSettings):
    APP_NAME: str = "MyBot Engine"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Server & Secret Admin Path
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    ADMIN_SECRET_PATH: str = os.getenv("ADMIN_SECRET_PATH", "panel_adm_x9a2k")
    
    # Database
    DATABASE_PATH: str = str(DATA_DIR / "mybot.db")
    
    # Security
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super-secret-mybot-token-change-in-production-782910")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Admin Credentials (Default on first launch)
    DEFAULT_ADMIN_USER: str = os.getenv("DEFAULT_ADMIN_USER", "admin")
    DEFAULT_ADMIN_PASS: str = os.getenv("DEFAULT_ADMIN_PASS", "admin1234")
    
    # Telegram & Network Proxies
    CF_PROXY_URL: str = os.getenv("CF_PROXY_URL", "")  # e.g., https://your-worker.workers.dev
    HTTP_PROXY: str = os.getenv("HTTP_PROXY", "")     # e.g., socks5://127.0.0.1:1080 or http://127.0.0.1:8080
    
    # Locales & Fonts Directory
    LOCALES_DIR: str = str(BASE_DIR / "locales")
    FONTS_DIR: str = str(BASE_DIR / "fonts")
    PLUGINS_DIR: str = str(BASE_DIR / "plugins")

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()
