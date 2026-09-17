import ast
import asyncio
import json
import logging
import operator
import random
import re
import time
from typing import Any, Dict, List, Optional, Tuple

import aiosqlite
from app.database_bots import sync_subscriber_data, DEFAULT_TRACKED_FIELDS
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

def _resolve_value(key: str, context: Dict[str, Any]) -> Any:
    """Resolve a dotted key against context (dict traversal / attr)."""
    parts = key.strip().split(".")
    val = context
    for p in parts:
        if isinstance(val, dict):
            val = val.get(p, "")
        else:
            val = getattr(val, p, "")
    return "" if val is None else val


def render_variables(text: str, context: Dict[str, Any]) -> str:
    """
    Replaces placeholders in message text:
      {var} / {user.score}   -> legacy brace syntax (kept for compat)
      $first_name            -> dollar variable syntax; first token resolves against
                                context keys (first_name, username, id, balance,
                                user.*, etc.). If the first token equals 'user',
                                the rest is a dotted path into the user dict.
      $$anything             -> escaped: renders literally as '"$anything"'
                                (a single preceding "$" turns into a literal $).
    """
    if not text:
        return ""

    def repl_brace(m):
        return str(_resolve_value(m.group(1), context))

    def repl_dollar(m):
        raw = m.group(1)  # content after $, e.g. "first_name" or "user.balance"
        if raw == "":
            return "$"
        # Builtin aliases (so $id, $name, $first, $last, $username all work)
        first_token = raw.split(".")[0].lower()
        aliases = {
            "id": "telegram_id",
            "user_id": "telegram_id",
            "uid": "telegram_id",
            "name": "first_name",
            "first": "first_name",
            "firstname": "first_name",
            "last": "last_name",
            "lastname": "last_name",
        }
        if first_token in aliases:
            raw = aliases[first_token] + raw[len(first_token):]
        return str(_resolve_value(raw, context))

    # First: handle brace placeholders (legacy)
    out = re.sub(r"\{([^{}]+)\}", repl_brace, text)
    # Then: handle $$ escaping FIRST to protect literals, using a sentinel
    out = out.replace("$$", "\x00")
    # Then: $var (bare word or dotted path: $foo.bar)
    out = re.sub(r"\$([A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)*)", repl_dollar, out)
    # Restore literal $ for $$ esc
    out = out.replace("\x00", "$")
    return out


