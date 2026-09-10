#!/usr/bin/env bash
set -e

# ==============================================================================
# MyBot Engine — Production VPS Installer (Linux / Ubuntu / Debian)
# ==============================================================================

GREEN='\033[032m'
BLUE='\033[034m'
YELLOW='\033[1;33m'
CYAN='\033[036m'
RED='\033[031m'
NC='\033[0m' # No Color

clear
echo -e "${CYAN}==============================================================================${NC}"
echo -e "${GREEN}      🚀 MyBot Studio & Engine — Production VPS Installer 🚀${NC}"
echo -e "${CYAN}==============================================================================${NC}"
echo -e "Self-Hosted Visual Telegram Bot Builder (Unreal Engine & n8n Style)"
echo ""

# 1. Ensure Root
if [ "$EUID" -ne 0 ]; then
    echo -e "${YELLOW}⚠️ Please run as root (or with sudo).${NC}"
    exit 1
fi

# 2. Check / Install Docker
if ! command -v docker &> /dev/null; then
    echo -e "${BLUE}📦 Docker not found. Installing Docker automatically...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl enable --now docker
fi

# 3. Installation Prompts
echo -e "${CYAN}------------------------------------------------------------------------------${NC}"
echo -e "${YELLOW}1. Host Connection Type:${NC}"
echo "   [1] IPv4 (Direct Server IP)"
echo "   [2] Domain Name (with optional Let's Encrypt SSL)"
read -p "Select [1 or 2, default 1]: " HOST_TYPE
HOST_TYPE=${HOST_TYPE:-1}

DOMAIN_OR_IP=""
SSL_ENABLED=false

if [ "$HOST_TYPE" == "2" ]; then
    read -p "Enter your domain name (e.g. bot.example.com): " DOMAIN_OR_IP
    read -p "Do you want automatic Let's Encrypt SSL certificate? (y/n, default y): " WANT_SSL
    WANT_SSL=${WANT_SSL:-y}
    if [[ "$WANT_SSL" =~ ^[Yy]$ ]]; then
        SSL_ENABLED=true
    fi
else
    # Auto-detect public IP
    SERVER_IP=$(curl -s -4 https://ifconfig.me || curl -s -4 https://api.ipify.org || echo "127.0.0.1")
    read -p "Enter server IPv4 address [default: $SERVER_IP]: " DOMAIN_OR_IP
    DOMAIN_OR_IP=${DOMAIN_OR_IP:-$SERVER_IP}
fi

# 4. Panel Port
read -p "Enter Panel HTTP Port [default: 80]: " PANEL_PORT
PANEL_PORT=${PANEL_PORT:-80}

# 5. Secret Admin Path
RANDOM_SECRET=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 12 ; echo '')
DEFAULT_SECRET_PATH="panel_${RANDOM_SECRET}"
read -p "Enter secret admin panel path [default: $DEFAULT_SECRET_PATH]: " ADMIN_SECRET_PATH
ADMIN_SECRET_PATH=${ADMIN_SECRET_PATH:-$DEFAULT_SECRET_PATH}

# 6. Restricted Network / Telegram Proxy (Iran / Censored VPS)
echo -e "${CYAN}------------------------------------------------------------------------------${NC}"
read -p "Is this server located in a region where Telegram is restricted (e.g. Iran)? (y/n, default n): " IS_RESTRICTED
IS_RESTRICTED=${IS_RESTRICTED:-n}

CF_PROXY_URL=""
HTTP_PROXY=""

if [[ "$IS_RESTRICTED" =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}💡 You can use Cloudflare Reverse Worker (e.g. andro-cfw) or SOCKS5 proxy.${NC}"
    read -p "Enter Cloudflare Worker URL (e.g. https://your-worker.workers.dev) [optional]: " CF_PROXY_URL
    if [ -z "$CF_PROXY_URL" ]; then
        read -p "Enter SOCKS5/HTTP Proxy (e.g. socks5://127.0.0.1:1080) [optional]: " HTTP_PROXY
    fi
fi

# 7. Admin Credentials
echo -e "${CYAN}------------------------------------------------------------------------------${NC}"
read -p "Enter Admin Username [default: admin]: " ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

RANDOM_PASS=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 10 ; echo '')
read -p "Enter Admin Password [default: $RANDOM_PASS]: " ADMIN_PASS
ADMIN_PASS=${ADMIN_PASS:-$RANDOM_PASS}

JWT_SECRET=$(head /dev/urandom | tr -dc A-Za-z0-9 | head -c 32 ; echo '')

# 8. Create .env configuration
cd "$(dirname "$0")"

cat <<EOF > .env
PANEL_PORT=${PANEL_PORT}
ADMIN_SECRET_PATH=${ADMIN_SECRET_PATH}
DEFAULT_ADMIN_USER=${ADMIN_USER}
DEFAULT_ADMIN_PASS=${ADMIN_PASS}
JWT_SECRET=${JWT_SECRET}
CF_PROXY_URL=${CF_PROXY_URL}
HTTP_PROXY=${HTTP_PROXY}
EOF

# 9. Launch Decoupled Docker Services
echo -e "${CYAN}------------------------------------------------------------------------------${NC}"
echo -e "${BLUE}🚀 Building and starting MyBot containers with Docker Compose...${NC}"
docker compose -f deploy/docker-compose.yml up -d --build

# 10. Output Success Banner
echo ""
echo -e "${GREEN}==============================================================================${NC}"
echo -e "${GREEN}🎉 MyBot Studio & Engine successfully installed! 🎉${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo ""
echo -e "🔗 ${CYAN}Admin Panel URL:${NC}  http://${DOMAIN_OR_IP}:${PANEL_PORT}/${ADMIN_SECRET_PATH}"
echo -e "👤 ${CYAN}Admin Username:${NC}   ${ADMIN_USER}"
echo -e "🔑 ${CYAN}Admin Password:${NC}   ${ADMIN_PASS}"
echo ""
echo -e "🤖 ${YELLOW}Bot Runner Status:${NC}   Online 24/7 (Zero-Downtime Microservice Container)"
echo -e "🔄 ${YELLOW}To Update Panel:${NC}     bash deploy/update.sh"
echo ""
echo -e "${CYAN}==============================================================================${NC}"
