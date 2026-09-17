"""Offline shell contract: no real git pull or Docker changes."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_linux_updater_rebuilds_worker_and_does_not_switch_branches():
    script = (ROOT / 'deploy/update.sh').read_text(encoding='utf-8')
    assert 'git pull --ff-only' in script
    assert 'git pull origin master' not in script
    assert 'build mybot-panel-backend mybot-frontend mybot-bot-engine' in script
    assert 'up -d --no-deps mybot-panel-backend mybot-frontend mybot-bot-engine' in script
    assert '--check' in script


def test_windows_updater_rebuilds_worker_and_stops_on_errors():
    script = (ROOT / 'deploy/update.bat').read_text(encoding='utf-8')
    assert 'git pull --ff-only' in script
    assert 'build mybot-panel-backend mybot-frontend mybot-bot-engine' in script
    assert 'up -d --no-deps mybot-panel-backend mybot-frontend mybot-bot-engine' in script
    assert 'if errorlevel 1 goto failed' in script.lower()
    assert '--check' in script
