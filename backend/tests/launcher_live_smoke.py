"""Opt-in real launcher smoke; isolated DB, real uvicorn/Vite, no Telegram bots.
Run from backend: .venv/Scripts/python tests/launcher_live_smoke.py
"""
import importlib.util
import json
import os
import argparse
from pathlib import Path
import tempfile
import urllib.request

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('launcher', ROOT / 'start-local.py')
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--frontend-port', type=int, default=launcher.FE_PORT)
    args = parser.parse_args()
    launcher.FE_PORT = args.frontend_port
    for port in (launcher.PORT, launcher.FE_PORT):
        if launcher.port_open(launcher.HOST, port):
            raise RuntimeError(f'Test requires free port {port}; existing service will not be stopped')
    with tempfile.TemporaryDirectory(prefix='mybot-launch-smoke-') as directory:
        os.environ['DATABASE_PATH'] = str(Path(directory) / 'fresh.db')
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
        def get(path):
            with opener.open(path, timeout=8) as response:
                return response.headers.get_content_type(), response.read()
        verified = []
        def verify(url):
            assert url == f'http://127.0.0.1:{launcher.FE_PORT}'
            kind, body = get('http://127.0.0.1:23567/')
            assert kind == 'application/json' and json.loads(body)['status'] == 'online'
            kind, body = get(url)
            assert kind == 'text/html'
            kind, body = get(url + '/api/bots')
            assert kind == 'application/json' and json.loads(body) == []
            kind, body = get(url + '/media/default-bot.png')
            assert kind == 'image/png' and body.startswith(b'\x89PNG')
            verified.append(True)
            print(f'PASS real services: backend {launcher.PORT}, frontend {launcher.FE_PORT}, API proxy, media proxy, empty isolated database', flush=True)
            raise KeyboardInterrupt
        errors = []
        def bounded_verify(url):
            try:
                verify(url)
            except Exception as exc:
                errors.append(exc)
            finally:
                raise KeyboardInterrupt
        launcher.webbrowser.open = bounded_verify
        code = launcher.start_services()
        assert not errors, errors
        assert code == 130 and verified
        assert not launcher.port_open('127.0.0.1',23567)
        assert not launcher.port_open(launcher.HOST, launcher.FE_PORT)
        print('PASS owned services cleaned up; existing services untouched', flush=True)

if __name__ == '__main__':
    main()
