import asyncio
import json
import os
import tempfile
import time
import pytest
import aiosqlite

from app.database import init_db
from app.engine.dag_runner import DAGRunner, safe_eval
from app.telegram.bot_manager import STARTER_TEMPLATE_NODES, STARTER_TEMPLATE_EDGES
from app.telegram.formatting import generate_ascii_table, build_telegram_keyboard

def test_safe_eval():
    ctx = {
        "user": {"balance": 150, "is_vip": True, "name": "Arad"},
        "balance": 150,
        "is_vip": True
    }
    assert safe_eval("balance >= 100", ctx) is True
    assert safe_eval("balance < 50", ctx) is False
    assert safe_eval("is_vip == True", ctx) is True
    assert safe_eval("balance + 50 == 200", ctx) is True
    assert safe_eval("user.name == 'Arad'", ctx) is True

def test_formatting_table():
    headers = ["Name", "Score"]
    rows = [["Alice", 100], ["Bob", 95]]
    table_html = generate_ascii_table(headers, rows)
    assert "<pre>" in table_html
    assert "</pre>" in table_html
    assert "Alice" in table_html
    assert "┌" in table_html

def test_formatting_keyboard_styles():
    buttons = [
        [
            {"text": "Primary", "callback_data": "btn1", "style": "primary"},
            {"text": "Success", "callback_data": "btn2", "style": "success"},
            {"text": "Danger", "callback_data": "btn3", "style": "danger"}
        ]
    ]
    kb = build_telegram_keyboard(buttons, is_inline=True)
    assert "inline_keyboard" in kb
    row = kb["inline_keyboard"][0]
    assert row[0]["style"] == "primary"
    assert row[1]["style"] == "success"
    assert row[2]["style"] == "danger"

@pytest.mark.asyncio
async def test_dag_runner_starter_flow():
    # Create temp DB
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
                name TEXT NOT NULL DEFAULT 'Main Flow',
                is_active INTEGER DEFAULT 1,
                version INTEGER DEFAULT 1,
                nodes JSON NOT NULL DEFAULT '[]',
                edges JSON NOT NULL DEFAULT '[]',
                viewport JSON DEFAULT '{}',
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # Insert starter flow
        await db.execute(
            "INSERT INTO flows (bot_id, name, nodes, edges) VALUES (?, 'Starter', ?, ?)",
            (1, json.dumps(STARTER_TEMPLATE_NODES), json.dumps(STARTER_TEMPLATE_EDGES))
        )
        await db.commit()

        runner = DAGRunner(bot_id=1, db=db)
        test_uid = int(time.time() * 1000) % 10000000 + 100
        user_info = {"id": test_uid, "username": "arad", "first_name": "آراد"}

        # 1. Trigger /start
        res = await runner.execute_flow(
            event_type="command",
            payload="/start",
            user_info=user_info
        )
        assert res["success"] is True
        assert len(res["messages"]) == 1
        assert "Hello" in res["messages"][0]["text"] and "آراد" in res["messages"][0]["text"]
        assert len(res["messages"][0]["reply_markup"]["inline_keyboard"][0]) == 2

        # 2. Trigger callback 'btn_claim' (Should add 50 balance and alert user)
        res_cb = await runner.execute_flow(
            event_type="callback",
            payload="btn_claim",
            user_info=user_info
        )
        assert res_cb["success"] is True
        assert res_cb["user_state"]["balance"] == 50
        assert len(res_cb["alerts"]) == 1
        assert "50" in res_cb["alerts"][0]["text"]

    os.remove(db_path)
