"""Offline delivery regression tests: temporary SQLite and Telegram call stubs only."""
import asyncio
from types import SimpleNamespace

import aiosqlite
import pytest
from aiogram import types
from app import bot_worker as worker

INLINE = {"inline_keyboard": [[{"text": "Next", "callback_data": "next", "style": "primary"}]]}
REPLY = {"keyboard": [[{"text": "Menu", "style": "success"}]]}


class StubBot:
    def __init__(self):
        self.calls = []
        self.fail = set()
        self.next_id = 100

    async def call(self, method, **kwargs):
        self.calls.append((method, kwargs))
        await asyncio.sleep(0)
        if method in self.fail:
            raise RuntimeError(f"{method} failed")
        if method.startswith("send_"):
            self.next_id += 1
            return SimpleNamespace(message_id=self.next_id)
        return True

    def __getattr__(self, name):
        async def method(**kwargs):
            return await self.call(name, **kwargs)
        return method


def message(markup=INLINE, node="X", **kwargs):
    return {"node_id": node, "text": "<b>Final content</b>", "reply_markup": markup, **kwargs}


@pytest.mark.asyncio
async def test_same_node_sends_final_text_then_attaches_inline(tmp_path):
    state = worker.KeyboardStateStore(tmp_path / "keyboard.db", bot_id=1)
    sender = worker.MessageSender(state)
    bot, last = StubBot(), {}
    await sender.deliver(bot, 10, message(REPLY), last)
    bot.calls.clear()
    await sender.deliver(bot, 10, message(), last)
    assert [name for name, _ in bot.calls] == ["send_message", "edit_message_reply_markup"]
    sent, edited = [kwargs for _, kwargs in bot.calls]
    assert sent["text"] == "<b>Final content</b>"
    assert isinstance(sent["reply_markup"], types.ReplyKeyboardRemove)
    assert edited["message_id"] == last[10] == 102
    assert isinstance(edited["reply_markup"], types.InlineKeyboardMarkup)
    assert await state.get(10) == {"kb_type": "inline", "source_node_id": "X"}


@pytest.mark.asyncio
async def test_different_node_inline_does_not_clear(tmp_path):
    state = worker.KeyboardStateStore(tmp_path / "keyboard.db", 1)
    sender, bot, last = worker.MessageSender(state), StubBot(), {}
    await sender.deliver(bot, 10, message(REPLY, "X"), last)
    bot.calls.clear()
    await sender.deliver(bot, 10, message(INLINE, "Y"), last)
    # ANY inline delivery removes the active reply keyboard via the final-content
    # carrier (ReplyKeyboardRemove then inline attach to the same message).
    assert [n for n, _ in bot.calls] == ["send_message", "edit_message_reply_markup"]
    assert isinstance(bot.calls[0][1]["reply_markup"], types.ReplyKeyboardRemove)
    assert await state.get(10) == {"kb_type": "inline", "source_node_id": "Y"}
    bot.calls.clear()
    await sender.deliver(bot, 10, message(INLINE, "X"), last)
    assert [n for n, _ in bot.calls] == ["send_message"]


@pytest.mark.asyncio
async def test_fresh_reply_replaces_source_and_plain_text_does_not(tmp_path):
    state = worker.KeyboardStateStore(tmp_path / "keyboard.db", 1)
    sender, bot, last = worker.MessageSender(state), StubBot(), {}
    await sender.deliver(bot, 10, message(REPLY, "X"), last)
    await sender.deliver(bot, 10, message(REPLY, "Y"), last)
    await sender.deliver(bot, 10, message(None, "Z"), last)
    assert await state.get(10) == {"kb_type": "reply", "source_node_id": "Y"}
    bot.calls.clear()
    await sender.deliver(bot, 10, message(INLINE, "Y"), last)
    assert [n for n, _ in bot.calls] == ["send_message", "edit_message_reply_markup"]


@pytest.mark.asyncio
async def test_legacy_unknown_and_missing_source_do_not_clear(tmp_path):
    state = worker.KeyboardStateStore(tmp_path / "keyboard.db", 1)
    sender, bot, last = worker.MessageSender(state), StubBot(), {}
    await sender.deliver(bot, 10, message(), last)
    assert len(bot.calls) == 1
    await sender.deliver(bot, 10, message(REPLY, None), last)
    bot.calls.clear()
    await sender.deliver(bot, 10, message(INLINE, None), last)
    # Unknown/legacy source still removes the active reply keyboard via the
    # unified final-content carrier.
    assert [n for n, _ in bot.calls] == ["send_message", "edit_message_reply_markup"]
    assert await state.get(10) == {"kb_type": "inline", "source_node_id": None}


