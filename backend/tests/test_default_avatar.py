import pytest
from unittest.mock import AsyncMock
from app.api import bots
from app.models.schemas import BotCreateRequest

@pytest.mark.asyncio
async def test_new_bot_uploads_default_and_reports_sync(monkeypatch):
    register = AsyncMock(return_value={'id': 17, 'username': 'fixture_bot'})
    upload = AsyncMock(return_value={'photo_url': '/media/default-bot.png', 'telegram_synced': True})
    monkeypatch.setattr(bots.bot_manager, 'register_new_bot', register)
    monkeypatch.setattr(bots, 'upload_bot_avatar', upload)
    result = await bots.create_bot(BotCreateRequest(token='123456:fixture'), db=object())
    upload.assert_awaited_once()
    assert result['bot']['telegram_photo_synced'] is True
    assert result['bot']['photo_url'] == '/media/default-bot.png'
from test_bot_settings import settings_client

@pytest.mark.asyncio
async def test_missing_avatar_has_default_in_list_and_settings(monkeypatch):
    async with settings_client(monkeypatch) as (client, db, _):
        for url in ['/api/bots', '/api/bots/1']:
            result = (await client.get(url)).json()
            bot = result[0] if isinstance(result, list) else result
            assert bot['photo_url'] == '/media/default-bot.png'
            assert bot['default_photo_url'] == '/media/default-bot.png'

@pytest.mark.asyncio
async def test_custom_avatar_is_preserved(monkeypatch):
    async with settings_client(monkeypatch, {'photo_url':'/media/custom.jpg'}) as (client, db, _):
        assert (await client.get('/api/bots/1')).json()['photo_url'] == '/media/custom.jpg'
