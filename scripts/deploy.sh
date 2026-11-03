#!/usr/bin/env bash
# ==============================================================================
# dayli.ai — BO Blueprint Production Deployment Script
# Orchestrates Docker + Redis + Caddy + App with pre-flight checks and health verification.
# ==============================================================================

set -euo pipefail

cd "$(dirname "$0")/.."

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}==================================================================${NC}"
echo -e "${GREEN}🚀 Deploying dayli.ai WhatsApp Copilot (BO Blueprint)${NC}"
echo -e "${GREEN}==================================================================${NC}"

# 1. Pre-flight checks: Docker & Compose
if ! command -v docker >/dev/null 2>&1; then
  echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo -e "${RED}❌ Docker Compose plugin is not installed.${NC}"
  exit 1
fi

# 2. Pre-flight check: .env configuration
if [ ! -f .env ]; then
  echo -e "${RED}❌ .env file not found in repository root.${NC}"
  echo -e "${YELLOW}👉 Run 'cp .env.example .env' and fill in your credentials.${NC}"
  exit 1
fi

# Validate critical environment variables in .env
source .env 2>/dev/null || true

MISSING=()
[ -z "${META_WHATSAPP_PHONE_NUMBER_ID:-}" ] && MISSING+=("META_WHATSAPP_PHONE_NUMBER_ID")
[ -z "${META_WHATSAPP_ACCESS_TOKEN:-}" ] && MISSING+=("META_WHATSAPP_ACCESS_TOKEN")
[ -z "${META_WHATSAPP_VERIFY_TOKEN:-}" ] && MISSING+=("META_WHATSAPP_VERIFY_TOKEN")
[ -z "${META_WHATSAPP_APP_SECRET:-}" ] && MISSING+=("META_WHATSAPP_APP_SECRET")

if [ ${#MISSING[@]} -ne 0 ]; then
  echo -e "${RED}❌ Missing required environment variables in .env:${NC}"
  for var in "${MISSING[@]}"; do
    echo -e "   - ${var}"
  done
  exit 1
fi

DOMAIN="${DOMAIN_NAME:-localhost}"
if [ "$DOMAIN" = "localhost" ]; then
  echo -e "${YELLOW}⚠️ DOMAIN_NAME is unset or 'localhost'. Caddy will use self-signed TLS.${NC}"
  echo -e "${YELLOW}   For production WhatsApp Cloud API, configure DOMAIN_NAME in .env (e.g. dayli.duckdns.org).${NC}"
fi
echo -e "${GREEN}✅ Environment pre-flight checks passed.${NC}"
echo -e "   • Domain Target: ${YELLOW}${DOMAIN}${NC}"
echo -e "   • Meta Phone ID: ${YELLOW}${META_WHATSAPP_PHONE_NUMBER_ID}${NC}"

# 3. Pull & Build production container stack
echo -e "\n${YELLOW}📦 Building and launching production containers (App + Redis + Caddy + Ollama)...${NC}"
docker compose -f docker-compose.prod.yml up -d --build

# 3b. Load MedGemma 1.5 in cloud Ollama
echo -e "\n${YELLOW}🧠 Ensuring MedGemma 1.5 is loaded in cloud Ollama...${NC}"
docker exec dayli_ollama_prod ollama pull medgemma || true

# 4. Wait for healthcheck verification
echo -e "\n${YELLOW}⏳ Waiting for service to report healthy...${NC}"
MAX_RETRIES=20
COUNT=0
HEALTHY=false

while [ $COUNT -lt $MAX_RETRIES ]; do
  sleep 2
  COUNT=$((COUNT + 1))
  
  # Check local health endpoint on app container
  if curl -sf http://127.0.0.1:3000/health >/dev/null 2>&1; then
    HEALTHY=true
    break
  fi
  echo -n "."
done
echo ""

if [ "$HEALTHY" = true ]; then
  HEALTH_RESP=$(curl -s http://127.0.0.1:3000/health || echo "{}")
  echo -e "${GREEN}✅ dayli.ai application is HEALTHY!${NC}"
  echo -e "   • Health Response: ${HEALTH_RESP}"
else
  echo -e "${RED}❌ Health check timed out after 40 seconds.${NC}"
  echo -e "${YELLOW}Checking container logs:${NC}"
  docker compose -f docker-compose.prod.yml logs --tail=30 app
  exit 1
fi

# 5. Display stack summary
echo -e "\n${GREEN}==================================================================${NC}"
echo -e "${GREEN}🎉 Deployment Complete! Container Stack Status:${NC}"
echo -e "${GREEN}==================================================================${NC}"
docker compose -f docker-compose.prod.yml ps

echo -e "\n${YELLOW}🔗 Live Endpoint Summary:${NC}"
echo -e "   • Webhook URL:       https://${DOMAIN}/api/webhook"
echo -e "   • Health Endpoint:   https://${DOMAIN}/health"
echo -e "   • Ops Dashboard:     https://${DOMAIN}/ops"
echo -e "   • Local Inspection:  http://127.0.0.1:3000/health"
echo -e "\n${GREEN}Production background workers & Redis session store are ACTIVE.${NC}"
