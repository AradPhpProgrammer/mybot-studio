import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.auth import router as auth_router
from app.api.bots import router as bots_router
from app.api.flows import router as flows_router
from app.api.fonts import router as fonts_router
from app.api.i18n import router as i18n_router
from app.api.plugins import router as plugins_router
from app.api.simulator import router as simulator_router
from app.api.system import router as system_router
from app.api.webhook import router as webhook_router
from app.config import settings
from app.database import init_db

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("MyBot")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting MyBot Engine...")
    await init_db()
    yield
    logger.info("MyBot Engine shutting down.")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url=None
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth_router)
app.include_router(bots_router)
app.include_router(flows_router)
app.include_router(simulator_router)
app.include_router(webhook_router)
app.include_router(plugins_router)
app.include_router(system_router)
app.include_router(i18n_router)
app.include_router(fonts_router)

# Serve uploaded bot photos
from pathlib import Path
_UPLOAD_DIR = Path(__file__).resolve().parent.parent / "uploads"
_UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/media", StaticFiles(directory=_UPLOAD_DIR), name="uploads")

@app.get("/")
async def health_check():
    return {
        "status": "online",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "admin_secret_path": settings.ADMIN_SECRET_PATH
    }
