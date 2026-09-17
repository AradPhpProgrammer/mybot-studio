"""Focused regression: auto chat actions reach Telegram before content is sent."""
import asyncio

import pytest

from app.telegram.auto_chat_action import dispatch_auto_chat_action


class ActionBot:
    def __init__(self):
        self.calls = []

    async def send_chat_action(self, chat_id, action):
        self.calls.append((chat_id, action))
        await asyncio.sleep(0)


@pytest.mark.asyncio
@pytest.mark.parametrize("media_type,action", [
    ("text", "typing"),
    ("photo", "upload_photo"),
    ("video", "upload_video"),
    ("voice", "record_voice"),
    ("document", "upload_document"),
    ("weird", "typing"),
])
async def test_action_maps_and_fires_before_delay(media_type, action):
    bot, log = ActionBot(), []
    real_sleep = asyncio.sleep

    async def timed_sleep(seconds):
        log.append(("sleep", seconds))
        await real_sleep(0)

    async def order_probe():
        # The action must be recorded BEFORE the artificial delay elapses.
        await asyncio.sleep(0.01)
        log.append(("after-delay",))

    import app.telegram.auto_chat_action as mod
    real = mod.asyncio.sleep
    mod.asyncio.sleep = timed_sleep
    try:
        sent = await dispatch_auto_chat_action(bot, 42, media_type=media_type, delay_ms=400)
    finally:
        mod.asyncio.sleep = real

    assert sent == action
    assert bot.calls == [(42, action)]
    # The action fires first; the only other sleep is the 400ms artificial delay.
    assert log[-1] == ("sleep", 0.4), log


@pytest.mark.asyncio
async def test_broken_chat_action_never_breaks_delivery():
    class Broken:
        async def send_chat_action(self, **kwargs):
            raise RuntimeError("network down")

    assert await dispatch_auto_chat_action(Broken(), 7, media_type="photo") is None


@pytest.mark.asyncio
async def test_client_without_chat_action_is_tolerated():
    assert await dispatch_auto_chat_action(object(), 1) == "typing"