@pytest.mark.asyncio
@pytest.mark.parametrize("fail_method", ["send_message"])
async def test_failed_transition_does_not_record_or_clobber_target(tmp_path, fail_method):
    state = worker.KeyboardStateStore(tmp_path / "keyboard.db", 1)
    sender, bot, last = worker.MessageSender(state), StubBot(), {}
    await sender.deliver(bot, 10, message(REPLY), last)
    bot.fail.add(fail_method)
    with pytest.raises(RuntimeError, match="failed"):
        await sender.deliver(bot, 10, message(), last)
    assert await state.get(10) == {"kb_type": "reply", "source_node_id": "X"}
    assert last == {10: 101}


@pytest.mark.asyncio
@pytest.mark.parametrize("kind", ["text", "photo", "video", "edit"])
async def test_attach_failure_preserves_sent_id_and_restart_retries_only_attach(tmp_path, kind):
    path = tmp_path / "keyboard.db"
    state = worker.KeyboardStateStore(path, 1)
    sender, bot, last = worker.MessageSender(state), StubBot(), {}
    await sender.deliver(bot, 10, message(REPLY), last)
    outgoing = message(is_edit=kind == "edit")
    if kind in ("photo", "video"):
        outgoing.update(media_type=kind, media_url="file-id", text="")
    bot.calls.clear()
    bot.fail.add("edit_message_reply_markup")
    with pytest.raises(RuntimeError, match="failed"):
        await sender.deliver(bot, 10, outgoing, last)
    assert last[10] == 102  # Content really arrived despite markup failure.
    assert sender.last_content[10][0] == 102
    assert await state.get(10) is None  # Removal succeeded; reply is no longer active.
    bot.fail.clear()
    bot.calls.clear()
    restarted = worker.MessageSender(worker.KeyboardStateStore(path, 1))
    reloaded_last = {}
    assert await restarted.deliver(bot, 10, outgoing, reloaded_last) == 102
    assert [n for n, _ in bot.calls] == ["edit_message_reply_markup"]
    assert bot.calls[0][1]["message_id"] == reloaded_last[10] == 102
    assert await state.get(10) == {"kb_type": "inline", "source_node_id": "X"}


@pytest.mark.asyncio
async def test_failed_fresh_reply_preserves_previous_row(tmp_path):
    state = worker.KeyboardStateStore(tmp_path / "keyboard.db", 1)
    sender, bot, last = worker.MessageSender(state), StubBot(), {}
    await sender.deliver(bot, 10, message(REPLY), last)
    bot.fail.add("send_message")
    with pytest.raises(RuntimeError):
        await sender.deliver(bot, 10, message(REPLY, "Y"), last)
    assert await state.get(10) == {"kb_type": "reply", "source_node_id": "X"}
    with pytest.raises(RuntimeError):
        await sender.deliver(bot, 20, message(REPLY), last)
    assert await state.get(20) is None


@pytest.mark.asyncio
async def test_restart_reload_and_bot_chat_isolation(tmp_path):
    path = tmp_path / "keyboard.db"
    state = worker.KeyboardStateStore(path, 1)
    sender, bot, last = worker.MessageSender(state), StubBot(), {}
    await sender.deliver(bot, 10, message(REPLY), last)
    await sender.deliver(bot, 20, message(REPLY, "Y"), last)
    other = worker.KeyboardStateStore(path, 2)
    await worker.MessageSender(other).deliver(bot, 10, message(REPLY, "Z"), {})
    reloaded = worker.KeyboardStateStore(path, 1)
    bot.calls.clear()
    await worker.MessageSender(reloaded).deliver(bot, 10, message(), {})
    assert [n for n, _ in bot.calls] == ["send_message", "edit_message_reply_markup"]
    assert await reloaded.get(20) == {"kb_type": "reply", "source_node_id": "Y"}
    assert await other.get(10) == {"kb_type": "reply", "source_node_id": "Z"}
    async with aiosqlite.connect(path) as db:
        async with db.execute("SELECT count(*) FROM keyboard_state") as cur:
            assert (await cur.fetchone())[0] == 3


