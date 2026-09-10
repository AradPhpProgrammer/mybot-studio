import ast
import asyncio
import json
import logging
import operator
import re
import time
from typing import Any, Dict, List, Optional, Tuple

import aiosqlite
import httpx
from app.config import settings
from app.telegram.auto_chat_action import dispatch_auto_chat_action
from app.telegram.formatting import (
    build_telegram_keyboard,
    format_expandable_blockquote,
    format_spoiler
)

logger = logging.getLogger(__name__)

# Safe operators for condition evaluation
SAFE_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Mod: operator.mod,
    ast.Eq: operator.eq,
    ast.NotEq: operator.ne,
    ast.Lt: operator.lt,
    ast.LtE: operator.le,
    ast.Gt: operator.gt,
    ast.GtE: operator.ge,
    ast.In: lambda a, b: a in b,
    ast.NotIn: lambda a, b: a not in b,
    ast.And: lambda a, b: a and b,
    ast.Or: lambda a, b: a or b,
    ast.Not: operator.not_,
}

def safe_eval(expr: str, context: Dict[str, Any]) -> Any:
    """
    Safely evaluates simple python expressions without eval() or arbitrary execution.
    Supports: `user.balance >= 100`, `message.text == 'vip'`, `user.score + 10`.
    """
    try:
        parsed = ast.parse(expr.strip(), mode="eval").body

        def _eval(node):
            if isinstance(node, ast.Constant):
                return node.value
            elif isinstance(node, ast.Name):
                return context.get(node.id)
            elif isinstance(node, ast.Attribute):
                # Handles user.balance or message.text
                val = _eval(node.value)
                if isinstance(val, dict):
                    return val.get(node.attr)
                return getattr(val, node.attr, None)
            elif isinstance(node, ast.UnaryOp):
                op = SAFE_OPS.get(type(node.op))
                if not op:
                    raise ValueError(f"Unsupported unary op: {type(node.op)}")
                return op(_eval(node.operand))
            elif isinstance(node, ast.BinOp):
                op = SAFE_OPS.get(type(node.op))
                if not op:
                    raise ValueError(f"Unsupported binary op: {type(node.op)}")
                return op(_eval(node.left), _eval(node.right))
            elif isinstance(node, ast.Compare):
                left = _eval(node.left)
                for op_node, comparator in zip(node.ops, node.comparators):
                    op = SAFE_OPS.get(type(op_node))
                    if not op:
                        raise ValueError(f"Unsupported comparator: {type(op_node)}")
                    right = _eval(comparator)
                    if not op(left, right):
                        return False
                    left = right
                return True
            elif isinstance(node, ast.BoolOp):
                if isinstance(node.op, ast.And):
                    return all(_eval(v) for v in node.values)
                elif isinstance(node.op, ast.Or):
                    return any(_eval(v) for v in node.values)
            raise ValueError(f"Unsupported AST node: {type(node)}")

        return _eval(parsed)
    except Exception as e:
        logger.warning(f"Error evaluating condition '{expr}': {e}")
        return False

def render_variables(text: str, context: Dict[str, Any]) -> str:
    """Replaces {var} and {user.var} placeholders in text strings."""
    if not text:
        return ""
    
    def repl(match):
        key = match.group(1).strip()
        parts = key.split(".")
        val = context
        for p in parts:
            if isinstance(val, dict):
                val = val.get(p, "")
            else:
                val = getattr(val, p, "")
        return str(val) if val is not None else ""

    return re.sub(r"\{([^{}]+)\}", repl, text)


