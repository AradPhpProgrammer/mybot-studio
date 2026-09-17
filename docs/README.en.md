# MyBot Studio

A self-hosted visual Telegram bot builder with a ReactFlow canvas, FastAPI backend and Aiogram runtime.

[English](README.en.md) · [فارسی](README.fa.md) · [العربية](README.ar.md) · [Русский](README.ru.md)

> **v0.2 — prerelease, not a stable release.** These instructions target `main` after the v0.2 merge and default-branch migration. Until that migration is published, the `main` clone command is not available; do not silently substitute `master`. Back up existing data before testing.

## What's new in v0.2

- **Dedicated Keyboard node** (`action_keyboard`): design inline or reply keyboards with rows, labels, identifiers and Telegram semantic button styles (`primary`, `success`, `danger`). Connect it directly after a Send Message or Edit Message node; reply keyboards require Send Message.
- **Shared keyboard editor** on the node and in the preview's Edit tab, with row/button reordering. Existing embedded keyboard data and legacy reply-keyboard nodes remain supported.
- **Responsive layout work** for narrow panels, dialogs and the floating chat preview, plus light/dark and RTL refinements. This is not a guarantee of identical Telegram rendering on every device.
- **Graph undo/redo and snapshot saving** cover message text, keyboard definitions and graph edits. A successful save marks only the submitted snapshot clean; edits made while saving remain unsaved.
- **Connection validation** explains invalid keyboard links; context-menu node insertion uses canvas coordinates after zoom/pan.

## Telegram keyboard rules

Each send has **one `reply_markup`**: inline and reply markup cannot be combined in the same request. A reply keyboard already visible in Telegram may remain below a later inline-keyboard message; this does not mean that message contains both. The Keyboard node attaches to its executed message predecessor, not an unrelated message from another branch.

**Message edits support inline keyboards only.** Reply keyboards cannot be attached through Telegram edit methods. Text edits, media-caption edits and inline-markup-only edits use different Telegram methods; a markup-only edit must not send empty text. The simulator is a local approximation, not proof of successful Telegram delivery.

## Installation

### Get the prerelease source

Install Git, then clone the intended `main` branch after migration:

```bash
git clone --branch main https://github.com/AradPhpProgrammer/mybot-studio.git
cd mybot-studio
```

### Local development — no Docker

Run from the **repository root**, not `backend/` or `frontend/`:

**Windows (CMD / PowerShell)**
```bat
.\start-local.bat
```

**Linux / macOS**
```bash
bash start-local.sh
```

Requirements: Python **3.10+** with `pip` and `venv`, and Node.js **18+** with npm (Vite 5 requirement); a current supported Node LTS is recommended. Put the tools on PATH. `uv` is optional, with pip as fallback. Downloads need network access; live bots need access to Telegram. Self-hosted does not mean Telegram works offline.

Both wrappers invoke **`start-local.py`**. It creates `.env` if absent, prepares `backend/.venv`, installs Python dependencies, smoke-checks backend imports and installs frontend dependencies if `node_modules` is absent. Normal startup launches the API, waits for it at `127.0.0.1:23567`, then starts Vite (normally `http://localhost:23568`). Read terminal errors if startup fails; do not start only the frontend to bypass an API failure. Keep port 8000 free: the launcher may terminate an existing listener there.

Dependency/import check only:

```bat
.\start-local.bat --check
```
```bash
bash start-local.sh --check
```

**`--check` does not launch the worker, API or frontend and does not prove service health.** It can create configuration/virtualenv files, install dependencies and import backend code; it is not read-only. The launcher does not fully validate installed dependency versions when `node_modules` already exists.

### Linux VPS / Docker

Use the complete checkout above, review `install.sh`, then run from its root:

```bash
sudo bash install.sh
```

The installer expects sibling `deploy/` and `backend/` files; do not execute a standalone downloaded script through a curl pipe. It prompts for bindings, admin settings and optional proxy configuration and builds Docker services. Its domain/SSL question alone does **not** provision a certificate: configure and verify HTTPS separately. On Windows with Docker/Compose available, review and run `install.bat`; for ordinary local development use `start-local.bat` instead.

This prerelease is not production-hardened. Replace default admin credentials and signing secrets, verify the effective configuration, restrict panel access and back up `.env`, databases and uploads before exposing or upgrading a deployment. Do not publish credentials, bot tokens or private logs. A split worker container is not a zero-downtime guarantee; runtime changes require updating the worker too. See [release notes](releases/v0.2.md) for upgrade caveats.

## Studio workflow

1. Add a bot using your own BotFather token, then open its Studio.
2. Connect a trigger to Send Message and then to Keyboard. Select inline or reply mode; use inline mode after Edit Message.
3. Edit text and keyboards, save, and try commands/callbacks in the simulator. Verify real delivery separately with a test bot.
4. Enable user-variable storage in bot settings before using gated variable/database nodes.

| Action | Shortcut |
| --- | --- |
| Undo graph edit | Ctrl+Z (Cmd+Z on macOS) |
| Redo graph edit | Ctrl+Shift+Z / Ctrl+Y (Cmd equivalents supported) |
| Save flow snapshot | Ctrl+S / Ctrl+Shift+S (Cmd equivalents supported) |

Graph-editor fields share graph history; unrelated settings and simulator text fields retain native text undo. A reload warning depends on browser behavior and is not autosave.

## Architecture, languages and extensions

The panel uses React/Vite and ReactFlow; the Python API and Aiogram worker execute flows with per-bot SQLite storage (`bot_{id}.db`). Docker separates panel and worker services. JSON user variables do not require a separate database server. Proxy configuration can help in restricted networks but does not guarantee connectivity.

English, Persian, Arabic and Russian locale files live in `frontend/src/locales/`; backend locale/font assets live under `backend/`. The floating preview supports editing and simulation, with minimize/restore controls. Treat preview appearance as approximate.

[MyBot Plugins Directory](https://github.com/AradPhpProgrammer/mybot-plugins) contains community extensions and templates. Review third-party code and its permissions before installation.

## Contributing and verification

Open an issue with reproduction steps and redacted logs before proposing a feature. Run the relevant backend tests and frontend regression suites/build; publish actual results, not assumed pass counts. A successful build or dependency check does not verify browser interactions or Telegram delivery.

Maintained by [AradPhpProgrammer](https://github.com/AradPhpProgrammer). Licensed under [AGPL-3.0 with the MyBot Extension & Plugin Exception](../LICENSE); modifications to the core remain under AGPL. See the license text for the exception's scope.
