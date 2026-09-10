# 🚀 MyBot Studio Comprehensive Documentation

**The Self-Hosted, Visual No-Code Telegram Bot Platform inspired by Unreal Engine & n8n**

---

## 📋 Table of Contents
1. [Overview & Key Features](#key-features)
2. [Decoupled Zero-Downtime Architecture](#architecture)
3. [VPS Production Installation (Linux & Windows)](#vps-installation)
4. [Local Development (Without Docker)](#local-development)
5. [Studio Workflow & Canvas Controls](#studio-workflow)
6. [Floating Chat Mockup & Live Simulator](#floating-mockup)
7. [i18n & Font Customization](#i18n-and-fonts)
8. [WordPress-style Plugin Architecture](#plugin-architecture)
9. [Commercial Licensing](#license)

---

## 🌟 Key Features

* **Infinite DAG Node Canvas:** Build complex event-driven bot workflows by connecting nodes visually.
* **Draggable & Resizable Floating Telegram Mockup:** Real-time preview with rich formatting tools and native Bot API 9.4/10.0 button colors (`primary`, `success`, `danger`).
* **Interactive Live Chat Simulator:** Test commands and button callbacks directly in your browser with zero latency.
* **Zero-Downtime Bot Worker:** Independent supervisor container keeps bots online 24/7 during panel updates.
* **NoSQL on SQLite (JSON Document Store):** Flexible dynamic user variables without database migrations.
* **Censorship-Bypassing Proxies:** Built-in support for Cloudflare reverse workers (`andro-cfw`) and SOCKS5/HTTP proxies.
* **Single-File Internationalization:** Add new languages with a single `.json` file in `locales/`.

---

## 🚀 VPS Installation

### Linux Automated Installer (Ubuntu / Debian)
```bash
curl -sSL https://raw.githubusercontent.com/AradPhpProgrammer/mybot/main/install.sh | sudo bash
```

### Windows Server
Run `install.bat` from the root directory.

---

## 💻 Local Development (Without Docker)

- **Windows:** Run `start-local.bat`
- **Linux / macOS:**
```bash
chmod +x start-local.sh
./start-local.sh
```

---

## 📜 License

Licensed under **AGPL-3.0 with the MyBot Plugin Exception**. Commercial and closed-source plugins are fully permitted.
