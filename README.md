# MyBot Studio

A self-hosted, visual execution engine and DAG builder for Telegram bots.

MyBot Studio provides an offline-first, node-based workspace designed for deploying, orchestrating, and maintaining high-throughput Telegram bots without third-party vendor lock-in.

---

## Architectural Principles

- **Independent Bot Isolation**: Each bot runs against its own isolated SQLite storage (`bot_{id}.db`). Runtime user state, variable storage, and message flows are fully segregated.
- **Deterministic DAG Execution**: Dynamic flows are compiled into directed acyclic graphs. Triggers (Commands, Callbacks, Reply Keyboards) resolve through an event-driven scheduler.
- **Zero Cloud Dependencies**: Self-hosted stack powered by FastAPI and Aiogram 3 on the backend, with a Vite + ReactFlow interface on the frontend. Offline font rendering and localized assets.
- **Network Resilience**: Native support for reverse proxies (Cloudflare Workers, HTTP/SOCKS5 tunnels) to operate reliably in restricted network topologies.

---

## Installation

### Automated Production Deployment (Linux / VPS)

Run the single-line installer on any clean Ubuntu 22.04+ or Debian 12 machine with root privileges:

```bash
bash <(curl -s https://raw.githubusercontent.com/AradPhpProgrammer/mybot-studio/refs/heads/master/install.sh)
```

The script configures Docker containers, creates required storage mounts, prompts for network bindings, and bootstraps the reverse proxy.

### Local Development Setup

```bash
# Clone the repository
git clone https://github.com/AradPhpProgrammer/mybot-studio.git
cd mybot-studio

# Backend setup
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
python -m app.main

# Frontend setup (in a separate shell)
cd ../frontend
npm install
npm run dev
```

---

## Ecosystem & Extensions

- **Plugins & Flow Templates**: Reusable integrations, custom nodes, and official flow templates (including AI agent pipelines) are indexed in the community repository:  
  👉 **[MyBot Plugins Directory](https://github.com/AradPhpProgrammer/mybot-plugins)**

---

## Contributing

We welcome focused contributions from the community. To keep the project stable:

1. **Bug Reports**: Open an issue detailing steps to reproduce, environment specifics, and error logs.
2. **Pull Requests**: Pull requests must reference an existing issue. We do not accept unsolicited feature additions that increase surface area without prior discussion.
3. **Coding Standards**: All backend code must pass the test harness (`python backend/tests/run_tests.py`), and the frontend must compile cleanly with zero linter errors.

---

## License

This project is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).
