import json
from unittest.mock import AsyncMock

import aiosqlite
import pytest

from app.database_bots import AVAILABLE_USER_FIELDS, DEFAULT_TRACKED_FIELDS
from app.telegram.bot_manager import BotManager


def test_tracked_defaults_include_custom_variables():
    assert 'custom_variables' in DEFAULT_TRACKED_FIELDS
    assert next(f for f in AVAILABLE_USER_FIELDS if f['key'] == 'custom_variables')['default'] is True


@pytest.mark.asyncio
async def test_register_new_bot_defaults_enable_flow_variables():
    # Fully isolated in-memory panel database; no real user DB or Telegram calls.
    async with aiosqlite.connect(':memory:') as db:
        db.row_factory = aiosqlite.Row
        await db.execute('CREATE TABLE bots (id INTEGER PRIMARY KEY, token TEXT, name TEXT, username TEXT, telegram_bot_id INTEGER, webhook_secret TEXT, settings TEXT)')
        await db.execute('CREATE TABLE flows (bot_id INTEGER, name TEXT, is_active INTEGER, version INTEGER, nodes TEXT, edges TEXT)')
        manager = BotManager()
        manager.verify_token = AsyncMock(return_value={
            'valid': True, 'id': 987654, 'first_name': 'Fixture', 'username': 'fixture_bot'
        })
        info = await manager.register_new_bot('123456:fixture', db)
        cursor = await db.execute('SELECT settings FROM bots WHERE id = ?', (info['id'],))
        settings = json.loads((await cursor.fetchone())['settings'])
        assert settings['enable_user_database'] is True
        assert settings['tracked_user_fields'] == DEFAULT_TRACKED_FIELDS
        assert 'custom_variables' in settings['tracked_user_fields']