@pytest.mark.asyncio
@pytest.mark.parametrize("media_type", ["photo", "video"])
@pytest.mark.parametrize("text", ["Caption", ""])
async def test_media_is_the_final_removal_carrier(tmp_path, media_type, text):
    state = worker.KeyboardStateStore(tmp_path / "keyboard.db", 1)
    sender, bot, last = worker.MessageSender(state), StubBot(), {}
    await sender.deliver(bot, 10, message(REPLY), last)
    bot.calls.clear()
    await sender.deliver(bot, 10, message(media_type=media_type, media_url="file-id", text=text), last)
    assert [n for n, _ in bot.calls] == ["send_" + media_type, "edit_message_reply_markup"]
    assert bot.calls[0][1][media_type] == "file-id"
    assert bot.calls[0][1]["caption"] == text
    assert isinstance(bot.calls[0][1]["reply_markup"], types.ReplyKeyboardRemove)
    assert bot.calls[1][1]["message_id"] == last[10] == 102


@pytest.mark.asyncio
async def test_edit_transition_sends_final_text_not_old_target(tmp_path):
    state = worker.KeyboardStateStore(tmp_path / "keyboard.db", 1)
    sender, bot, last = worker.MessageSender(state), StubBot(), {}
    await sender.deliver(bot, 10, message(REPLY), last)
    bot.calls.clear()
    await sender.deliver(bot, 10, message(is_edit=True, text="Updated"), last, target_id=77)
    assert [n for n, _ in bot.calls] == ["send_message", "edit_message_reply_markup"]
    assert bot.calls[0][1]["text"] == "Updated"
    assert bot.calls[1][1]["message_id"] == last[10] == 102
    bot.calls.clear()
    await sender.deliver(bot, 10, message(is_edit=True, text="Later"), last)
    assert bot.calls[0][0] == "edit_message_text"
    assert bot.calls[0][1]["message_id"] == 102


@pytest.mark.asyncio
async def test_buttons_only_transition_reuses_final_text_from_cache(tmp_path):
    state = worker.KeyboardStateStore(tmp_path / "keyboard.db", 1)
    sender, bot, last = worker.MessageSender(state), StubBot(), {}
    await sender.deliver(bot, 10, message(REPLY), last)
    bot.calls.clear()
    await sender.deliver(bot, 10, message(is_edit=True, text=""), last)
    assert [n for n, _ in bot.calls] == ["send_message", "edit_message_reply_markup"]
    assert bot.calls[0][1]["text"] == "<b>Final content</b>"


@pytest.mark.asyncio
@pytest.mark.parametrize("media_type", ["photo", "video"])
async def test_media_edit_transition_preserves_callback_media(tmp_path, media_type):
    state = worker.KeyboardStateStore(tmp_path / "keyboard.db", 1)
    sender, bot, last = worker.MessageSender(state), StubBot(), {}
    await sender.deliver(bot, 10, message(REPLY), last)
    target = SimpleNamespace(message_id=77, caption="Old", **{
        media_type: [SimpleNamespace(file_id="photo-id")] if media_type == "photo" else SimpleNamespace(file_id="video-id")})
    bot.calls.clear()
    await sender.deliver(bot, 10, message(is_edit=True, text="New caption"), last,
                         target_id=77, target_message=target)
    assert [n for n, _ in bot.calls] == ["send_" + media_type, "edit_message_reply_markup"]
    assert bot.calls[0][1]["caption"] == "New caption"
    assert bot.calls[1][1]["message_id"] == last[10] == 102


@pytest.mark.asyncio
async def test_normal_caption_fallback_and_markup_only_edit(tmp_path):
    state = worker.KeyboardStateStore(tmp_path / "keyboard.db", 1)
    sender, bot, last = worker.MessageSender(state), StubBot(), {10: 77}
    bot.fail.add("edit_message_text")
    await sender.deliver(bot, 10, message(is_edit=True), last)
    assert [n for n, _ in bot.calls] == ["edit_message_text", "edit_message_caption"]
    assert await state.get(10) == {"kb_type": "inline", "source_node_id": "X"}
    bot.calls.clear()
    await sender.deliver(bot, 10, message(is_edit=True, text=""), last)
    assert [n for n, _ in bot.calls] == ["edit_message_reply_markup"]
    assert bot.calls[0][1]["message_id"] == 77


@pytest.mark.asyncio
async def test_reply_edit_sends_instead_of_using_invalid_edit_markup(tmp_path):
    state = worker.KeyboardStateStore(tmp_path / "keyboard.db", 1)
    sender, bot, last = worker.MessageSender(state), StubBot(), {10: 77}
    await sender.deliver(bot, 10, message(REPLY, is_edit=True), last)
    assert [n for n, _ in bot.calls] == ["send_message"]
    assert await state.get(10) == {"kb_type": "reply", "source_node_id": "X"}


