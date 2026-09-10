from typing import Any, Dict, List

NODE_CATALOG: Dict[str, Dict[str, Any]] = {
    # -------------------------------------------------------------
    # TRIGGERS (Events)
    # -------------------------------------------------------------
    "trigger_start": {
        "id": "trigger_start",
        "name": "Start Command (/start)",
        "name_fa": "دستور شروع (/start)",
        "category": "triggers",
        "icon": "Play",
        "description": "Fires when user presses /start or uses a deep link / referral code.",
        "description_fa": "هنگام ارسال دستور /start یا ورود با لینک رفرال فعال می‌شود.",
        "inputs": [],
        "outputs": [{"id": "exec", "label": "Output", "label_fa": "خروجی"}],
        "default_data": {
            "extract_referral": True,
            "referral_variable": "ref_code"
        }
    },
    "trigger_command": {
        "id": "trigger_command",
        "name": "Custom Command",
        "name_fa": "دستور اختصاصی",
        "category": "triggers",
        "icon": "Terminal",
        "description": "Fires on slash commands (e.g. /help) and auto-syncs with Telegram menu.",
        "description_fa": "هنگام ارسال دستور با اسلش و همگام‌سازی خودکار با منوی تلگرام.",
        "inputs": [],
        "outputs": [{"id": "exec", "label": "Output", "label_fa": "خروجی"}],
        "default_data": {
            "command": "/help",
            "description": "Bot Help"
        }
    },
    "trigger_callback": {
        "id": "trigger_callback",
        "name": "Button Click (Callback)",
        "name_fa": "کلیک روی دکمه شیشه‌ای",
        "category": "triggers",
        "icon": "MousePointerClick",
        "description": "Fires when user clicks an inline keyboard button.",
        "description_fa": "هنگامی که کاربر روی یک دکمه شیشه‌ای کلیک می‌کند.",
        "inputs": [],
        "outputs": [{"id": "exec", "label": "Output", "label_fa": "خروجی"}],
        "default_data": {
            "callback_data": "btn_action"
        }
    },
    "trigger_message": {
        "id": "trigger_message",
        "name": "Message Received",
        "name_fa": "دریافت پیام متنی",
        "category": "triggers",
        "icon": "MessageSquare",
        "description": "Fires on user text message or matching pattern.",
        "description_fa": "هنگام دریافت پیام متنی یا الگوی مشخص.",
        "inputs": [],
        "outputs": [{"id": "exec", "label": "Output", "label_fa": "خروجی"}],
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
        "name_fa": "ارسال پیام / مدیا",
        "category": "messages",
        "icon": "Send",
        "description": "Sends rich text, photos, videos, or documents with styled buttons.",
        "description_fa": "ارسال متن، عکس، ویدیو و دکمه‌های شیشه‌ای و کیبورد متنی.",
        "inputs": [{"id": "exec", "label": "Input", "label_fa": "ورودی"}],
        "outputs": [{"id": "exec", "label": "Next", "label_fa": "بعدی"}],
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
        "name_fa": "ویرایش پیام قبلی",
        "category": "messages",
        "icon": "Edit3",
        "description": "Updates the content of the message that triggered the callback.",
        "description_fa": "ویرایش متن و دکمه‌های پیام قبلی با کلیک کاربر.",
        "inputs": [{"id": "exec", "label": "Input", "label_fa": "ورودی"}],
        "outputs": [{"id": "exec", "label": "Next", "label_fa": "بعدی"}],
        "default_data": {
            "text": "Message updated.",
            "buttons": []
        }
    },
    "action_answer_callback": {
        "id": "action_answer_callback",
        "name": "Answer Callback (Alert)",
        "name_fa": "پاسخ به کلیک (پیام پاپ‌آپ)",
        "category": "messages",
        "icon": "BellRing",
        "description": "Dismisses Telegram loading spinner and displays an alert.",
        "description_fa": "بستن لودینگ دکمه و نمایش پیام هشدار یا توست به کاربر.",
        "inputs": [{"id": "exec", "label": "Input", "label_fa": "ورودی"}],
        "outputs": [{"id": "exec", "label": "Next", "label_fa": "بعدی"}],
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
        "name_fa": "شرط (If / Else)",
        "category": "logic",
        "icon": "GitBranch",
        "description": "Branches execution flow based on user variables or expression.",
        "description_fa": "انشعاب جریان بر اساس متغیر کاربر یا شرط منطقی.",
        "inputs": [{"id": "exec", "label": "Input", "label_fa": "ورودی"}],
        "outputs": [
            {"id": "true", "label": "True", "label_fa": "درست (True)"},
            {"id": "false", "label": "False", "label_fa": "نادرست (False)"}
        ],
        "default_data": {
            "condition": "user.balance >= 10"
        }
    },
    "action_set_variable": {
        "id": "action_set_variable",
        "name": "Set / Update Variable",
        "name_fa": "تنظیم / تغییر متغیر (NoSQL)",
        "category": "logic",
        "icon": "Database",
        "description": "Stores or updates dynamic user state in the JSON database.",
        "description_fa": "ذخیره یا تغییر متغیر کاربر در دیتابیس بدون محدودیت فیلد.",
        "inputs": [{"id": "exec", "label": "Input", "label_fa": "ورودی"}],
        "outputs": [{"id": "exec", "label": "Next", "label_fa": "بعدی"}],
        "default_data": {
            "variable_name": "",
            "operation": "set",
            "value": ""
        }
    },

    # -------------------------------------------------------------
    # MATH NODES (+, -, ×, ÷)
    # -------------------------------------------------------------
    "math_add": {
        "id": "math_add",
        "name": "Math: Add (+)",
        "name_fa": "محاسبه: جمع (+)",
        "category": "math",
        "icon": "PlusCircle",
        "description": "Adds Input A and Input B, writes result to Output Variable.",
        "description_fa": "جمع دو ورودی A و B و ذخیره حاصل در متغیر خروجی.",
        "inputs": [{"id": "exec", "label": "Input", "label_fa": "ورودی"}],
        "outputs": [{"id": "exec", "label": "Next", "label_fa": "بعدی"}],
        "default_data": {
            "input_a": "",
            "input_b": "",
            "output_variable": "result"
        }
    },
    "math_subtract": {
        "id": "math_subtract",
        "name": "Math: Subtract (-)",
        "name_fa": "محاسبه: تفریق (-)",
        "category": "math",
        "icon": "MinusCircle",
        "description": "Subtracts Input B from Input A, writes result to Output Variable.",
        "description_fa": "تفریق ورودی B از ورودی A و ذخیره حاصل در متغیر خروجی.",
        "inputs": [{"id": "exec", "label": "Input", "label_fa": "ورودی"}],
        "outputs": [{"id": "exec", "label": "Next", "label_fa": "بعدی"}],
        "default_data": {
            "input_a": "",
            "input_b": "",
            "output_variable": "result"
        }
    },
    "math_multiply": {
        "id": "math_multiply",
        "name": "Math: Multiply (*)",
        "name_fa": "محاسبه: ضرب (*)",
        "category": "math",
        "icon": "XCircle",
        "description": "Multiplies Input A by Input B, writes result to Output Variable.",
        "description_fa": "ضرب ورودی A در ورودی B و ذخیره حاصل در متغیر خروجی.",
        "inputs": [{"id": "exec", "label": "Input", "label_fa": "ورودی"}],
        "outputs": [{"id": "exec", "label": "Next", "label_fa": "بعدی"}],
        "default_data": {
            "input_a": "",
            "input_b": "",
            "output_variable": "result"
        }
    },
    "math_divide": {
        "id": "math_divide",
        "name": "Math: Divide (/)",
        "name_fa": "محاسبه: تقسیم (/)",
        "category": "math",
        "icon": "DivideCircle",
        "description": "Divides Input A by Input B, writes result to Output Variable.",
        "description_fa": "تقسیم ورودی A بر ورودی B و ذخیره حاصل در متغیر خروجی.",
        "inputs": [{"id": "exec", "label": "Input", "label_fa": "ورودی"}],
        "outputs": [{"id": "exec", "label": "Next", "label_fa": "بعدی"}],
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
        "name_fa": "تأخیر زمانی (Wait)",
        "category": "logic",
        "icon": "Clock",
        "description": "Waits for specified seconds before proceeding.",
        "description_fa": "ایجاد وقفه زمانی چند ثانیه‌ای قبل از اجرای مرحله بعد.",
        "inputs": [{"id": "exec", "label": "Input", "label_fa": "ورودی"}],
        "outputs": [{"id": "exec", "label": "Next", "label_fa": "بعدی"}],
        "default_data": {
            "seconds": 2
        }
    },
    "action_http_request": {
        "id": "action_http_request",
        "name": "HTTP Request / Webhook",
        "name_fa": "درخواست وب‌هوک / HTTP",
        "category": "logic",
        "icon": "Globe",
        "description": "Sends GET or POST request to external APIs.",
        "description_fa": "ارسال ریکوئست به وب‌هوک یا APIهای خارجی و دریافت پاسخ.",
        "inputs": [{"id": "exec", "label": "Input", "label_fa": "ورودی"}],
        "outputs": [{"id": "exec", "label": "Next", "label_fa": "بعدی"}],
        "default_data": {
            "url": "https://api.example.com/data",
            "method": "POST",
            "headers": {},
            "body": "{}",
            "output_variable": "api_response"
        }
    }
}
