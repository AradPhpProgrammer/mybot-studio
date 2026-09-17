import pytest
import asyncio
import json
import aiosqlite
import tempfile
from app.engine.dag_runner import DAGRunner

@pytest.mark.asyncio
async def test_keyboard_attached_to_send_message():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("""
            CREATE TABLE IF NOT EXISTS bot_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_id INTEGER NOT NULL,
                telegram_id INTEGER NOT NULL,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                language_code TEXT,
                data JSON NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(bot_id, telegram_id)
            );
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS flows (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                version INTEGER DEFAULT 1,
                nodes JSON NOT NULL,
                edges JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        nodes = [
            {"id": "n1", "type": "trigger_start", "data": {}},
            {"id": "n2", "type": "action_send_message", "data": {"text": "Hello World", "buttons": []}},
            {"id": "n3", "type": "action_keyboard", "data": {
                "keyboard_type": "inline",
                "buttons": [
                    [{"text": "Click Me", "callback_data": "btn_click", "style": "primary"}]
                ]
            }}
        ]
        edges = [
            {"id": "e1-2", "source": "n1", "target": "n2", "sourceHandle": "exec", "targetHandle": "exec"},
            {"id": "e2-3", "source": "n2", "target": "n3", "sourceHandle": "exec", "targetHandle": "exec"}
        ]

        await db.execute(
            "INSERT INTO flows (bot_id, name, is_active, version, nodes, edges) VALUES (?, ?, ?, ?, ?, ?)",
            (1, "Test Flow", 1, 1, json.dumps(nodes), json.dumps(edges))
        )
        await db.commit()

        runner = DAGRunner(bot_id=1, db=db)
        res = await runner.execute_flow(
            event_type="command",
            payload="/start",
            user_info={"id": 12345, "first_name": "Arad"}
        )

        assert res["success"] is True
        messages = res.get("messages", [])
        assert len(messages) == 1
        msg = messages[0]
        assert msg["text"] == "Hello World"
        assert msg["reply_markup"] is not None
        assert "inline_keyboard" in msg["reply_markup"]
        btn = msg["reply_markup"]["inline_keyboard"][0][0]
        assert btn["text"] == "Click Me"
        assert btn["callback_data"] == "btn_click"

@pytest.mark.asyncio
async def test_keyboard_attached_to_edit_message():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name

    async with aiosqlite.connect(db_path) as db:
        db.row_factory = aiosqlite.Row
        await db.execute("""
            CREATE TABLE IF NOT EXISTS bot_users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_id INTEGER NOT NULL,
                telegram_id INTEGER NOT NULL,
                username TEXT,
                first_name TEXT,
                last_name TEXT,
                language_code TEXT,
                data JSON NOT NULL DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(bot_id, telegram_id)
            );
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS flows (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bot_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                version INTEGER DEFAULT 1,
                nodes JSON NOT NULL,
                edges JSON NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        nodes = [
            {"id": "n1", "type": "trigger_callback", "data": {"callback_data": "btn_next"}},
            {"id": "n2", "type": "action_edit_message", "data": {"text": "Updated Page 2", "buttons": []}},
            {"id": "n3", "type": "action_keyboard", "data": {
                "keyboard_type": "inline",
                "buttons": [
                    [{"text": "Back", "callback_data": "btn_back", "style": "danger"}]
                ]
            }}
        ]
        edges = [
            {"id": "e1-2", "source": "n1", "target": "n2", "sourceHandle": "exec", "targetHandle": "exec"},
            {"id": "e2-3", "source": "n2", "target": "n3", "sourceHandle": "exec", "targetHandle": "exec"}
        ]

        await db.execute(
            "INSERT INTO flows (bot_id, name, is_active, version, nodes, edges) VALUES (?, ?, ?, ?, ?, ?)",
            (1, "Test Flow 2", 1, 1, json.dumps(nodes), json.dumps(edges))
        )
        await db.commit()

        runner = DAGRunner(bot_id=1, db=db)
        res = await runner.execute_flow(
            event_type="callback",
            payload="btn_next",
            user_info={"id": 12345, "first_name": "Arad"}
        )

        assert res["success"] is True
        messages = res.get("messages", [])
        assert len(messages) == 1
        msg = messages[0]
        assert msg["is_edit"] is True
        assert msg["text"] == "Updated Page 2"
        assert msg["reply_markup"] is not None
        assert "inline_keyboard" in msg["reply_markup"]
        btn = msg["reply_markup"]["inline_keyboard"][0][0]
        assert btn["text"] == "Back"
        assert btn["callback_data"] == "btn_back"
