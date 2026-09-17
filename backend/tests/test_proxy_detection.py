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


def test_missing_stdlib_import_does_not_raise(monkeypatch):
    # The function reads os.environ on the no-proxy path; guard the real failure mode.
    import app.telegram.bot_manager as bm
    monkeypatch.delenv('HTTPS_PROXY', raising=False)
    monkeypatch.delenv('HTTP_PROXY', raising=False)
    monkeypatch.delenv('ALL_PROXY', raising=False)
    with patch('urllib.request.getproxies', return_value={}):
        assert get_system_detected_proxy() is None
