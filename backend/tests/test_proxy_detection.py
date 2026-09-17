"""get_system_detected_proxy must not NameError on machines with an OS proxy set (regression: 'name os' 500 on bot add)."""
from unittest.mock import patch

from app.telegram.bot_manager import get_system_detected_proxy


def test_windows_registry_style_proxy_is_normalized():
    # Windows registry proxies arrive without a scheme, like "127.0.0.1:10808".
    with patch('urllib.request.getproxies', return_value={'https': '127.0.0.1:10808'}):
        assert get_system_detected_proxy() == 'http://127.0.0.1:10808'


def test_env_fallback_and_no_proxy(monkeypatch):
    monkeypatch.delenv('HTTPS_PROXY', raising=False)
    monkeypatch.delenv('HTTP_PROXY', raising=False)
    monkeypatch.delenv('ALL_PROXY', raising=False)
    with patch('urllib.request.getproxies', return_value={}):
        assert get_system_detected_proxy() is None
    with patch('urllib.request.getproxies', return_value={}):
        monkeypatch.setenv('HTTPS_PROXY', 'socks5://127.0.0.1:1080')
        assert get_system_detected_proxy() == 'socks5://127.0.0.1:1080'


def test_get_api_session_through_bot_add_path_does_not_raise():
    # The real bot-add path builds a session before any Telegram call.
    from app.telegram.bot_manager import BotManager
    manager = BotManager()
    try:
        session = manager.get_api_session(cf_worker_url=None, proxy_url=None, db_proxy_url=None)
    except NameError as exc:
        raise AssertionError(f'bot-add proxy detection crashed: {exc}')
    finally:
        pass


def test_missing_stdlib_import_does_not_raise(monkeypatch):
    # The function reads os.environ on the no-proxy path; guard the real failure mode.
    import app.telegram.bot_manager as bm
    monkeypatch.delenv('HTTPS_PROXY', raising=False)
    monkeypatch.delenv('HTTP_PROXY', raising=False)
    monkeypatch.delenv('ALL_PROXY', raising=False)
    with patch('urllib.request.getproxies', return_value={}):
        assert get_system_detected_proxy() is None
