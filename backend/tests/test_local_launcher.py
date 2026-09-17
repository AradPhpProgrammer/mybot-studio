"""Launcher regressions: no real subprocesses or project service changes."""
import importlib.util
from pathlib import Path
from unittest.mock import Mock

import pytest

ROOT = Path(__file__).resolve().parents[2]


@pytest.fixture
def launcher(monkeypatch, tmp_path):
    spec = importlib.util.spec_from_file_location("local_launcher", ROOT / "start-local.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    (tmp_path / ".env").touch()
    (tmp_path / "python.exe").touch()
    (tmp_path / "node_modules").mkdir()
    for name in ("ROOT", "BACKEND", "FRONTEND"):
        monkeypatch.setattr(module, name, tmp_path)
    monkeypatch.setattr(module, "PY", tmp_path / "python.exe")
    monkeypatch.setattr(module, "PIP", tmp_path / "python.exe")
    monkeypatch.setattr(module.sys, "argv", ["start-local.py"])
    monkeypatch.setattr(module, "run_check", Mock(return_value=True))
    # Startup tests never probe or stop project services, even on failure.
    monkeypatch.setattr(module, "port_open", Mock(return_value=False))
    monkeypatch.setattr(module.os, "killpg", Mock(), raising=False)
    monkeypatch.setattr(module.shutil, "which", lambda _: "installed")
    monkeypatch.setattr(module.subprocess, "run", Mock())
    monkeypatch.setattr(module.subprocess, "check_output", Mock(return_value=""))
    monkeypatch.setattr(module.subprocess, "Popen", Mock())
    monkeypatch.setattr(module.time, "sleep", Mock())
    monkeypatch.setattr("builtins.input", lambda _: "")
    monkeypatch.setattr(module, "SECRET_PATH", "test-route")
    monkeypatch.setattr(module, "ADMIN_USER", "test-user")
    monkeypatch.setattr(module, "ADMIN_PASS", "test-password")
    return module


@pytest.fixture
def http_server():
    from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
    from threading import Thread

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self):
            self.send_response(self.server.response_status)
            self.send_header("Content-Type", self.server.content_type)
            self.end_headers()
            self.wfile.write(self.server.body)

        def log_message(self, *args):
            pass

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    server.response_status = 200
    server.content_type = "application/json"
    server.body = b'{"status":"online","app":"MyBot Studio"}'
    thread = Thread(target=server.serve_forever, daemon=True)
    thread.start()
    yield server
    server.shutdown()
    server.server_close()
    thread.join(timeout=2)


def test_any_tcp_listener_counts_as_conflict(launcher, monkeypatch):
    import socket
    monkeypatch.undo()
    with socket.socket() as listener:
        listener.bind(("127.0.0.1", 0))
        listener.listen()
        assert launcher.port_open("127.0.0.1", listener.getsockname()[1], timeout=0.02)


@pytest.mark.parametrize("status, content_type, body, healthy", [
    (200, "application/json", b'{"status":"online"}', True),
    (503, "application/json", b'{"status":"online"}', False),
    (200, "text/html", b'<html>unrelated service</html>', False),
    (200, "application/json", b'{"status":"offline"}', False),
    (200, "application/json", b'[]', False),
    (200, "application/json", b'broken json', False),
])
def test_backend_requires_http_health(launcher, http_server, status, content_type, body, healthy):
    http_server.response_status = status
    http_server.content_type = content_type
    http_server.body = body
    assert launcher.http_ready("127.0.0.1", http_server.server_port, backend=True) is healthy


@pytest.mark.parametrize("occupied", [23567, 23568])
def test_conflict_fails_without_stopping_existing_services(launcher, monkeypatch, capsys, occupied):
    monkeypatch.setattr(
        launcher,
        "port_open",
        lambda host, port, timeout=2.0: port == occupied,
    )
    assert launcher.main() == 1
    launcher.subprocess.Popen.assert_not_called()
    launcher.subprocess.run.assert_not_called()
    launcher.subprocess.check_output.assert_not_called()
    assert f"Port {occupied} is already in use" in capsys.readouterr().out


def test_startup_waits_for_both_services_before_ready_or_browser(launcher, monkeypatch, capsys):
    events = []
    processes = [Mock(), Mock()]
    for process in processes:
        process.poll.return_value = None
    def spawn(*args, **kwargs):
        events.append("spawn")
        return processes[events.count("spawn") - 1]
    monkeypatch.setattr(launcher.subprocess, "Popen", spawn)
    def health(host, port, **kwargs):
        assert "is ready!" not in capsys.readouterr().out
        assert events.count("spawn") == (1 if port == 23567 else 2)
        events.append(f"health:{port}")
        return True
    monkeypatch.setattr(launcher, "http_ready", health)
    def browser(url):
        assert events[-1] == "health:23568"
        assert "is ready!" in capsys.readouterr().out
        events.append("browser")
        raise KeyboardInterrupt
    monkeypatch.setattr(launcher.webbrowser, "open", browser)
    assert launcher.start_services() == 130
    assert events == ["spawn", "health:23567", "spawn", "health:23568", "browser"]
    for process in processes:
        assert process.terminate.called or launcher.subprocess.run.called


