import asyncio
import hashlib
import json
import logging
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

STARTER_TEMPLATE_NODES = [
    {
        "id": "node_1",
        "type": "trigger_start",
        "position": {"x": 100, "y": 200},
        "data": {
            "extract_referral": True,
            "referral_variable": "ref_code"
        }
    },
    {
        "id": "node_2",
        "type": "action_send_message",
        "position": {"x": 480, "y": 180},
        "data": {
            "media_type": "text",
            "text": "سلام {first_name}! من ربات MyBot هستم 👋\nپلتفرم خودمیزبان برای طراحی ربات‌های تلگرام بدون کدنویسی.",
            "enable_auto_chat_action": True,
            "expandable_quote": False,
            "has_spoiler": False,
            "keyboard_type": "inline",
            "buttons": [
                [
                    {
                        "text": "🚀 درباره پروژه",
                        "callback_data": "btn_about",
                        "style": "primary"
                    },
                    {
                        "text": "🎁 هدیه خوش‌آمد",
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
            "text": "این ربات بر بستر موتور MyBot Engine اجرا می‌شود. شما می‌توانید تمام منوها، دکمه‌ها و منطق آن را از داخل پنل مدیریت به راحتی تغییر دهید.",
            "enable_auto_chat_action": True,
            "expandable_quote": True,
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
            "value": 50
        }
    },
    {
        "id": "node_7",
        "type": "action_answer_callback",
        "position": {"x": 860, "y": 700},
        "data": {
            "text": "🎉 تبریک! ۵۰ سکه هدیه به موجودی شما اضافه شد.",
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


class BotManager:
    """Manages multi-bot sessions, token validation, reverse proxies, and webhook routing."""

    def __init__(self):
        self.active_bots: Dict[int, Bot] = {}

    def get_api_session(self, cf_worker_url: Optional[str] = None, proxy_url: Optional[str] = None) -> Optional[AiohttpSession]:
        worker = cf_worker_url or settings.CF_PROXY_URL
        proxy = proxy_url or settings.HTTP_PROXY

        if worker:
            server = TelegramAPIServer.from_base(worker.rstrip("/"))
            return AiohttpSession(api=server)
        elif proxy:
            return AiohttpSession(proxy=proxy)
        return None

    async def verify_token(
        self, token: str, cf_worker_url: Optional[str] = None, proxy_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calls Telegram getMe to verify bot token and extract info.
        Compatible with Cloudflare reverse proxy (andro-cfw) and local proxies.
        """
        session = self.get_api_session(cf_worker_url, proxy_url)
        bot = Bot(token=token, session=session, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
        try:
            me = await bot.get_me()
            return {
                "valid": True,
                "id": me.id,
                "first_name": me.first_name,
                "username": me.username,
                "can_join_groups": me.can_join_groups,
                "can_read_all_group_messages": me.can_read_all_group_messages
            }
        except Exception as e:
            logger.error(f"Token validation failed: {e}")
            return {"valid": False, "error": str(e)}
        finally:
            await bot.session.close()

    async def register_new_bot(
        self,
        token: str,
        db: aiosqlite.Connection,
        custom_proxy: Optional[str] = None,
        cf_worker_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """Verifies token, persists bot into SQLite, and provisions starter MyBot flow."""
        verif = await self.verify_token(token, cf_worker_url, custom_proxy)
        if not verif.get("valid"):
            raise ValueError(f"Invalid Telegram Bot Token: {verif.get('error')}")

        secret = hashlib.sha256(token.encode()).hexdigest()[:16]
        bot_settings = {
            "auto_chat_action": True,
            "typing_delay_ms": 400,
            "cf_worker_url": cf_worker_url or "",
            "custom_proxy": custom_proxy or "",
            "default_language": "fa",
            "sync_commands_automatically": True
        }

        cursor = await db.execute(
            """
            INSERT INTO bots (token, name, username, telegram_bot_id, webhook_secret, settings)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                token,
                verif["first_name"],
                verif["username"],
                verif["id"],
                secret,
                json.dumps(bot_settings)
            )
        )
        bot_id = cursor.lastrowid

        # Insert Default Starter MyBot Flow
        await db.execute(
            """
            INSERT INTO flows (bot_id, name, is_active, version, nodes, edges)
            VALUES (?, 'MyBot Starter Flow', 1, 1, ?, ?)
            """,
            (bot_id, json.dumps(STARTER_TEMPLATE_NODES), json.dumps(STARTER_TEMPLATE_EDGES))
        )
        await db.commit()

        return {
            "id": bot_id,
            "name": verif["first_name"],
            "username": verif["username"],
            "telegram_bot_id": verif["id"],
            "webhook_secret": secret
        }

    async def sync_bot_commands(self, bot_id: int, db: aiosqlite.Connection):
        """Synchronizes commands from trigger_command nodes directly to Telegram setMyCommands."""
        cursor = await db.execute(
            "SELECT token, settings FROM bots WHERE id = ? AND is_active = 1", (bot_id,)
        )
        bot_row = await cursor.fetchone()
        if not bot_row:
            return

        flow_cursor = await db.execute(
            "SELECT nodes FROM flows WHERE bot_id = ? AND is_active = 1 LIMIT 1", (bot_id,)
        )
        flow_row = await flow_cursor.fetchone()
        if not flow_row or not flow_row["nodes"]:
            return

        nodes = json.loads(flow_row["nodes"])
        tg_commands = []
        for n in nodes:
            if n.get("type") == "trigger_command":
                raw_cmd = n.get("data", {}).get("command", "").lstrip("/").strip()
                desc = n.get("data", {}).get("description", "دستور ربات").strip()
                if raw_cmd:
                    tg_commands.append(types.BotCommand(command=raw_cmd, description=desc))

        if tg_commands:
            settings_dict = json.loads(bot_row["settings"]) if bot_row["settings"] else {}
            session = self.get_api_session(
                settings_dict.get("cf_worker_url"), settings_dict.get("custom_proxy")
            )
            bot = Bot(token=bot_row["token"], session=session)
            try:
                await bot.set_my_commands(tg_commands)
                logger.info(f"Successfully synced {len(tg_commands)} commands to bot @{bot_id}")
            except Exception as e:
                logger.warning(f"Could not sync commands for bot {bot_id}: {e}")
            finally:
                await bot.session.close()

bot_manager = BotManager()
