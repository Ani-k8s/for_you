#!/usr/bin/env bash
# =============================================================================
# ForYou Gym SaaS — One-Command Setup Script
# =============================================================================
# USAGE:
#   ./scripts/setup.sh           — Full setup (build + start + seed)
#   ./scripts/setup.sh --no-seed — Skip demo data seeding
#   ./scripts/setup.sh --clean   — Remove volumes and restart fresh
#
# WHAT IT DOES:
#   1. Validates Docker is running
#   2. Sets up environment file if missing
#   3. Builds Docker images
#   4. Starts all services
#   5. Waits for healthchecks
#   6. Seeds demo data (optional)
#   7. Prints access URLs
# =============================================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ── Script directory ─────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Options ───────────────────────────────────────────────────────────────────
SEED=true
CLEAN=false

for arg in "$@"; do
  case $arg in
    --no-seed) SEED=false ;;
    --clean)   CLEAN=true ;;
    *)         echo -e "${YELLOW}Unknown option: $arg${NC}" ;;
  esac
done

# ── Banner ────────────────────────────────────────────────────────────────────
echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║         ForYou Gym SaaS — Setup Script           ║"
echo "  ║       Multi-Tenant Gym Management Platform        ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Step 1: Validate Docker ───────────────────────────────────────────────────
echo -e "${BLUE}[1/7] Checking Docker...${NC}"
if ! docker info &>/dev/null; then
  echo -e "${RED}ERROR: Docker is not running. Please start Docker Desktop and try again.${NC}"
  exit 1
fi
echo -e "${GREEN}  ✓ Docker is running${NC}"

# Check docker-compose
if ! docker compose version &>/dev/null 2>&1; then
  if ! command -v docker-compose &>/dev/null; then
    echo -e "${RED}ERROR: docker-compose is not installed.${NC}"
    exit 1
  fi
  COMPOSE_CMD="docker-compose"
else
  COMPOSE_CMD="docker compose"
fi
echo -e "${GREEN}  ✓ Docker Compose found (${COMPOSE_CMD})${NC}"

# ── Step 2: Environment setup ─────────────────────────────────────────────────
echo -e "${BLUE}[2/7] Setting up environment...${NC}"
cd "$ROOT_DIR"

if [ ! -f "backend/.env.docker" ]; then
  echo -e "${RED}ERROR: backend/.env.docker not found.${NC}"
  echo "  Please create it from the template: backend/.env.docker"
  exit 1
fi

echo -e "${GREEN}  ✓ backend/.env.docker found${NC}"

# ── Step 3: Clean (optional) ─────────────────────────────────────────────────
if [ "$CLEAN" = true ]; then
  echo -e "${YELLOW}[3/7] Cleaning previous volumes and containers...${NC}"
  $COMPOSE_CMD down -v --remove-orphans 2>/dev/null || true
  echo -e "${GREEN}  ✓ Clean complete${NC}"
else
  echo -e "${BLUE}[3/7] Stopping existing containers (if any)...${NC}"
  $COMPOSE_CMD down --remove-orphans 2>/dev/null || true
  echo -e "${GREEN}  ✓ Done${NC}"
fi

# ── Step 4: Build Docker images ───────────────────────────────────────────────
echo -e "${BLUE}[4/7] Building Docker images (this may take 2-5 minutes)...${NC}"
$COMPOSE_CMD build --parallel
echo -e "${GREEN}  ✓ Images built successfully${NC}"

# ── Step 5: Start all services ────────────────────────────────────────────────
echo -e "${BLUE}[5/7] Starting all services...${NC}"
$COMPOSE_CMD up -d
echo -e "${GREEN}  ✓ Services started${NC}"

# ── Step 6: Wait for health ───────────────────────────────────────────────────
echo -e "${BLUE}[6/7] Waiting for services to be healthy...${NC}"

wait_healthy() {
  local service="$1"
  local max_wait="${2:-120}"
  local elapsed=0

  echo -n "  Waiting for $service"
  while [ $elapsed -lt $max_wait ]; do
    status=$($COMPOSE_CMD ps "$service" --format json 2>/dev/null | python3 -c "import sys,json; data=[json.loads(l) for l in sys.stdin if l.strip()]; print(data[0].get('Health','') if data else '')" 2>/dev/null || echo "")
    if [ "$status" = "healthy" ]; then
      echo -e " ${GREEN}✓ healthy${NC}"
      return 0
    fi
    echo -n "."
    sleep 3
    elapsed=$((elapsed + 3))
  done
  echo -e " ${RED}✗ timeout after ${max_wait}s${NC}"
  echo -e "${YELLOW}  TIP: Check logs with: ${COMPOSE_CMD} logs $service${NC}"
  return 1
}

wait_healthy "db" 60
wait_healthy "redis" 30
wait_healthy "backend" 120
echo -e "${GREEN}  ✓ All core services are healthy${NC}"

# ── Step 7: Seed demo data ────────────────────────────────────────────────────
if [ "$SEED" = true ]; then
  echo -e "${BLUE}[7/7] Seeding demo data...${NC}"

  # Create superuser if not exists
  $COMPOSE_CMD exec -T backend python manage.py shell -c "
from django.contrib.auth import get_user_model
import os
User = get_user_model()
email = os.environ.get('SUPER_ADMIN_EMAIL', 'admin@foryougym.com')
password = os.environ.get('SUPER_ADMIN_PASSWORD', 'Admin@123!')
if not User.objects.filter(email=email).exists():
    User.objects.create_superuser(email=email, password=password)
    print(f'Superuser created: {email}')
else:
    print(f'Superuser already exists: {email}')
" 2>/dev/null || echo -e "${YELLOW}  ⚠ Could not create superuser automatically${NC}"

  # Run seed command if it exists
  if $COMPOSE_CMD exec -T backend python manage.py help seed_demo_data &>/dev/null 2>&1; then
    $COMPOSE_CMD exec -T backend python manage.py seed_demo_data 2>/dev/null || \
      echo -e "${YELLOW}  ⚠ Demo seed command failed or already seeded${NC}"
    echo -e "${GREEN}  ✓ Demo data seeded${NC}"
  else
    echo -e "${YELLOW}  ⚠ seed_demo_data command not found — skipping${NC}"
  fi
else
  echo -e "${BLUE}[7/7] Skipping demo data (--no-seed)${NC}"
fi

# ── Final Summary ─────────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════╗"
echo "║         🎉 Setup Complete! System is LIVE.       ║"
echo "╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}Access the application:${NC}"
echo -e "  🌐 Frontend:        ${BOLD}http://localhost${NC}"
echo -e "  ⚙️  Backend API:     ${BOLD}http://localhost:8000/api/${NC}"
echo -e "  🏥 Health Check:    ${BOLD}http://localhost:8000/api/health/${NC}"
echo -e "  🔧 Django Admin:    ${BOLD}http://localhost:8000/admin/${NC}"
echo ""
echo -e "${CYAN}Demo credentials:${NC}"
echo -e "  Super Admin:  admin@foryougym.com  /  Admin@123!"
echo -e "  Gym Owner:    owner@fitzone.com    /  Owner@123!"
echo ""
echo -e "${CYAN}Useful commands:${NC}"
echo -e "  View logs:         ${BOLD}${COMPOSE_CMD} logs -f${NC}"
echo -e "  Run E2E tests:     ${BOLD}./scripts/run_tests.sh${NC}"
echo -e "  Stop all:          ${BOLD}${COMPOSE_CMD} down${NC}"
echo -e "  Shell into backend:${BOLD}${COMPOSE_CMD} exec backend bash${NC}"
echo ""