class DAGRunner:
    """Executes ReactFlow-based DAG Workflows for Telegram bots."""

    def __init__(self, bot_id: int, db: aiosqlite.Connection):
        self.bot_id = bot_id
        self.db = db

    async def get_or_create_user(self, user_info: Dict[str, Any]) -> Dict[str, Any]:
        telegram_id = user_info.get("id") or user_info.get("telegram_id", 0)
        username = user_info.get("username", "")
        first_name = user_info.get("first_name", "")
        last_name = user_info.get("last_name", "")
        lang = user_info.get("language_code", "fa")

        cursor = await self.db.execute(
            "SELECT id, data FROM bot_users WHERE bot_id = ? AND telegram_id = ?",
            (self.bot_id, telegram_id)
        )
        row = await cursor.fetchone()
        
        if row:
            user_data = json.loads(row["data"]) if row["data"] else {}
        else:
            user_data = {"balance": 0, "is_vip": False}
            await self.db.execute(
                """
                INSERT INTO bot_users (bot_id, telegram_id, username, first_name, last_name, language_code, data)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (self.bot_id, telegram_id, username, first_name, last_name, lang, json.dumps(user_data))
            )
            await self.db.commit()

        return {
            "id": telegram_id,
            "telegram_id": telegram_id,
            "username": username,
            "first_name": first_name,
            "last_name": last_name,
            "data": user_data
        }

    async def save_user_data(self, telegram_id: int, user_data: Dict[str, Any]):
        await self.db.execute(
            "UPDATE bot_users SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE bot_id = ? AND telegram_id = ?",
            (json.dumps(user_data), self.bot_id, telegram_id)
        )
        await self.db.commit()

    async def find_entry_nodes(
        self, nodes: List[Dict[str, Any]], event_type: str, payload: str, context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        matched = []
        for node in nodes:
            ntype = node.get("type") or node.get("node_type")
            data = node.get("data", {})

            if event_type == "command" and ntype == "trigger_start":
                if payload.startswith("/start"):
                    # Check referral
                    parts = payload.split(maxsplit=1)
                    if len(parts) > 1 and data.get("extract_referral"):
                        var_name = data.get("referral_variable", "ref_code")
                        context["user"][var_name] = parts[1].strip()
                    matched.append(node)
            elif event_type == "command" and ntype == "trigger_command":
                cmd = data.get("command", "").strip()
                if payload.split()[0] == cmd:
                    matched.append(node)
            elif event_type == "callback" and ntype == "trigger_callback":
                target_cb = data.get("callback_data", "").strip()
                if payload == target_cb or (target_cb.endswith("*") and payload.startswith(target_cb[:-1])):
                    matched.append(node)
            elif event_type == "message" and ntype == "trigger_message":
                mode = data.get("match_mode", "any")
                pattern = data.get("pattern", "")
                if mode == "any":
                    matched.append(node)
                elif mode == "exact" and payload == pattern:
                    matched.append(node)
                elif mode == "contains" and pattern in payload:
                    matched.append(node)
                elif mode == "regex" and re.search(pattern, payload):
                    matched.append(node)
        return matched

    async def execute_flow(
        self,
        event_type: str,
        payload: str,
        user_info: Dict[str, Any],
        bot_client: Any = None,
        chat_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Executes the bot's active flow starting from matched trigger nodes.
        Returns all messages, alerts, and logs for both live and simulator consumption.
        """
        start_time = time.time()
        cursor = await self.db.execute(
            "SELECT nodes, edges FROM flows WHERE bot_id = ? AND is_active = 1 LIMIT 1",
            (self.bot_id,)
        )
        flow_row = await cursor.fetchone()
        if not flow_row:
            return {"success": False, "error": "No active flow found for this bot."}

        nodes = json.loads(flow_row["nodes"]) if flow_row["nodes"] else []
        edges = json.loads(flow_row["edges"]) if flow_row["edges"] else []

        user_obj = await self.get_or_create_user(user_info)
        context = {
            "user": user_obj["data"],
            "user_info": user_obj,
            "telegram_id": user_obj["id"],
            "username": user_obj["username"],
            "first_name": user_obj["first_name"],
            "payload": payload,
            "event_type": event_type,
            "variables": {}
        }

        entry_nodes = await self.find_entry_nodes(nodes, event_type, payload, context)
        if not entry_nodes:
            return {
                "success": True,
                "messages": [],
                "alerts": [],
                "logs": ["No matching trigger found for event."]
            }

        # Index nodes and edges
        node_map = {n["id"]: n for n in nodes}
        adj_list: Dict[str, List[Dict[str, Any]]] = {}
        for edge in edges:
            source = edge.get("source")
            adj_list.setdefault(source, []).append(edge)

        produced_messages = []
        produced_alerts = []
        chat_actions = []
        executed_steps = []

        # Execute starting from entry nodes
        queue = []
        for entry in entry_nodes:
            queue.append((entry["id"], "exec"))

        visited_count = 0
        max_steps = 100  # Prevent infinite loops

        while queue and visited_count < max_steps:
            visited_count += 1
            node_id, incoming_handle = queue.pop(0)
            node = node_map.get(node_id)
            if not node:
                continue

            ntype = node.get("type") or node.get("node_type")
            data = node.get("data", {})
            executed_steps.append(node_id)

            next_handle = "exec"

            # -------------------------------------------------------------
            # Handle Actions
            # -------------------------------------------------------------
            if ntype == "action_send_message":
                text = render_variables(data.get("text", ""), context)
                media_type = data.get("media_type", "text")

                # Auto chat action
                if data.get("enable_auto_chat_action", True):
                    action_sent = await dispatch_auto_chat_action(
                        bot_client, chat_id or user_obj["id"], media_type=media_type
                    )
                    if action_sent:
                        chat_actions.append(action_sent)

                # Expandable blockquote & Spoiler
                if data.get("expandable_quote"):
                    text = format_expandable_blockquote(text)
                if data.get("has_spoiler"):
                    text = format_spoiler(text)

                buttons = data.get("buttons", [])
                kb_type = data.get("keyboard_type", "inline")
                reply_markup = build_telegram_keyboard(buttons, is_inline=(kb_type == "inline"))

                msg_item = {
                    "text": text,
                    "media_type": media_type,
                    "media_url": data.get("media_url", ""),
                    "reply_markup": reply_markup,
                    "node_id": node_id
                }
                produced_messages.append(msg_item)

            elif ntype == "action_edit_message":
                text = render_variables(data.get("text", ""), context)
                buttons = data.get("buttons", [])
                reply_markup = build_telegram_keyboard(buttons, is_inline=True)
                produced_messages.append({
                    "is_edit": True,
                    "text": text,
                    "reply_markup": reply_markup,
                    "node_id": node_id
                })

            elif ntype == "action_answer_callback":
                alert_text = render_variables(data.get("text", ""), context)
                show_alert = data.get("show_alert", False)
                produced_alerts.append({
                    "text": alert_text,
                    "show_alert": show_alert,
                    "node_id": node_id
                })

            elif ntype == "action_condition":
                cond_expr = data.get("condition", "True")
                # Eval condition
                eval_ctx = {
                    "user": type("Obj", (), context["user"]),
                    "balance": context["user"].get("balance", 0),
                    "is_vip": context["user"].get("is_vip", False),
                    "message": type("Obj", (), {"text": payload}),
                    "payload": payload
                }
                res = bool(safe_eval(cond_expr, eval_ctx))
                next_handle = "true" if res else "false"

            elif ntype == "action_set_variable":
                var_name = data.get("variable_name", "custom_var")
                op = data.get("operation", "set")
                val = data.get("value", 0)

                current = context["user"].get(var_name, 0)
                if op == "set":
                    context["user"][var_name] = val
                elif op == "add":
                    try:
                        context["user"][var_name] = (float(current) if isinstance(current, (int, float)) else 0) + float(val)
                    except Exception:
                        context["user"][var_name] = val
                elif op == "subtract":
                    try:
                        context["user"][var_name] = (float(current) if isinstance(current, (int, float)) else 0) - float(val)
                    except Exception:
                        context["user"][var_name] = 0
                elif op == "toggle":
                    context["user"][var_name] = not bool(current)

            elif ntype == "action_delay":
                secs = min(max(data.get("seconds", 1), 0), 10)  # Safe bounds
                await asyncio.sleep(secs)

            elif ntype == "action_http_request":
                url = render_variables(data.get("url", ""), context)
                method = data.get("method", "POST").upper()
                out_var = data.get("output_variable", "api_res")
                try:
                    async with httpx.AsyncClient(timeout=5.0) as client:
                        if method == "GET":
                            r = await client.get(url)
                        else:
                            r = await client.post(url, json=data.get("body", {}))
                        context["variables"][out_var] = r.json() if "application/json" in r.headers.get("content-type", "") else r.text
                except Exception as e:
                    logger.warning(f"HTTP node error: {e}")
                    context["variables"][out_var] = {"error": str(e)}

            # Follow outgoing edges matching next_handle
            outgoing = adj_list.get(node_id, [])
            for edge in outgoing:
                src_handle = edge.get("sourceHandle")
                if src_handle is None or src_handle == next_handle or src_handle == "exec":
                    target_id = edge.get("target")
                    queue.append((target_id, edge.get("targetHandle", "exec")))

        # Save any modified user state to SQLite JSON
        await self.save_user_data(user_obj["id"], context["user"])

        duration = (time.time() - start_time) * 1000
        return {
            "success": True,
            "messages": produced_messages,
            "alerts": produced_alerts,
            "chat_actions": chat_actions,
            "user_state": context["user"],
            "steps_executed": executed_steps,
            "duration_ms": round(duration, 2)
        }
