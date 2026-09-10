<div align="center">

# 🚀 MyBot Engine & Studio
### The Self-Hosted, Visual No-Code Telegram Bot Platform
**Unreal Engine Blueprints & n8n Architecture for Telegram Bots**

[![License: AGPL-3.0 with Plugin Exception](https://img.shields.io/badge/License-AGPL%203.0%20with%20Plugin%20Exception-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg?logo=docker&logoColor=white)](deploy/docker-compose.yml)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](backend/)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB.svg?logo=react&logoColor=black)](frontend/)
[![Telegram Bot API](https://img.shields.io/badge/Telegram%20Bot%20API-9.4%20%2F%2010.0-2CA5E0.svg?logo=telegram&logoColor=white)](https://core.telegram.org/bots/api)

[**فارسی (Persian)**](docs/README.fa.md) | [**English**](docs/README.en.md) | [**Русский**](docs/README.ru.md) | [**العربية**](docs/README.ar.md)

</div>

---

## 🌟 Overview

**MyBot** is an enterprise-grade, self-hosted visual platform for building and orchestrating complex Telegram bots without writing code. Inspired by the **DAG workflow execution of n8n** and the **visual scripting paradigm of Unreal Engine Blueprints**, MyBot combines an infinite node canvas with a **live, draggable, interactive Telegram chat mockup & simulator**.

---

## 🔑 Default Admin Credentials

When running for the first time:
- **Username:** `admin`
- **Password:** `admin1234`
- *You can change your username and password at any time directly in the **Settings** tab.*

---

## ✨ Key Capabilities

1. **⚡ Unreal Engine & n8n Style Infinite Canvas:**
   - Visual nodes for Commands, Triggers, Conditions (IF/Else), Multi-Media Messages, Dynamic NoSQL Variables, and External HTTP Webhooks.
   - Quick search palette (`Space` or `Right-Click` on canvas) with instant category filtering.

2. **📱 Draggable Interactive Telegram Mockup & Live Simulator:**
   - Real-time mobile chat preview floating on your canvas.
   - **Edit Mode:** Rich Text Toolbar (Bold, Italic, Spoiler, Expandable Blockquotes, Monospace Tables) + Drag-and-Drop Inline Keyboard editor with native Telegram Bot API colors (`primary` blue, `success` green, `danger` red).
   - **Simulator Mode:** Interactive live in-browser testing! Type `/start` or click inline buttons to test flows with zero phone usage.

3. **🔄 Zero-Downtime Bot Worker (Decoupled Microservices):**
   - The bot engine runs as an independent 24/7 background process. Updating or restarting the admin panel causes **zero seconds of downtime** for your live Telegram bots!

4. **⚡ SQLite WAL Mode with NoSQL Flexibility:**
   - Single-file database with zero overhead.
   - Stores unlimited dynamic user variables inside structured JSON fields with high-performance SQLite JSON extraction functions.

5. **🧩 WordPress-Style Plugin Architecture:**
   - **Toolkit Plugins:** Add custom action nodes (e.g., ZarinPal payment gateway, AI ChatGPT nodes, SMS services).
   - **Admin Plugins:** Add dashboard tools (e.g., Broadcast tool with 30 msgs/sec rate-limiting).

6. **🌐 1-File Internationalization (i18n) & Font System:**
   - Default English (🇺🇸) interface with instant switching to Persian (🇮🇷), Russian (🇷🇺), and Arabic (🇸🇦).
   - Add any new language simply by dropping a `.json` file in `locales/` or uploading via Settings.
   - Add any custom font with 1-click `.woff2` / `.ttf` upload or Google Fonts CDN link.

7. **🛡️ Censorship-Resistant (Cloudflare Worker & SOCKS5 Proxy):**
   - Direct integration with Cloudflare reverse proxies (e.g., `andro-cfw`) and local proxies for restricted network environments (such as Iran).

---

## 🚀 Quick Start & Installation

### Option 1: One-Click Production VPS Installer (Linux / Ubuntu / Debian)
```bash
curl -sSL https://raw.githubusercontent.com/AradPhpProgrammer/mybot/main/install.sh | sudo bash
```
*Prompts for IPv4 or Domain with automatic Let's Encrypt SSL, panel port, secret admin path, and Cloudflare reverse proxy.*

### Option 2: Production Docker Compose (Any OS)
```bash
git clone https://github.com/AradPhpProgrammer/mybot.git
cd mybot
docker compose -f deploy/docker-compose.yml up -d --build
```

### Option 3: Local Run without Docker (Windows / Linux / macOS)
- **Windows:** Double-click `start-local.bat`
- **Linux / macOS:**
```bash
chmod +x start-local.sh
./start-local.sh
```

---

## 🔄 Zero-Downtime Updates

To update the studio without interrupting your Telegram bots:
- **Linux:** `bash deploy/update.sh`
- **Windows:** `deploy\update.bat`

---

## 📜 License

This project is licensed under the **GNU Affero General Public License v3 (AGPL-3.0)** with the **MyBot Extension & Plugin Exception**, allowing developers to create and sell proprietary commercial plugins while keeping the core platform open-source. See [LICENSE](LICENSE) for details.
