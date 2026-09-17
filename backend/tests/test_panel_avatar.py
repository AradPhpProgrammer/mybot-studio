"""Avatar API contract: temporary uploads, in-memory DB, mocked Telegram session."""
import json
from unittest.mock import AsyncMock
import pytest
from aiogram import Bot
from aiogram.client.session.base import BaseSession
from aiogram.methods import SetMyProfilePhoto
from app.api import bots
from test_bot_settings import settings_client

from io import BytesIO
from PIL import Image
_buffer = BytesIO()
Image.new('RGB', (8, 8), 'blue').save(_buffer, format='PNG')
JPEG = _buffer.getvalue()

@pytest.mark.asyncio
@pytest.mark.parametrize('accepted', [True, False])
async def test_avatar_uses_telegram_static_upload(monkeypatch, tmp_path, accepted):
    module = tmp_path / 'app' / 'api' / 'bots.py'
    module.parent.mkdir(parents=True)
    monkeypatch.setattr(bots, '__file__', str(module))
    session = AsyncMock(spec=BaseSession)
    captured = []
    async def request(bot, method, **kwargs):
        captured.append(method)
        assert isinstance(method, SetMyProfilePhoto)
        assert method.__api_method__ == 'setMyProfilePhoto'
        assert method.photo.type == 'static'
        assert method.photo.photo.filename.endswith('.jpg')
        assert Image.open(BytesIO(method.photo.photo.data)).format == 'JPEG'
        return accepted
    session.side_effect = request
    session.__call__ = request
    # A real aiogram Bot builds the method; only its transport is mocked.
    real_bot = Bot('123456:ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi', session=session)
    monkeypatch.setattr(bots, 'Bot', lambda **kwargs: real_bot, raising=False)
    monkeypatch.setattr(bots.bot_manager, 'get_api_session', lambda *a, **k: session)
    async with settings_client(monkeypatch) as (client, db, _):
        response = await client.post('/api/bots/1/avatar', files={'file': ('avatar.jpg', JPEG, 'image/jpeg')})
        assert len(captured) == 1
        if accepted:
            assert response.status_code == 200
            body = response.json()
            assert body['telegram_synced'] is True
            assert Image.open(tmp_path / 'uploads' / body['photo_url'].split('/')[-1]).format == 'JPEG'
        else:
            assert response.status_code == 502
            saved = json.loads((await (await db.execute('SELECT settings FROM bots')).fetchone())['settings'])
            assert 'photo_url' not in saved
            assert not list((tmp_path / 'uploads').glob('*'))
    session.close.assert_awaited_once()
