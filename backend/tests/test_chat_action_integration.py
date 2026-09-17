"""End-to-end without mocking sleeps or actions: action -> delay -> content order."""
import asyncio

import pytest

from test_keyboard_attachment_validation import run_flow, node, edge
from app.bot_worker import KeyboardStateStore, MessageSender


class LiveOrderBot:
    """Records the real wall-clock ordering of actions vs content sends."""

    def __init__(self):
        self.events = []

    async def send_chat_action(self, chat_id, action):
        self.events.append(("action", action, asyncio.get_event_loop().time()))

    async def send_message(self, **kwargs):
        self.events.append(("content", kwargs.get("text"), asyncio.get_event_loop().time()))
        return type("M", (), {"message_id": 9})()

    async def send_photo(self, **kwargs):
        self.events.append(("content", kwargs.get("caption"), asyncio.get_event_loop().time()))
        return type("M", (), {"message_id": 10})()

    async def send_video(self, **kwargs):
        self.events.append(("content", kwargs.get("caption"), asyncio.get_event_loop().time()))
        return type("M", (), {"message_id": 11})()

    async def edit_message_reply_markup(self, **kwargs):
        return True


@pytest.mark.asyncio
@pytest.mark.parametrize("media_type,action", [
    ("text", "typing"),
    ("photo", "upload_photo"),
    ("video", "upload_video"),
])
async def test_action_arrives_before_content_with_real_delays(run_flow, media_type, action):
    bot = LiveOrderBot()
    result = await run_flow([
        node('start', 'trigger_start'),
        node('send', 'action_send_message', text='Hello', media_type=media_type,
             media_url='https://example.com/x'),
    ], [edge('start', 'send')], bot_client=bot, chat_id=555)

    sender = MessageSender(KeyboardStateStore(':memory:', 1))
    await sender.deliver(bot, 555, result['messages'][0], {})

    assert [kind for kind, *_ in bot.events] == ["action", "content"], bot.events
    assert bot.events[0][1] == action
    # Real 400ms delay elapses between the action and the content, so the
    # indicator is actually visible in Telegram before the message lands.
    assert bot.events[1][2] - bot.events[0][2] >= 0.35, bot.events
