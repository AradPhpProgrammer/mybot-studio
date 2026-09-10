import asyncio
import hashlib
import json
import logging
import re
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
            "text": "Hello {first_name}! Welcome to MyBot Studio.\nVisual no-code platform for Telegram bots.",
            "enable_auto_chat_action": True,
            "expandable_quote": False,
            "has_spoiler": False,
            "keyboard_type": "inline",
            "buttons": [
                [
                    {
                        "text": "About Project",
                        "callback_data": "btn_about",
                        "style": "primary"
                    },
                    {
                        "text": "Claim Welcome Gift",
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
            "text": "This bot is running on MyBot Engine. You can customize all menus, buttons, and logic visually from the studio canvas.",
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
            "text": "Congratulations! 50 reward units added to your balance.",
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
        self, token: str, cf_worker_url: Optional[str] = None, proxy_url: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calls Telegram getMe to verify bot token and extract info.
        If network connection is blocked (e.g., Iranian ISP sinkhole 10.10.34.35),
        gracefully extracts bot ID from token so design can continue.
        """
        clean_token = token.strip()
        extracted_id = self.parse_token_bot_id(clean_token)
        if not extracted_id:
            return {"valid": False, "error": "Invalid token format. Token must be like 123456789:ABCdef..."}

        session = self.get_api_session(cf_worker_url, proxy_url)
        bot = Bot(token=clean_token, session=session, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
        try:
            me = await asyncio.wait_for(bot.get_me(), timeout=4.0)
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
            logger.warning(f"Live token check with Telegram failed ({err_str}). Using offline fallback for ID {extracted_id}.")
            
            return {
                "valid": True,
                "id": extracted_id,
                "first_name": f"Bot {extracted_id}",
                "username": f"bot_{extracted_id}",
                "can_join_groups": True,
                "can_read_all_group_messages": False,
                "is_online_verified": False,
                "network_warning": "Telegram connection was not reached directly. Bot profile created with ID. You can configure Cloudflare Tunnel (andro-cfw) in Settings."
            }
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
            "default_language": "en",
            "sync_commands_automatically": True,
            "is_online_verified": verif.get("is_online_verified", False)
        }

        cursor = await db.execute(
            """
            INSERT INTO bots (token, name, username, telegram_bot_id, webhook_secret, settings)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (
                token.strip(),
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
            "webhook_secret": secret,
            "network_warning": verif.get("network_warning")
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
                desc = n.get("data", {}).get("description", "Bot Command").strip()
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
