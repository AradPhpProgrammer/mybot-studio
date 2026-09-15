import asyncio
import hashlib
import json
import logging
import re
import time
from typing import Any, Dict, List, Optional

import aiosqlite
import httpx
from aiogram import Bot, Dispatcher, types
from aiogram.client.default import DefaultBotProperties
from aiogram.client.session.aiohttp import AiohttpSession
from aiogram.client.telegram import TelegramAPIServer
from aiogram.enums import ParseMode
from app.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# STARTER TEMPLATE (English, identical for every language)
# Uses trigger_command node with command='/start' — not the removed trigger_start.
# ---------------------------------------------------------------------------
STARTER_TEMPLATE_NODES = [
    {
        "id": "node_1",
        "type": "trigger_command",
        "position": {"x": 100, "y": 200},
        "data": {
            "command": "/start",
            "description": "Start the bot"
        }
    },
    {
        "id": "node_2",
        "type": "action_send_message",
        "position": {"x": 480, "y": 180},
        "data": {
            "media_type": "text",
            "text": "👋 Hello $first_name!\nWelcome to MyBot Studio.\nChoose an option below:",
            "media_url": "",
            "parse_mode": "HTML",
            "enable_auto_chat_action": True,
            "expandable_quote": False,
            "has_spoiler": False,
            "keyboard_type": "inline",
            "buttons": [
                [
                    {
                        "text": "ℹ️ About",
                        "callback_data": "btn_about",
                        "style": "primary"
                    },
                    {
                        "text": "🎁 Welcome Gift",
                        "callback_data": "btn_claim",
                        "style": "success"
                    }
                ]
            ]
        }
    },
    {
        "id": "node_3",
        "type": "trigger_callback",
        "position": {"x": 100, "y": 480},
        "data": {
            "callback_data": "btn_about"
        }
    },
    {
        "id": "node_4",
        "type": "action_send_message",
        "position": {"x": 480, "y": 460},
        "data": {
            "media_type": "text",
            "text": "MyBot runs on MyBot Engine — a visual no-code Telegram bot builder. Edit this flow from the studio canvas.",
            "media_url": "",
            "enable_auto_chat_action": True,
            "expandable_quote": True,
            "has_spoiler": False,
            "keyboard_type": "inline",
            "buttons": []
        }
    },
    {
        "id": "node_5",
        "type": "trigger_callback",
        "position": {"x": 100, "y": 720},
        "data": {
            "callback_data": "btn_claim"
        }
    },
    {
        "id": "node_6",
        "type": "action_set_variable",
        "position": {"x": 480, "y": 700},
        "data": {
            "variable_name": "balance",
            "operation": "add",
            "value": "50"
        }
    },
    {
        "id": "node_7",
        "type": "action_answer_callback",
        "position": {"x": 860, "y": 700},
        "data": {
            "text": "🎉 Done! 50 reward units added to your balance.",
            "show_alert": True
        }
    }
]

STARTER_TEMPLATE_EDGES = [
    {"id": "e1-2", "source": "node_1", "target": "node_2", "sourceHandle": "exec", "targetHandle": "exec"},
    {"id": "e3-4", "source": "node_3", "target": "node_4", "sourceHandle": "exec", "targetHandle": "exec"},
    {"id": "e5-6", "source": "node_5", "target": "node_6", "sourceHandle": "exec", "targetHandle": "exec"},
    {"id": "e6-7", "source": "node_6", "target": "node_7", "sourceHandle": "exec", "targetHandle": "exec"}
]


def get_system_detected_proxy() -> Optional[str]:
    """Auto-detects active OS-level proxy (Windows Settings, macOS, Linux environment)."""
    try:
        import urllib.request
        proxies = urllib.request.getproxies()
        p = proxies.get("https") or proxies.get("http")
        if p:
            # Ensure protocol prefix exists
            if not p.startswith("http://") and not p.startswith("https://") and not p.startswith("socks5://"):
                p = f"http://{p}"
            return p
    except Exception:
        pass
    # Fallback to standard environment variables
    return os.environ.get("HTTPS_PROXY") or os.environ.get("HTTP_PROXY") or os.environ.get("ALL_PROXY")


