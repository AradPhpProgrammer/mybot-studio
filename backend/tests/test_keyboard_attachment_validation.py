"""Keyboard graph regressions; all persistence is confined to pytest tmp_path."""
import json

import aiosqlite
import pytest
import pytest_asyncio

from app.engine.dag_runner import DAGRunner


def node(node_id, node_type, **data):
    return {"id": node_id, "type": node_type, "data": data}


def edge(source, target):
    return {"source": source, "target": target}


@pytest_asyncio.fixture
async def run_flow(tmp_path, monkeypatch):
    # Subscriber persistence uses a separate database from the flow connection.
    # Replace only that persistence boundary so no real bot database is opened.
    async def sync_subscriber(bot_id, user_info, **kwargs):
        return {"data": {}, "chat_id": user_info["id"]}

    monkeypatch.setattr("app.engine.dag_runner.sync_subscriber_data", sync_subscriber)
    async with aiosqlite.connect(tmp_path / "flow.db") as db:
        db.row_factory = aiosqlite.Row
        await db.execute("CREATE TABLE flows (bot_id INTEGER, is_active INTEGER, nodes TEXT, edges TEXT)")

        async def run(nodes, edges, bot_client=None, chat_id=None):
            await db.execute("DELETE FROM flows")
            await db.execute("INSERT INTO flows VALUES (1, 1, ?, ?)", (json.dumps(nodes), json.dumps(edges)))
            await db.commit()
            return await DAGRunner(1, db).execute_flow(
                "command", "/start", {"id": 12345},
                bot_client=bot_client, chat_id=chat_id)

        yield run


@pytest.mark.asyncio
async def test_branch_keyboard_attaches_to_its_predecessor_not_last_send(run_flow):
    result = await run_flow([
        node("start", "trigger_start"),
        node("a", "action_send_message", text="A"),
        node("b", "action_send_message", text="B"),
        node("kb", "action_keyboard", buttons=[[{"text": "Go", "callback_data": "go"}]]),
    ], [edge("start", "a"), edge("start", "b"), edge("a", "kb")])
    assert result["success"] is True
    assert result["steps_executed"] == ["start", "a", "b", "kb"]
    assert len(result["messages"]) == 2
    a, b = result["messages"]
    assert a['keyboard_node_id'] == 'kb'
    assert a['node_id'] == 'a'
    assert a["reply_markup"] == {"inline_keyboard": [[{"text": "Go", "callback_data": "go"}]]}
    assert b["reply_markup"] == {"inline_keyboard": []}


@pytest.mark.asyncio
async def test_invalid_keyboard_predecessor_returns_error_with_node_id(run_flow):
    """When no send/edit precedes keyboard, runner must not synthesize a targetless edit."""
    result = await run_flow([
        node("start", "trigger_start"),
        node("set", "action_set_variable", variable_name="x", value="1"),
        node("kb", "action_keyboard", buttons=[[{"text": "Go", "callback_data": "go"}]]),
    ], [edge("start", "set"), edge("set", "kb")])
    # Should return an error referencing the offending node_id
    assert result["success"] is False
    errors = result.get("errors", [])
    assert any(e.get("node_id") == "kb" for e in errors)
    assert any(e.get("error_code") in ("MISSING_PREDECESSOR", "INVALID_KEYBOARD_INPUT") for e in errors)
    # No synthetic message emitted
    assert len(result["messages"]) == 0


@pytest.mark.asyncio
async def test_reply_keyboard_after_edit_should_attach_inline_only(run_flow):
    """After an edit-message node, only inline keyboards are legal; reply-style should error."""
    result = await run_flow([
        node("start", "trigger_start"),
        node("edit", "action_edit_message", text="Page 2"),
        node("kb", "action_keyboard", keyboard_type="reply", buttons=[[{"text": "Back", "callback_data": "back"}]]),
    ], [edge("start", "edit"), edge("edit", "kb")])
    # The graph itself is valid (edit precedes kb) but reply type after edit is illegal
    assert result["success"] is False
    errors = result.get("errors", [])
    assert any(e.get("node_id") == "kb" for e in errors)
    assert any(e.get("error_code") == "EDIT_MESSAGE_REPLY_MARKUP_NOT_SUPPORTED" for e in errors)


@pytest.mark.asyncio
async def test_legacy_reply_keyboard_alias(run_flow):
    """Legacy `action_reply_keyboard` should behave like `action_keyboard`."""
    result = await run_flow([
        node("start", "trigger_start"),
        node("send", "action_send_message", text="Hi"),
        node("kb", "action_reply_keyboard", buttons=[[{"text": "Yes", "callback_data": "yes"}]]),
    ], [edge("start", "send"), edge("send", "kb")])
    assert result["success"] is True
    messages = result["messages"]
    assert len(messages) == 1
    assert "keyboard" in messages[0]["reply_markup"]
    assert messages[0]["reply_markup"]["keyboard"][0][0]["text"] == "Yes"
