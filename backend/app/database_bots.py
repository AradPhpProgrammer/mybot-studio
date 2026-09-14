import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
import aiosqlite

logger = logging.getLogger("MyBot.BotDB")

BOTS_DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "bots"
BOTS_DATA_DIR.mkdir(parents=True, exist_ok=True)

# Default fields saved automatically to keep the bot DB lean and fast
DEFAULT_TRACKED_FIELDS = ["telegram_id", "chat_id", "first_name", "start_date"]

# All candidate user attributes that can be enabled via bot settings
AVAILABLE_USER_FIELDS = [
    {"key": "telegram_id", "label_en": "Numeric Telegram ID", "label_fa": "شناسه عددی تلگرام", "default": True, "required": True},
    {"key": "chat_id", "label_en": "Chat ID", "label_fa": "شناسه چت", "default": True, "required": True},
    {"key": "first_name", "label_en": "First Name", "label_fa": "نام کوچک", "default": True, "required": False},
    {"key": "start_date", "label_en": "First Start Date", "label_fa": "تاریخ اولین شروع", "default": True, "required": False},
    {"key": "username", "label_en": "Telegram @Username", "label_fa": "یوزرنیم تلگرام", "default": False, "required": False},
    {"key": "last_name", "label_en": "Last Name", "label_fa": "نام خانوادگی", "default": False, "required": False},
    {"key": "language_code", "label_en": "Telegram Language Code", "label_fa": "زبان کاربر در تلگرام", "default": False, "required": False},
    {"key": "balance", "label_en": "User Balance / Credits", "label_fa": "موجودی حساب کاربر", "default": False, "required": False},
    {"key": "ref_code", "label_en": "Referral / Deep-Link Code", "label_fa": "کد معرف یا لینک ورودی", "default": False, "required": False},
    {"key": "inviter_id", "label_en": "Inviter Telegram ID", "label_fa": "شناسه دعوت‌کننده", "default": False, "required": False},
    {"key": "last_seen", "label_en": "Last Activity Timestamp", "label_fa": "زمان آخرین فعالیت", "default": False, "required": False},
    {"key": "total_starts", "label_en": "Total /start Counter", "label_fa": "شمارنده تعداد دستور استارت", "default": False, "required": False},
    {"key": "custom_variables", "label_en": "Flow Set-Variables (NoSQL)", "label_fa": "متغیرهای سفارشی داخل فلو", "default": False, "required": False},
]


def get_bot_db_path(bot_id: int) -> Path:
    return BOTS_DATA_DIR / f"bot_{bot_id}.db"


async def get_bot_db(bot_id: int) -> aiosqlite.Connection:
    """Returns an isolated SQLite connection dedicated solely to this bot's runtime data."""
    path = get_bot_db_path(bot_id)
    conn = await aiosqlite.connect(path)
    conn.row_factory = aiosqlite.Row
    await conn.execute("PRAGMA journal_mode = WAL;")
    await conn.execute("PRAGMA foreign_keys = ON;")
    await init_bot_tables(conn)
    return conn


async def init_bot_tables(db: aiosqlite.Connection):
    """Creates the isolated per-bot subscriber/user data table."""
    await db.execute("""
        CREATE TABLE IF NOT EXISTS subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id INTEGER UNIQUE NOT NULL,
            chat_id INTEGER,
            first_name TEXT,
            last_name TEXT,
            username TEXT,
            language_code TEXT,
            start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            total_starts INTEGER DEFAULT 1,
            balance REAL DEFAULT 0,
            ref_code TEXT,
            inviter_id INTEGER,
            data JSON NOT NULL DEFAULT '{}'
        );
    """)
    await db.commit()


async def sync_subscriber_data(
    bot_id: int,
    user_info: Dict[str, Any],
    tracked_fields: Optional[List[str]] = None,
    extra_vars: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Inserts or updates subscriber info in the bot's own private SQLite database,
    storing ONLY the fields explicitly enabled in the bot's settings.
    """
    if tracked_fields is None:
        tracked_fields = DEFAULT_TRACKED_FIELDS

    fields_set = set(tracked_fields)
    tid = int(user_info.get("id") or 0)
    if not tid:
        return {}

    db = await get_bot_db(bot_id)
    try:
        cursor = await db.execute("SELECT id, data, total_starts, balance FROM subscribers WHERE telegram_id = ?", (tid,))
        existing = await cursor.fetchone()

        # Build payload according to selected settings
        cid = int(user_info.get("chat_id") or tid) if "chat_id" in fields_set else None
        fname = user_info.get("first_name", "") if "first_name" in fields_set else None
        lname = user_info.get("last_name", "") if "last_name" in fields_set else None
        uname = user_info.get("username", "") if "username" in fields_set else None
        lang = user_info.get("language_code", "") if "language_code" in fields_set else None
        ref = user_info.get("ref_code") if "ref_code" in fields_set else None
        inv = user_info.get("inviter_id") if "inviter_id" in fields_set else None

        current_data = json.loads(existing["data"]) if existing and existing["data"] else {}
        # Always persist flow variables / balances into the JSON blob regardless of
        # which column fields are tracked — this keeps set-variable nodes working.
        if extra_vars:
            current_data.update(extra_vars)

        if not existing:
            await db.execute("""
                INSERT INTO subscribers (
                    telegram_id, chat_id, first_name, last_name, username,
                    language_code, ref_code, inviter_id, data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (tid, cid, fname, lname, uname, lang, ref, inv, json.dumps(current_data)))
        else:
            starts = (existing["total_starts"] or 1) + 1 if "total_starts" in fields_set else existing["total_starts"]
            await db.execute("""
                UPDATE subscribers SET
                    chat_id = COALESCE(?, chat_id),
                    first_name = COALESCE(?, first_name),
                    last_name = COALESCE(?, last_name),
                    username = COALESCE(?, username),
                    language_code = COALESCE(?, language_code),
                    ref_code = COALESCE(?, ref_code),
                    inviter_id = COALESCE(?, inviter_id),
                    last_seen = CURRENT_TIMESTAMP,
                    total_starts = ?,
                    data = ?
                WHERE telegram_id = ?
            """, (cid, fname, lname, uname, lang, ref, inv, starts, json.dumps(current_data), tid))

        await db.commit()

        # Return refreshed subscriber context
        cursor = await db.execute("SELECT * FROM subscribers WHERE telegram_id = ?", (tid,))
        row = await cursor.fetchone()
        if row:
            res = dict(row)
            res["data"] = json.loads(res["data"]) if res.get("data") else {}
            return res
        return {}
    finally:
        await db.close()