class BotManager:
    """Manages multi-bot sessions, token validation, reverse proxies, and webhook routing."""

    def __init__(self):
        self.active_bots: Dict[int, Bot] = {}

    def get_api_session(
        self,
        cf_worker_url: Optional[str] = None,
        proxy_url: Optional[str] = None,
        db_proxy_url: Optional[str] = None
    ) -> Optional[AiohttpSession]:
        # Priority order:
        # 1. Bot-specific Cloudflare Worker URL
        # 2. Bot-specific custom proxy URL
        # 3. Global Cloudflare Worker URL from settings
        # 4. Global proxy from DB system_settings (if provided)
        # 5. Global HTTP_PROXY from settings/.env
        # 6. System-detected proxy from Windows/OS settings (e.g. active VPN)
        worker = cf_worker_url or settings.CF_PROXY_URL
        proxy = proxy_url or db_proxy_url or settings.HTTP_PROXY or get_system_detected_proxy()

        if worker:
            server = TelegramAPIServer.from_base(worker.rstrip("/"))
            return AiohttpSession(api=server)
        elif proxy:
            try:
                logger.info(f"Using proxy for Telegram Bot API: {proxy}")
                return AiohttpSession(proxy=proxy)
            except Exception as e:
                logger.warning(f"Could not create proxy session ({proxy}): {e}. Falling back to direct connection.")
                return None
        return None

    def parse_token_bot_id(self, token: str) -> Optional[int]:
        """Extracts numeric bot ID from token format (e.g. '123456789:ABCdef...')"""
        match = re.match(r"^(\d+):[A-Za-z0-9_-]+$", token.strip())
        if match:
            try:
                return int(match.group(1))
            except Exception:
                pass
        return None

    async def verify_token(
        self,
        token: str,
        cf_worker_url: Optional[str] = None,
        proxy_url: Optional[str] = None,
        db: Optional[aiosqlite.Connection] = None
    ) -> Dict[str, Any]:
        clean_token = token.strip()
        extracted_id = self.parse_token_bot_id(clean_token)
        if not extracted_id:
            return {
                "valid": False,
                "error": "فرمت توکن نامعتبر است. توکن باید به صورت 123456789:ABCdef... باشد."
            }

        # Try to pull global proxy from DB if connection is passed
        db_proxy = None
        if db:
            try:
                cursor = await db.execute("SELECT value FROM system_settings WHERE key = 'proxy_config'")
                row = await cursor.fetchone()
                if row and row["value"]:
                    cfg = json.loads(row["value"])
                    db_proxy = cfg.get("http_proxy") or cfg.get("cf_worker_url")
            except Exception:
                pass

        # Attempt connection (with auto system proxy detection)
        session = self.get_api_session(cf_worker_url, proxy_url, db_proxy_url=db_proxy)
        bot = Bot(token=clean_token, session=session, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
        try:
            me = await asyncio.wait_for(bot.get_me(), timeout=12.0)
            return {
                "valid": True,
                "id": me.id,
                "first_name": me.first_name,
                "username": me.username,
                "can_join_groups": me.can_join_groups,
                "can_read_all_group_messages": me.can_read_all_group_messages,
                "is_online_verified": True
            }
        except Exception as e:
            err_str = str(e)
            logger.warning(f"Telegram get_me failed: {err_str}")
            # If the token is genuinely invalid according to Telegram
            if "Unauthorized" in err_str or "Not Found" in err_str:
                return {
                    "valid": False,
                    "error": "توکن ربات اشتباه است یا توسط تلگرام باطل شده است. لطفاً توکن جدید را از @BotFather دریافت نمایید."
                }
            # Network restriction / connection error — do NOT return fake bot info!
            return {
                "valid": False,
                "id": extracted_id,
                "error": "امکان اتصال به سرورهای تلگرام وجود ندارد. لطفاً فیلترشکن سیستم خود را بررسی کرده یا در بخش تنظیمات پنل، پروکسی یا ورکر کلودفلر را تنظیم کنید."
            }
        finally:
            try:
                await bot.session.close()
            except Exception:
                pass

    async def register_new_bot(
        self,
        token: str,
        db: aiosqlite.Connection,
        custom_proxy: Optional[str] = None,
        cf_worker_url: Optional[str] = None
    ) -> Dict[str, Any]:
        clean_token = token.strip()

        existing = await db.execute("SELECT id FROM bots WHERE token = ?", (clean_token,))
        if await existing.fetchone():
            raise ValueError("This bot token is already registered. Open it from your profiles or delete it first.")

        verif = await self.verify_token(clean_token, cf_worker_url, custom_proxy, db=db)
        if not verif.get("valid"):
            raise ValueError(verif.get("error") or "توکن ربات معتبر نیست.")

        secret = hashlib.sha256(clean_token.encode()).hexdigest()[:16]
        bot_settings = {
            "auto_chat_action": True,
            "typing_delay_ms": 400,
            "cf_worker_url": cf_worker_url or "",
            "custom_proxy": custom_proxy or "",
            "default_language": "en",
            "sync_commands_automatically": True,
            "is_online_verified": verif.get("is_online_verified", False),
            "is_miniapp_enabled": False,
            "bio": "",
            "description": ""
        }

        cursor = await db.execute(
            "INSERT INTO bots (token, name, username, telegram_bot_id, webhook_secret, settings) VALUES (?, ?, ?, ?, ?, ?)",
            (clean_token, verif["first_name"], verif["username"], verif["id"], secret, json.dumps(bot_settings))
        )
        bot_id = cursor.lastrowid

        await db.execute(
            "INSERT INTO flows (bot_id, name, is_active, version, nodes, edges) VALUES (?, 'MyBot Starter Flow', 1, 1, ?, ?)",
            (bot_id, json.dumps(STARTER_TEMPLATE_NODES), json.dumps(STARTER_TEMPLATE_EDGES))
        )
        await db.commit()

        return {
            "id": bot_id,
            "name": verif["first_name"],
            "username": verif["username"],
            "telegram_bot_id": verif["id"],
            "webhook_secret": secret,
            "network_warning": verif.get("network_warning"),
        }

    async def sync_bot_commands(self, bot_id: int, db: aiosqlite.Connection):
        cursor = await db.execute("SELECT token, settings FROM bots WHERE id = ? AND is_active = 1", (bot_id,))
        bot_row = await cursor.fetchone()
        if not bot_row:
            return
        flow_cursor = await db.execute("SELECT nodes FROM flows WHERE bot_id = ? AND is_active = 1 LIMIT 1", (bot_id,))
        flow_row = await flow_cursor.fetchone()
        if not flow_row or not flow_row["nodes"]:
            return
        nodes = json.loads(flow_row["nodes"])
        tg_commands = []
        for n in nodes:
            if n.get("type") == "trigger_command":
                raw_cmd = n.get("data", {}).get("command", "").lstrip("/").strip()
                desc = n.get("data", {}).get("description", "Bot command").strip()
                if raw_cmd:
                    tg_commands.append(types.BotCommand(command=raw_cmd, description=desc))
        if tg_commands and bot_row["token"]:
            settings_dict = json.loads(bot_row["settings"]) if bot_row["settings"] else {}
            session = self.get_api_session(settings_dict.get("cf_worker_url"), settings_dict.get("custom_proxy"))
            bot = Bot(token=bot_row["token"], session=session)
            try:
                await bot.set_my_commands(tg_commands)
                logger.info(f"Synced {len(tg_commands)} commands to bot #{bot_id}")
            except Exception as e:
                logger.warning(f"Could not sync commands for bot {bot_id}: {e}")
            finally:
                try:
                    await bot.session.close()
                except Exception:
                    pass

    async def sync_bot_presence(
        self, token: str, settings_dict: dict,
        name: Optional[str] = None, bio: Optional[str] = None,
        description: Optional[str] = None
    ) -> Dict[str, bool]:
        """
        Pushes bot display name / bio / description to Telegram via Bot API
        (setMyName, setMyShortDescription, setMyDescription). Returns per-field success flags.
        """
        result = {"name": False, "bio": False, "description": False}
        if not token:
            return result
        session = self.get_api_session(settings_dict.get("cf_worker_url"), settings_dict.get("custom_proxy"))
        bot = Bot(token=token, session=session)
        try:
            if name:
                await bot.set_my_name(name=name)
                result["name"] = True
            # bio -> short description (shown on the empty chat sticker preview)
            if bio is not None:
                await bot.set_my_short_description(short_description=bio or "")
                result["bio"] = True
            # description -> the "What can this bot do?" long description box
            if description is not None:
                await bot.set_my_description(description=description or "")
                result["description"] = True
        except Exception as e:
            logger.warning(f"Could not sync bot presence to Telegram: {e}")
        finally:
            try:
                await bot.session.close()
            except Exception:
                pass
        return result

    async def refresh_bot_info(self, bot_id: int, db: aiosqlite.Connection) -> Dict[str, Any]:
        """Queries BotFather / Telegram API to sync name and username if changed by user."""
        cursor = await db.execute("SELECT token, settings FROM bots WHERE id = ?", (bot_id,))
        row = await cursor.fetchone()
        if not row:
            raise ValueError("Bot not found")

        settings_dict = json.loads(row["settings"]) if row["settings"] else {}
        verif = await self.verify_token(
            row["token"],
            settings_dict.get("cf_worker_url"),
            settings_dict.get("custom_proxy"),
            db=db
        )

        if not verif.get("valid"):
            raise ValueError(verif.get("error") or "خطا در برقراری ارتباط با سرورهای تلگرام.")

        new_name = verif.get("first_name")
        new_username = verif.get("username")

        if new_name and new_username:
            await db.execute(
                "UPDATE bots SET name = ?, username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (new_name, new_username, bot_id)
            )
            await db.commit()

        return {
            "id": bot_id,
            "name": new_name,
            "username": new_username,
            "is_online_verified": verif.get("is_online_verified", False),
            "network_warning": verif.get("network_warning")
        }


bot_manager = BotManager()