@pytest.mark.parametrize("failed_index", [0, 1])
def test_child_exit_during_startup_is_failure(launcher, monkeypatch, capsys, failed_index):
    processes = [Mock(), Mock()]
    for i, process in enumerate(processes):
        process.poll.return_value = 7 if i == failed_index else None
    monkeypatch.setattr(launcher.subprocess, "Popen", Mock(side_effect=processes))
    monkeypatch.setattr(launcher, "http_ready", Mock(return_value=True))
    browser = Mock()
    monkeypatch.setattr(launcher.webbrowser, "open", browser)
    assert launcher.start_services() == 1
    browser.assert_not_called()
    assert "is ready!" not in capsys.readouterr().out


@pytest.mark.parametrize("failed_index", [0, 1])
def test_spawn_failure_cleans_up_started_services(launcher, monkeypatch, failed_index):
    processes = [Mock(), Mock()]
    for process in processes:
        process.poll.return_value = None
    monkeypatch.setattr(launcher.subprocess, "Popen", Mock(side_effect=processes[:failed_index] + [OSError("test failure")]))
    monkeypatch.setattr(launcher, "http_ready", Mock(return_value=True))
    assert launcher.start_services() == 1
    for process in processes[:failed_index]:
        assert process.terminate.called or launcher.subprocess.run.called


@pytest.mark.parametrize("port", [23567, 23568])
def test_health_timeout_never_reports_ready(launcher, monkeypatch, capsys, port):
    process = Mock()
    process.poll.return_value = None
    monkeypatch.setattr(launcher.subprocess, "Popen", Mock(return_value=process))
    monkeypatch.setattr(launcher, "http_ready", lambda host, candidate, **kw: candidate != port)
    monkeypatch.setattr(launcher.webbrowser, "open", Mock())
    assert launcher.start_services() == 1
    launcher.webbrowser.open.assert_not_called()
    assert "is ready!" not in capsys.readouterr().out


@pytest.mark.parametrize("exit_code", [0, 9])
def test_runtime_child_exit_is_not_success(launcher, monkeypatch, capsys, exit_code):
    processes = [Mock(), Mock()]
    for process in processes:
        process.poll.return_value = None
    monkeypatch.setattr(launcher.subprocess, "Popen", Mock(side_effect=processes))
    monkeypatch.setattr(launcher, "http_ready", Mock(return_value=True))
    def browser(url):
        processes[1].poll.return_value = exit_code
    monkeypatch.setattr(launcher.webbrowser, "open", browser)
    assert launcher.start_services() == 1
    output = capsys.readouterr().out
    assert "exited unexpectedly" in output
    assert launcher.ADMIN_PASS not in output
    assert launcher.SECRET_PATH not in output


def test_batch_wrapper_preserves_launcher_exit_status():
    script = (ROOT / "start-local.bat").read_text(encoding="utf-8")
    assert 'set "LAUNCHER_EXIT=%ERRORLEVEL%"' in script
    assert 'exit /b %LAUNCHER_EXIT%' in script


def test_check_is_dependency_only_even_when_ports_occupied(launcher, monkeypatch):
    monkeypatch.setattr(launcher.sys, "argv", ["start-local.py", "--check"])
    probe = Mock(return_value=True)
    monkeypatch.setattr(launcher, "port_open", probe)
    assert launcher.main() == 0
    probe.assert_not_called()
    launcher.subprocess.Popen.assert_not_called()


def test_no_inert_worker_process_and_requested_ports(launcher, monkeypatch):
    commands = []
    def spawn(command, **kwargs):
        commands.append(command)
        process = Mock()
        process.poll.return_value = 0 if "app.bot_worker" in command else None
        return process
    monkeypatch.setattr(launcher.subprocess, "Popen", spawn)
    monkeypatch.setattr(launcher, "http_ready", lambda *a, **k: True)
    def ready(url):
        assert url == "http://127.0.0.1:23568"
        raise KeyboardInterrupt
    monkeypatch.setattr(launcher.webbrowser, "open", ready)
    assert launcher.start_services() == 130
    assert len(commands) == 2
    assert "app.main:app" in commands[0]
    assert "23567" in commands[0]
    assert "23568" in commands[1]
    assert all("app.bot_worker" not in cmd for cmd in commands)
