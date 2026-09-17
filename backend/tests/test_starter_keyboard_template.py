"""Offline regression coverage for the native dedicated-keyboard starter graph."""

from app.telegram.bot_manager import STARTER_TEMPLATE_EDGES, STARTER_TEMPLATE_NODES


# Exact legacy payload: row/button order and all metadata are contractual.
ORIGINAL_KEYBOARDS = {
    "node_2": {
        "keyboard_type": "inline",
        "buttons": [[
            {"text": "ℹ️ About", "callback_data": "btn_about", "style": "primary"},
            {"text": "🎁 Welcome Gift", "callback_data": "btn_claim", "style": "success"},
        ]],
    },
}


def test_starter_uses_dedicated_keyboards_without_changing_buttons_or_routes():
    nodes = {node["id"]: node for node in STARTER_TEMPLATE_NODES}
    keyboards = [node for node in nodes.values() if node["type"] == "action_keyboard"]
    assert len(keyboards) == len(ORIGINAL_KEYBOARDS)
    assert len(nodes) == len(STARTER_TEMPLATE_NODES) == 8

    for message_id, original in ORIGINAL_KEYBOARDS.items():
        outgoing = [edge for edge in STARTER_TEMPLATE_EDGES if edge["source"] == message_id]
        assert len(outgoing) == 1
        keyboard = nodes[outgoing[0]["target"]]
        assert keyboard["type"] == "action_keyboard"
        assert keyboard["data"] == original
        assert outgoing[0]["sourceHandle"] == outgoing[0]["targetHandle"] == "exec"

    for node in nodes.values():
        if node["type"] in {"action_send_message", "action_edit_message"}:
            assert not {"buttons", "reply_keyboard", "keyboard_type"}.intersection(node["data"])

    for keyboard in keyboards:
        incoming = [edge for edge in STARTER_TEMPLATE_EDGES if edge["target"] == keyboard["id"]]
        assert len(incoming) == 1
        predecessor = nodes[incoming[0]["source"]]
        assert predecessor["type"] in {"action_send_message", "action_edit_message"}
        assert not (predecessor["type"] == "action_edit_message" and keyboard["data"]["keyboard_type"] == "reply")

    # Original execution edges remain intact; the keyboard adds only one edge.
    original_routes = {
        ("e1-2", "node_1", "node_2", "exec", "exec"),
        ("e3-4", "node_3", "node_4", "exec", "exec"),
        ("e5-6", "node_5", "node_6", "exec", "exec"),
        ("e6-7", "node_6", "node_7", "exec", "exec"),
    }
    routes = {(e["id"], e["source"], e["target"], e["sourceHandle"], e["targetHandle"]) for e in STARTER_TEMPLATE_EDGES}
    assert original_routes <= routes
    assert len(routes) == len(STARTER_TEMPLATE_EDGES) == 5
    assert all(e["source"] in nodes and e["target"] in nodes for e in STARTER_TEMPLATE_EDGES)
    assert nodes["node_1"]["data"] == {"command": "/start", "description": "Start the bot"}
    callbacks = {node["data"]["callback_data"] for node in nodes.values() if node["type"] == "trigger_callback"}
    assert callbacks == {button["callback_data"] for row in ORIGINAL_KEYBOARDS["node_2"]["buttons"] for button in row}
    assert nodes["node_6"]["data"] == {"variable_name": "balance", "operation": "add", "value": "50"}
    assert nodes["node_7"]["data"] == {"text": "🎉 Done! 50 reward units added to your balance.", "show_alert": True}
    assert nodes["node_2"]["data"] == {
        "media_type": "text",
        "text": "👋 Hello $first_name!\nWelcome to MyBot Studio.\nChoose an option below:",
        "media_url": "", "parse_mode": "HTML", "enable_auto_chat_action": True,
        "expandable_quote": False, "has_spoiler": False,
    }
    assert nodes["node_4"]["data"] == {
        "media_type": "text",
        "text": "MyBot runs on MyBot Engine — a visual no-code Telegram bot builder. Edit this flow from the studio canvas.",
        "media_url": "", "enable_auto_chat_action": True,
        "expandable_quote": True, "has_spoiler": False,
    }
