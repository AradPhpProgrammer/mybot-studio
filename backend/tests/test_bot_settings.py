"""Settings API regressions: only in-memory SQLite and stubbed Telegram calls."""
import json
from contextlib import asynccontextmanager
from unittest.mock import AsyncMock

import aiosqlite
import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient

from app.api import bots
from app.database import get_db


@asynccontextmanager
async def settings_client(monkeypatch, settings=None):
    async with aiosqlite.connect(':memory:') as db:
        db.row_factory = aiosqlite.Row
        await db.execute('''CREATE TABLE bots (
            id INTEGER PRIMARY KEY, name TEXT, username TEXT, token TEXT,
            telegram_bot_id INTEGER, is_active INTEGER, settings TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP, updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )''')
        await db.execute('INSERT INTO bots (id, name, username, token, telegram_bot_id, is_active, settings) VALUES (1, ?, ?, ?, 42, 1, ?)',
                         ('Local name', 'verified_bot', 'old-fixture-token', json.dumps(settings or {})))
        await db.commit()
        sync = AsyncMock(return_value={'name': True, 'bio': True, 'description': True})
        monkeypatch.setattr(bots.bot_manager, 'sync_bot_presence', sync)
        monkeypatch.setattr(bots.bot_manager, 'verify_token', AsyncMock(return_value={'valid': False, 'error': 'Invalid token'}))
        app = FastAPI()
        app.include_router(bots.router)
        async def isolated_db():
            yield db
        app.dependency_overrides[get_db] = isolated_db
        async with AsyncClient(transport=ASGITransport(app=app), base_url='http://settings.test') as client:
            yield client, db, sync


@pytest.mark.asyncio
async def test_invalid_replacement_rejects_entire_update_before_writes(monkeypatch):
    async with settings_client(monkeypatch) as (client, db, sync):
        before = dict(await (await db.execute('SELECT * FROM bots')).fetchone())
        response = await client.put('/api/bots/1/settings', json={
            'token': 'invalid-fixture-token', 'name': 'Do not save', 'enable_user_database': False,
        })
        assert response.status_code == 400
        assert response.json()['detail'] == 'bot_token_verification_failed'
        after = dict(await (await db.execute('SELECT * FROM bots')).fetchone())
        assert after == before
        sync.assert_not_awaited()


@pytest.mark.asyncio
async def test_legacy_settings_token_is_never_returned(monkeypatch):
    async with settings_client(monkeypatch, {'token': 'legacy-fixture-secret'}) as (client, db, sync):
        for path in ('/api/bots', '/api/bots/1'):
            response = await client.get(path)
            assert 'legacy-fixture-secret' not in response.text
        response = await client.put('/api/bots/1/settings', json={'auto_chat_action': False})
        assert 'token' not in response.json()['settings']
        saved = json.loads((await (await db.execute('SELECT settings FROM bots')).fetchone())['settings'])
        assert 'token' not in saved


@pytest.mark.asyncio
async def test_username_is_verified_identity_not_editable_alias(monkeypatch):
    async with settings_client(monkeypatch) as (client, db, sync):
        response = await client.put('/api/bots/1/settings', json={'username': 'unverified_alias'})
        assert response.status_code == 400
        assert response.json()['detail'] == 'bot_username_read_only'
        row = await (await db.execute('SELECT username FROM bots')).fetchone()
        assert row['username'] == 'verified_bot'


@pytest.mark.asyncio
async def test_supported_settings_roundtrip_default_and_explicit_false(monkeypatch):
    async with settings_client(monkeypatch) as (client, db, sync):
        initial = (await client.get('/api/bots/1')).json()['settings']
        assert initial.get('enable_user_database', True) is True
        payload = {'enable_user_database': False, 'tracked_user_fields': ['telegram_id', 'chat_id'],
                   'miniapp_url': 'https://example.test/app', 'is_miniapp_enabled': True,
                   'bio': 'About', 'description': 'Description', 'auto_chat_action': False,
                   'sync_commands_automatically': False, 'name': 'My local name'}
        response = await client.put('/api/bots/1/settings', json=payload)
        assert response.status_code == 200
        saved = (await client.get('/api/bots/1')).json()
        assert saved['name'] == payload['name']
        assert saved['settings']['enable_user_database'] is False
        for key, value in payload.items():
            if key != 'name':
                assert saved['settings'][key] == value
        await client.put('/api/bots/1/settings', json={'enable_user_database': True})
        assert (await client.get('/api/bots/1')).json()['settings']['enable_user_database'] is True


@pytest.mark.asyncio
async def test_profile_sync_failure_is_separate_from_local_save(monkeypatch):
    async with settings_client(monkeypatch) as (client, db, sync):
        sync.return_value = {'name': False, 'bio': False, 'description': False}
        response = await client.put('/api/bots/1/settings', json={'name': 'Local name survives'})
        assert response.status_code == 200
        assert response.json()['telegram_sync'] == {'name': False}
        assert (await client.get('/api/bots/1')).json()['name'] == 'Local name survives'


@pytest.mark.asyncio
async def test_verified_replacement_is_write_only_and_updates_identity(monkeypatch):
    async with settings_client(monkeypatch) as (client, db, sync):
        monkeypatch.setattr(bots.bot_manager, 'verify_token', AsyncMock(return_value={
            'valid': True, 'id': 55, 'first_name': 'Telegram name', 'username': 'new_verified_bot',
        }))
        response = await client.put('/api/bots/1/settings', json={'token': ' new-fixture-token ', 'name': 'Local choice'})
        assert response.status_code == 200
        assert 'new-fixture-token' not in response.text
        assert response.json()['username'] == 'new_verified_bot'
        assert response.json()['name'] == 'Local choice'
        row = await (await db.execute('SELECT token, telegram_bot_id FROM bots')).fetchone()
        assert row['token'] == 'new-fixture-token'
        assert row['telegram_bot_id'] == 55


def test_settings_schema_does_not_accept_arbitrary_fields():
    from app.models.schemas import BotSettingsUpdate
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        BotSettingsUpdate(arbitrary_setting=True)