class DAGRunner:
    """Executes ReactFlow-based DAG Workflows for Telegram bots."""

    def __init__(self, bot_id: int, db: aiosqlite.Connection):
        self.bot_id = bot_id
        self.db = db

    async def get_or_create_user(self, user_info: Dict[str, Any]) -> Dict[str, Any]:
        telegram_id = int(user_info.get("id") or user_info.get("telegram_id") or 0)
        # Pull tracked_fields preference from bot settings in main studio DB
        tracked = DEFAULT_TRACKED_FIELDS
        try:
            cursor = await self.db.execute("SELECT settings FROM bots WHERE id = ?", (self.bot_id,))
            b_row = await cursor.fetchone()
            if b_row and b_row["settings"]:
                try:
                    s = json.loads(b_row["settings"])
                    if "tracked_user_fields" in s and isinstance(s["tracked_user_fields"], list):
                        tracked = s["tracked_user_fields"]
                except Exception:
                    pass
        except Exception:
            # No bots table in this connection (e.g. unit tests) -> use defaults
            pass

        sub = await sync_subscriber_data(self.bot_id, user_info, tracked_fields=tracked)
        data_blob = sub.get("data") if isinstance(sub.get("data"), dict) else {}

        # Merge with legacy bot_users table if present (e.g. unit tests or pre-migration data)
        try:
            c_leg = await self.db.execute(
                "SELECT data FROM bot_users WHERE bot_id = ? AND telegram_id = ?",
                (self.bot_id, telegram_id)
            )
            r_leg = await c_leg.fetchone()
            if r_leg and r_leg["data"]:
                try:
                    legacy_dict = json.loads(r_leg["data"])
                    if isinstance(legacy_dict, dict):
                        # Legacy update takes precedence if updated externally
                        data_blob = {**data_blob, **legacy_dict}
                except Exception:
                    pass
        except Exception:
            pass

        if "balance" in sub and "balance" not in data_blob:
            data_blob["balance"] = sub.get("balance", 0)

        return {
            "id": telegram_id,
            "telegram_id": telegram_id,
            "chat_id": sub.get("chat_id") or telegram_id,
            "username": sub.get("username") or user_info.get("username", ""),
            "first_name": sub.get("first_name") or user_info.get("first_name", ""),
            "last_name": sub.get("last_name") or user_info.get("last_name", ""),
            "data": data_blob,
            "balance": sub.get("balance", 0),
            "ref_code": sub.get("ref_code") or user_info.get("ref_code", "")
        }

    async def save_user_data(self, telegram_id: int, user_data: Dict[str, Any]):
        # 1. Save to bot's dedicated SQLite runtime database (bot_{id}.db)
        try:
            await sync_subscriber_data(self.bot_id, {"id": telegram_id}, extra_vars=user_data)
        except Exception as e:
            logger.warning(f"Could not sync subscriber data to bot_{self.bot_id}.db: {e}")

        # 2. Also keep legacy bot_users in sync if present in main db connection
        try:
            await self.db.execute(
                "UPDATE bot_users SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE bot_id = ? AND telegram_id = ?",
                (json.dumps(user_data), self.bot_id, telegram_id)
            )
            await self.db.commit()
        except Exception:
            pass

    async def find_entry_nodes(
        self, nodes: List[Dict[str, Any]], event_type: str, payload: str, context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        matched = []
        has_trigger_cmd_start = any(
            (n.get("type") or n.get("node_type")) == "trigger_command"
            and (n.get("data", {}).get("command", "").strip() == "/start")
            for n in nodes
        )
        for node in nodes:
            ntype = node.get("type") or node.get("node_type")
            data = node.get("data", {})

            if event_type == "command" and ntype == "trigger_start":
                if has_trigger_cmd_start:
                    continue
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
        now = int(time.time())
        dt = time.localtime(now)
        context = {
            "user": user_obj["data"],
            "user_info": user_obj,
            "telegram_id": user_obj["id"],
            "username": user_obj["username"],
            "first_name": user_obj["first_name"],
            "payload": payload,
            "event_type": event_type,
            "now": now,
            "date": now,
            "timestamp": now,
            "day": dt.tm_wday,
            "hour": dt.tm_hour,
            "minute": dt.tm_min,
            "random": random.random(),
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
        incoming_edges: Dict[str, List[Dict[str, Any]]] = {}
        for edge in edges:
            source = edge.get("source")
            target = edge.get("target")
            adj_list.setdefault(source, []).append(edge)
            incoming_edges.setdefault(target, []).append(edge)

        produced_messages = []
        produced_alerts = []
        chat_actions = []
        executed_steps = []
        errors = []
        # Map produced message entries to the node_id that created them so a keyboard
        # node can attach to its OWN executed predecessor, never another branch's last message.
        produced_by_node = {}

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
                produced_by_node[node_id] = msg_item

            elif ntype == "action_edit_message":
                text = render_variables(data.get("text", ""), context)
                buttons = data.get("buttons", [])
                kb_type = data.get("keyboard_type", "inline")
                reply_markup = build_telegram_keyboard(buttons, is_inline=(kb_type == "inline")) if buttons else None
                msg_item = {
                    "is_edit": True,
                    "text": text,
                    "reply_markup": reply_markup,
                    "node_id": node_id
                }
                produced_messages.append(msg_item)
                produced_by_node[node_id] = msg_item

            elif ntype in ("action_keyboard", "action_reply_keyboard"):
                buttons = data.get("buttons", [])
                kb_type = data.get("keyboard_type", "reply" if ntype == "action_reply_keyboard" else "inline")
                incoming = incoming_edges.get(node_id, [])
                predecessor_id = incoming[0].get("source") if len(incoming) == 1 else None
                predecessor = node_map.get(predecessor_id, {})
                predecessor_type = predecessor.get("type") or predecessor.get("node_type")
                target_message = produced_by_node.get(predecessor_id)
                error_code = None
                if len(incoming) != 1 or predecessor_type not in ("action_send_message", "action_edit_message"):
                    error_code = "INVALID_KEYBOARD_INPUT"
                elif predecessor_type == "action_edit_message" and kb_type != "inline":
                    error_code = "EDIT_MESSAGE_REPLY_MARKUP_NOT_SUPPORTED"
                elif target_message is None:
                    error_code = "MISSING_PREDECESSOR"
                if error_code:
                    errors.append({"node_id": node_id, "error_code": error_code})
                    executed_steps.pop()  # Rejected nodes did not execute.
                    continue  # Do not execute descendants of the rejected keyboard.
                target_message["reply_markup"] = build_telegram_keyboard(buttons, is_inline=(kb_type == "inline"))
                target_message["keyboard_node_id"] = node_id

            elif ntype == "action_answer_callback":
                alert_text = render_variables(data.get("text", ""), context)
                show_alert = data.get("show_alert", False)
                produced_alerts.append({
                    "text": alert_text,
                    "show_alert": show_alert,
                    "node_id": node_id
                })

            elif ntype == "action_condition":
                # New format: input_a, operator, input_b (e.g. $balance, >=, 100)
                ia = str(data.get("input_a", "") or "0")
                ib = str(data.get("input_b", "") or "0")
                op = data.get("operator", ">=")

                # Resolve input values: support $var/${var}/user.path AND bare "user.path"
                def resolve_input(raw):
                    if not raw:
                        return ""
                    # 1. render_variables handles $var, {var}, $$ escape
                    resolved = render_variables(raw, context)
                    # 2. If still unresolved (bare user.score / first_name), try dotted path
                    if resolved == raw and re.match(r"^[A-Za-z_][\w.]*$", raw):
                        resolved = str(_resolve_value(raw, context))
                    return resolved

                raw_a = resolve_input(ia)
                raw_b = resolve_input(ib)
                try:
                    val_a = float(raw_a) if raw_a and raw_a != "-0" else 0.0
                except Exception:
                    val_a = raw_a
                try:
                    val_b = float(raw_b) if raw_b and raw_b != "-0" else 0.0
                except Exception:
                    val_b = raw_b

                ops_map = {
                    ">": lambda a, b: a > b,
                    "<": lambda a, b: a < b,
                    ">=": lambda a, b: a >= b,
                    "<=": lambda a, b: a <= b,
                    "==": lambda a, b: a == b,
                    "!=": lambda a, b: a != b,
                    "and": lambda a, b: bool(a) and bool(b),
                    "or": lambda a, b: bool(a) or bool(b),
                }
                fn = ops_map.get(op)
                res = fn(val_a, val_b) if fn is not None else False
                next_handle = "true" if res else "false"

            elif ntype == "action_set_variable":
                var_name = data.get("variable_name", "").strip()
                if var_name:
                    op = data.get("operation", "set")
                    raw_val = render_variables(str(data.get("value", "")), context)
                    try:
                        val = float(raw_val) if ("." in raw_val or raw_val.isdigit()) else raw_val
                    except Exception:
                        val = raw_val

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

            elif ntype in ("math", "math_add", "math_subtract", "math_multiply", "math_divide"):
                # Use explicit 'operator' field instead of hardcoded by node type
                op = data.get("operator", "+")
                raw_a = render_variables(str(data.get("input_a", 0)), context)
                raw_b = render_variables(str(data.get("input_b", 0)), context)
                out_var = data.get("output_variable", "result").strip() or "result"
                try:
                    val_a = float(raw_a) if raw_a else 0.0
                except Exception:
                    val_a = 0.0
                try:
                    val_b = float(raw_b) if raw_b else 0.0
                except Exception:
                    val_b = 0.0

                if op == '+':
                    calc_res = val_a + val_b
                elif op == '-':
                    calc_res = val_a - val_b
                elif op == '×' or op == '*':
                    calc_res = val_a * val_b
                elif op == '÷' or op == '/':
                    calc_res = (val_a / val_b) if val_b != 0 else 0.0
                else:
                    calc_res = 0.0

                # Store integer if whole number
                if isinstance(calc_res, float) and calc_res.is_integer():
                    calc_res = int(calc_res)

                context["user"][out_var] = calc_res

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

            elif ntype == "action_loop":
                # Run loop body 'count' times, storing iteration counter
                count = max(int(data.get("count", 1)), 1)
                out_var = str(data.get("output_variable", "iteration")).strip() or "iteration"
                # Following paths run once below (count=1 behavior), then extra iterations appended
                for iteration in range(1, count):
                    context["variables"][out_var] = iteration
                    context["user"][out_var] = iteration
                    for edge in adj_list.get(node_id, []):
                        target_id = edge.get("target")
                        queue.append((target_id, edge.get("targetHandle", "exec")))
                # Final iteration counter
                context["variables"][out_var] = count
                context["user"][out_var] = count

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
        result = {
            "success": not errors,
            "messages": produced_messages,
            "alerts": produced_alerts,
            "chat_actions": chat_actions,
            "user_state": context["user"],
            "steps_executed": executed_steps,
            "duration_ms": round(duration, 2)
        }
        if errors:
            result["errors"] = errors
        return result