@pytest.mark.asyncio
async def test_no_content_cannot_emit_blank_transition(tmp_path):
    state = worker.KeyboardStateStore(tmp_path / "keyboard.db", 1)
    await state.record(10, "reply", "X")
    sender, bot, last = worker.MessageSender(state), StubBot(), {10: 77}
    with pytest.raises(ValueError, match="final text or media"):
        await sender.deliver(bot, 10, message(text="", is_edit=True), last)
    assert bot.calls == []
    assert last[10] == 77
    assert await state.get(10) == {"kb_type": "reply", "source_node_id": "X"}


@pytest.mark.asyncio
async def test_concurrent_inline_deliveries_clear_only_once(tmp_path):
    state = worker.KeyboardStateStore(tmp_path / "keyboard.db", 1)
    sender, bot, last = worker.MessageSender(state), StubBot(), {}
    await sender.deliver(bot, 10, message(REPLY), last)
    bot.calls.clear()
    await asyncio.gather(*(sender.deliver(bot, 10, message(), last) for _ in range(2)))
    assert [n for n, _ in bot.calls] == ["send_message", "edit_message_reply_markup", "send_message"]
    assert isinstance(bot.calls[-1][1]["reply_markup"], types.InlineKeyboardMarkup)


@pytest.mark.asyncio
@pytest.mark.parametrize("event_kind", ["message", "callback"])
async def test_worker_handlers_use_transition_router_without_live_db(tmp_path, monkeypatch, event_kind):
    """Exercise actual decorated handlers, not just the shared delivery helper."""
    from contextlib import asynccontextmanager

    bot = StubBot()
    handlers = {}
    results = iter([message(REPLY), message(INLINE)])
    real_connect = aiosqlite.connect
    main_path = str(tmp_path / "must-not-exist.db")
    monkeypatch.setattr(worker.settings, "DATABASE_PATH", main_path)

    class FakeDB:
        async def execute(self, *args):
            return self

        async def fetchone(self):
            return None

    @asynccontextmanager
    async def connect(path, **kwargs):
        if str(path) == main_path:
            yield FakeDB()
        else:
            async with real_connect(path, **kwargs) as db:
                yield db

    class FakeRunner:
        def __init__(self, **kwargs):
            pass

        async def execute_flow(self, **kwargs):
            return {"messages": [next(results)]}

    user = SimpleNamespace(id=10, username="u", first_name="U", last_name="", language_code="en")
    incoming = SimpleNamespace(chat=SimpleNamespace(id=10), message_id=55,
                               text="/start", from_user=user, reply_to_message=None)

    async def answer(**kwargs):
        pass

    callback = SimpleNamespace(message=incoming, from_user=user, data="next", answer=answer)

    class FakeDispatcher:
        def message(self):
            def register(handler):
                handlers["message"] = handler
                return handler
            return register

        def callback_query(self):
            def register(handler):
                handlers["callback"] = handler
                return handler
            return register

        async def start_polling(self, *args, **kwargs):
            event = incoming if event_kind == "message" else callback
            await handlers[event_kind](event)
            await handlers[event_kind](event)

    monkeypatch.setattr(worker, "aiosqlite", SimpleNamespace(connect=connect, Row=aiosqlite.Row))
    monkeypatch.setattr(worker, "DAGRunner", FakeRunner)
    monkeypatch.setattr(worker, "Dispatcher", FakeDispatcher)
    monkeypatch.setattr(worker, "Bot", lambda **kwargs: bot)
    monkeypatch.setattr(worker.bot_manager, "get_api_session", lambda *args, **kwargs: None)
    await worker.run_bot_worker(1, "offline", {})
    assert [n for n, _ in bot.calls] == ["send_message", "send_message", "edit_message_reply_markup"]
    assert isinstance(bot.calls[1][1]["reply_markup"], types.ReplyKeyboardRemove)
    assert bot.calls[1][1]["text"] == "<b>Final content</b>"
    assert bot.calls[2][1]["message_id"] == 102
    assert not (tmp_path / "must-not-exist.db").exists()
    state = worker.KeyboardStateStore(tmp_path / "keyboard_state.sqlite", 1)
    assert await state.get(10) == {"kb_type": "inline", "source_node_id": "X"}


@pytest.mark.asyncio
async def test_empty_inline_buttons_do_not_trigger_transition(tmp_path):
    state = worker.KeyboardStateStore(tmp_path / "keyboard.db", 1)
    sender, bot, last = worker.MessageSender(state), StubBot(), {}
    await sender.deliver(bot, 10, message(REPLY), last)
    bot.calls.clear()
    await sender.deliver(bot, 10, message({"inline_keyboard": []}), last)
    assert [n for n, _ in bot.calls] == ["send_message"]
    assert await state.get(10) == {"kb_type": "reply", "source_node_id": "X"}
