from typing import Any, Dict

NODE_CATALOG: Dict[str, Dict[str, Any]] = {
    # -------------------------------------------------------------
    # TRIGGERS (Events)
    # -------------------------------------------------------------
    "trigger_start": {
        "id": "trigger_start",
        "name": "Start Command (/start)",
        "category": "triggers",
        "icon": "Play",
        "description": "Fires when user presses /start or uses a deep link / referral code.",
        "inputs": [],
        "outputs": [{"id": "exec", "label": "Output"}],
        "default_data": {
            "extract_referral": True,
            "referral_variable": "ref_code"
        }
    },
    "trigger_command": {
        "id": "trigger_command",
        "name": "Custom Command",
        "category": "triggers",
        "icon": "Terminal",
        "description": "Fires on slash commands (e.g. /help) and auto-syncs with Telegram menu.",
        "inputs": [],
        "outputs": [{"id": "exec", "label": "Output"}],
        "default_data": {
            "command": "/help",
            "description": "Bot Help"
        }
    },
    "trigger_callback": {
        "id": "trigger_callback",
        "name": "Button Click (Callback)",
        "category": "triggers",
        "icon": "MousePointerClick",
        "description": "Fires when user clicks an inline keyboard button.",
        "inputs": [],
        "outputs": [{"id": "exec", "label": "Output"}],
        "default_data": {
            "callback_data": "btn_action"
        }
    },
    "trigger_message": {
        "id": "trigger_message",
        "name": "Message Received",
        "category": "triggers",
        "icon": "MessageSquare",
        "description": "Fires on user text message or matching pattern.",
        "inputs": [],
        "outputs": [{"id": "exec", "label": "Output"}],
        "default_data": {
            "match_mode": "any",
            "pattern": ""
        }
    },

    # -------------------------------------------------------------
    # ACTIONS (Messages & Content)
    # -------------------------------------------------------------
    "action_send_message": {
        "id": "action_send_message",
        "name": "Send Message / Media",
        "category": "messages",
        "icon": "Send",
        "description": "Sends rich text, photos, videos, or documents with styled buttons.",
        "inputs": [{"id": "exec", "label": "Input"}],
        "outputs": [{"id": "exec", "label": "Next"}],
        "default_data": {
            "media_type": "text",
            "text": "Hello! Welcome to MyBot Studio.",
            "media_url": "",
            "parse_mode": "HTML",
            "enable_auto_chat_action": True,
            "expandable_quote": False,
            "has_spoiler": False,
            "buttons": [],
            "reply_keyboard": [],
            "keyboard_type": "inline"
        }
    },
    "action_edit_message": {
        "id": "action_edit_message",
        "name": "Edit Message",
        "category": "messages",
        "icon": "Edit3",
        "description": "Updates the content of the message that triggered the callback.",
        "inputs": [{"id": "exec", "label": "Input"}],
        "outputs": [{"id": "exec", "label": "Next"}],
        "default_data": {
            "text": "Message updated.",
            "buttons": []
        }
    },
    "action_answer_callback": {
        "id": "action_answer_callback",
        "name": "Answer Callback (Alert)",
        "category": "messages",
        "icon": "BellRing",
        "description": "Dismisses Telegram loading spinner and displays an alert.",
        "inputs": [{"id": "exec", "label": "Input"}],
        "outputs": [{"id": "exec", "label": "Next"}],
        "default_data": {
            "text": "Action confirmed.",
            "show_alert": False
        }
    },

    # -------------------------------------------------------------
    # LOGIC & VARIABLES
    # -------------------------------------------------------------
    "action_condition": {
        "id": "action_condition",
        "name": "Branch (If / Else)",
        "category": "logic",
        "icon": "GitBranch",
        "description": "Branches execution flow based on user variables or expression.",
        "inputs": [{"id": "exec", "label": "Input"}],
        "outputs": [
            {"id": "true", "label": "True"},
            {"id": "false", "label": "False"}
        ],
        "default_data": {
            "input_a": "$balance",
            "operator": ">=",
            "input_b": "100"
        }
    },
    "action_set_variable": {
        "id": "action_set_variable",
        "name": "Set / Update Variable",
        "category": "logic",
        "icon": "Database",
        "description": "Stores or updates dynamic user state in the JSON database.",
        "inputs": [{"id": "exec", "label": "Input"}],
        "outputs": [{"id": "exec", "label": "Next"}],
        "default_data": {
            "variable_name": "",
            "operation": "set",
            "value": ""
        }
    },
    "action_loop": {
        "id": "action_loop",
        "name": "Loop / Repeat",
        "category": "logic",
        "icon": "Repeat",
        "description": "Repeats the connected action N times with an iteration counter variable.",
        "inputs": [{"id": "exec", "label": "Input"}],
        "outputs": [{"id": "exec", "label": "Next"}],
        "default_data": {
            "count": 3,
            "output_variable": "iteration"
        }
    },

    # -------------------------------------------------------------
    # MATH NODES (+, -, ×, ÷)
    # -------------------------------------------------------------
    "math_add": {
        "id": "math_add",
        "name": "Math: Add (+)",
        "category": "math",
        "icon": "PlusCircle",
        "description": "Adds Input A and Input B, writes result to Output Variable.",
        "inputs": [{"id": "exec", "label": "Input"}],
        "outputs": [{"id": "exec", "label": "Next"}],
        "default_data": {
            "input_a": "",
            "input_b": "",
            "output_variable": "result"
        }
    },
    "math_subtract": {
        "id": "math_subtract",
        "name": "Math: Subtract (-)",
        "category": "math",
        "icon": "MinusCircle",
        "description": "Subtracts Input B from Input A, writes result to Output Variable.",
        "inputs": [{"id": "exec", "label": "Input"}],
        "outputs": [{"id": "exec", "label": "Next"}],
        "default_data": {
            "input_a": "",
            "input_b": "",
            "output_variable": "result"
        }
    },
    "math_multiply": {
        "id": "math_multiply",
        "name": "Math: Multiply (*)",
        "category": "math",
        "icon": "XCircle",
        "description": "Multiplies Input A by Input B, writes result to Output Variable.",
        "inputs": [{"id": "exec", "label": "Input"}],
        "outputs": [{"id": "exec", "label": "Next"}],
        "default_data": {
            "input_a": "",
            "input_b": "",
            "output_variable": "result"
        }
    },
    "math_divide": {
        "id": "math_divide",
        "name": "Math: Divide (/)",
        "category": "math",
        "icon": "DivideCircle",
        "description": "Divides Input A by Input B, writes result to Output Variable.",
        "inputs": [{"id": "exec", "label": "Input"}],
        "outputs": [{"id": "exec", "label": "Next"}],
        "default_data": {
            "input_a": "",
            "input_b": "",
            "output_variable": "result"
        }
    },

    # -------------------------------------------------------------
    # NETWORK & UTILITIES
    # -------------------------------------------------------------
    "action_delay": {
        "id": "action_delay",
        "name": "Delay / Wait",
        "category": "logic",
        "icon": "Clock",
        "description": "Waits for specified seconds before proceeding.",
        "inputs": [{"id": "exec", "label": "Input"}],
        "outputs": [{"id": "exec", "label": "Next"}],
        "default_data": {
            "seconds": 2
        }
    },
    "action_http_request": {
        "id": "action_http_request",
        "name": "HTTP Request / Webhook",
        "category": "logic",
        "icon": "Globe",
        "description": "Sends GET or POST request to external APIs.",
        "inputs": [{"id": "exec", "label": "Input"}],
        "outputs": [{"id": "exec", "label": "Next"}],
        "default_data": {
            "url": "https://api.example.com/data",
            "method": "POST",
            "headers": {},
            "body": "{}",
            "output_variable": "api_response"
        }
    }
}
