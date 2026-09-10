import re
from typing import Any, Dict, List, Optional

def escape_html(text: str) -> str:
    """Safely escapes raw text for Telegram HTML parse_mode."""
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")

def generate_ascii_table(headers: List[str], rows: List[List[Any]]) -> str:
    """
    Generates a high-precision, Unicode-aligned table for Telegram within a <pre> block.
    Telegram does not have a native <table> tag; sending raw <table> causes 400 Bad Request.
    This renders clean box-drawing tables that display perfectly on Telegram mobile and desktop.
    """
    if not headers and not rows:
        return ""
    
    # Calculate maximum width per column
    col_count = max(len(headers), max((len(r) for r in rows), default=0))
    col_widths = [0] * col_count
    
    for i in range(col_count):
        h = headers[i] if i < len(headers) else ""
        col_widths[i] = max(col_widths[i], len(str(h)))
        for r in rows:
            val = r[i] if i < len(r) else ""
            col_widths[i] = max(col_widths[i], len(str(val)))
            
    # Add minimal padding
    col_widths = [w + 2 for w in col_widths]
    
    # Box drawing characters
    top_border = "┌" + "┬".join("─" * w for w in col_widths) + "┐"
    header_sep = "├" + "┼".join("─" * w for w in col_widths) + "┤"
    bottom_border = "└" + "┴".join("─" * w for w in col_widths) + "┘"
    
    lines = [top_border]
    
    if headers:
        header_row = "│" + "│".join(f" {str(headers[i] if i < len(headers) else ''):^{col_widths[i]-2}} " for i in range(col_count)) + "│"
        lines.append(header_row)
        lines.append(header_sep)
        
    for r in rows:
        row_str = "│" + "│".join(f" {str(r[i] if i < len(r) else ''):^{col_widths[i]-2}} " for i in range(col_count)) + "│"
        lines.append(row_str)
        
    lines.append(bottom_border)
    
    # Return safely wrapped in <pre> tag
    return f"<pre>\n{chr(10).join(lines)}\n</pre>"

def format_custom_emoji(text: str, emoji_id: str) -> str:
    """Wraps text/character with Telegram Premium Custom Emoji tag."""
    return f'<tg-emoji emoji-id="{emoji_id}">{text}</tg-emoji>'

def format_expandable_blockquote(text: str) -> str:
    """Formats expandable blockquote (Telegram Bot API 7.3+)."""
    return f"<blockquote expandable>{text}</blockquote>"

def format_spoiler(text: str) -> str:
    """Formats text as Telegram spoiler."""
    return f"<tg-spoiler>{text}</tg-spoiler>"

def build_telegram_keyboard(
    buttons_matrix: List[List[Dict[str, Any]]],
    is_inline: bool = True
) -> Dict[str, Any]:
    """
    Constructs Telegram keyboards with native Bot API 9.4/10.0 button colors:
    - style: 'primary' (blue), 'success' (green), 'danger' (red)
    - icon_custom_emoji_id: optional custom emoji icon beside button text
    """
    if is_inline:
        inline_keyboard = []
        for row in buttons_matrix:
            button_row = []
            for btn in row:
                btn_obj: Dict[str, Any] = {"text": btn.get("text", "Button")}
                
                # Callback or URL
                if "url" in btn and btn["url"]:
                    btn_obj["url"] = btn["url"]
                else:
                    btn_obj["callback_data"] = btn.get("callback_data", btn.get("id", "action"))
                    
                # Native Button Style (Bot API 9.4+)
                style = btn.get("style") or btn.get("color")
                if style in ("primary", "success", "danger"):
                    btn_obj["style"] = style
                    
                # Custom Emoji Icon
                if "icon_custom_emoji_id" in btn and btn["icon_custom_emoji_id"]:
                    btn_obj["icon_custom_emoji_id"] = btn["icon_custom_emoji_id"]
                    
                button_row.append(btn_obj)
            inline_keyboard.append(button_row)
        return {"inline_keyboard": inline_keyboard}
    else:
        keyboard = []
        for row in buttons_matrix:
            button_row = []
            for btn in row:
                btn_obj = {"text": btn.get("text", "Option")}
                style = btn.get("style") or btn.get("color")
                if style in ("primary", "success", "danger"):
                    btn_obj["style"] = style
                if "icon_custom_emoji_id" in btn and btn["icon_custom_emoji_id"]:
                    btn_obj["icon_custom_emoji_id"] = btn["icon_custom_emoji_id"]
                button_row.append(btn_obj)
            keyboard.append(button_row)
        return {
            "keyboard": keyboard,
            "resize_keyboard": True,
            "one_time_keyboard": False
        }
