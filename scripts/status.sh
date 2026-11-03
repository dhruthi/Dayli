#!/usr/bin/env bash
# ==============================================================================
# dayli.ai — BO Blueprint Stack Status & Diagnostics
# ==============================================================================

set -euo pipefail

cd "$(dirname "$0")/.."

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== dayli.ai Container Status ===${NC}"
docker compose -f docker-compose.prod.yml ps

echo -e "\n${GREEN}=== Application Health Endpoint (http://127.0.0.1:3000/health) ===${NC}"
if curl -sf http://127.0.0.1:3000/health; then
  echo ""
else
  echo -e "${RED}Application not responding on port 3000${NC}"
fi

echo -e "\n${GREEN}=== Redis Engine Health ===${NC}"
if docker exec dayli_redis_prod redis-cli ping >/dev/null 2>&1; then
  echo -e "${GREEN}Redis PING: PONG (Healthy)${NC}"
  docker exec dayli_redis_prod redis-cli info memory | grep "used_memory_human" || true
else
  echo -e "${RED}Redis container not responding${NC}"
fi

echo -e "\n${GREEN}=== Ollama Engine & MedGemma Health ===${NC}"
if docker exec dayli_ollama_prod ollama list >/dev/null 2>&1; then
  echo -e "${GREEN}Ollama: Healthy. Loaded models:${NC}"
  docker exec dayli_ollama_prod ollama list
else
  echo -e "${RED}Ollama container not responding${NC}"
fi

echo -e "\n${GREEN}=== Recent Application Logs (last 15 lines) ===${NC}"
docker compose -f docker-compose.prod.yml logs --tail=15 app
