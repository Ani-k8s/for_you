#!/usr/bin/env bash
# =============================================================================
# ForYou Gym SaaS — E2E Test Runner (Self-Heal Loop)
# =============================================================================
# USAGE:
#   ./scripts/run_tests.sh                 — Run all E2E tests
#   ./scripts/run_tests.sh --docker        — Run via Docker container
#   ./scripts/run_tests.sh --unit-only     — Run unit tests only
#   ./scripts/run_tests.sh --e2e-only      — Run E2E tests only
#   ./scripts/run_tests.sh --fail-fast     — Stop on first failure
#   SELF_HEAL=true ./scripts/run_tests.sh  — Self-heal loop (re-run on failure)
#
# EXIT CODES:
#   0 — All tests passed
#   1 — Test failures detected
#   2 — Setup error (missing dependencies)
# =============================================================================

set -euo pipefail

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Script directory ─────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"

# ── Options ───────────────────────────────────────────────────────────────────
USE_DOCKER=false
UNIT_ONLY=false
E2E_ONLY=false
FAIL_FAST=false
SELF_HEAL="${SELF_HEAL:-false}"
MAX_HEAL_ATTEMPTS=3

for arg in "$@"; do
  case $arg in
    --docker)     USE_DOCKER=true ;;
    --unit-only)  UNIT_ONLY=true ;;
    --e2e-only)   E2E_ONLY=true ;;
    --fail-fast)  FAIL_FAST=true ;;
    --self-heal)  SELF_HEAL=true ;;
    *)            echo -e "${YELLOW}Unknown option: $arg${NC}" ;;
  esac
done

# ── Banner ────────────────────────────────────────────────────────────────────
echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════════════════╗"
echo "  ║     ForYou Gym SaaS — E2E Test Runner            ║"
echo "  ║        Self-Healing Test Execution               ║"
echo "  ╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── Determine compose command ─────────────────────────────────────────────────
if docker compose version &>/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
else
  COMPOSE_CMD="docker-compose"
fi

# ── Build test command ────────────────────────────────────────────────────────
VERBOSITY=2
FAILFAST_FLAG=""
[ "$FAIL_FAST" = true ] && FAILFAST_FLAG="--failfast"

# Unit test targets
UNIT_TESTS="services members attendance reminders notifications gyms"

# E2E test targets (in dependency order)
E2E_TESTS=(
  "tests.e2e.test_gym_owner_onboarding"
  "tests.e2e.test_member_lifecycle"
  "tests.e2e.test_attendance_flow"
  "tests.e2e.test_notifications_flow"
  "tests.e2e.test_multi_tenant_isolation"
)

run_tests_local() {
  local exit_code=0

  if [ "$E2E_ONLY" = false ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}Running Unit + Integration Tests...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    cd "$BACKEND_DIR"
    python manage.py test $UNIT_TESTS \
      --verbosity=$VERBOSITY \
      $FAILFAST_FLAG \
      2>&1 | tee /tmp/unit_test_results.txt || exit_code=1
    echo ""
  fi

  if [ "$UNIT_ONLY" = false ]; then
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}Running E2E Tests (Real Gym Owner Simulation)...${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    for test_module in "${E2E_TESTS[@]}"; do
      echo -e "${CYAN}  ▶ Running: $test_module${NC}"
      cd "$BACKEND_DIR"
      python manage.py test "$test_module" \
        --verbosity=$VERBOSITY \
        $FAILFAST_FLAG \
        2>&1 | tee -a /tmp/e2e_test_results.txt || exit_code=1
      echo ""
    done
  fi

  return $exit_code
}

run_tests_docker() {
  local exit_code=0

  echo -e "${BLUE}Running tests inside Docker container...${NC}"

  if [ "$E2E_ONLY" = false ]; then
    echo -e "${BOLD}Unit + Integration Tests (Docker)...${NC}"
    $COMPOSE_CMD exec -T backend python manage.py test $UNIT_TESTS \
      --verbosity=$VERBOSITY $FAILFAST_FLAG || exit_code=1
  fi

  if [ "$UNIT_ONLY" = false ]; then
    echo -e "${BOLD}E2E Tests (Docker)...${NC}"
    for test_module in "${E2E_TESTS[@]}"; do
      echo -e "${CYAN}  ▶ $test_module${NC}"
      $COMPOSE_CMD exec -T backend python manage.py test "$test_module" \
        --verbosity=$VERBOSITY $FAILFAST_FLAG || exit_code=1
    done
  fi

  return $exit_code
}

# ── Self-Heal Loop ────────────────────────────────────────────────────────────
attempt=1
final_exit_code=0

while true; do
  echo -e "${BOLD}Test Run — Attempt ${attempt}/${MAX_HEAL_ATTEMPTS}${NC}"
  echo -e "$(date '+%Y-%m-%d %H:%M:%S')"
  echo ""

  run_exit_code=0
  if [ "$USE_DOCKER" = true ]; then
    run_tests_docker || run_exit_code=$?
  else
    run_tests_local || run_exit_code=$?
  fi

  if [ $run_exit_code -eq 0 ]; then
    echo ""
    echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════════╗"
    echo "║       ✅ ALL TESTS PASSED — ZERO FAILURES         ║"
    echo "║       System is production-ready!                 ║"
    echo "╚══════════════════════════════════════════════════╝${NC}"
    echo ""
    final_exit_code=0
    break
  else
    echo ""
    echo -e "${RED}${BOLD}╔══════════════════════════════════════════════════╗"
    echo "║       ❌ TESTS FAILED (Attempt ${attempt}/${MAX_HEAL_ATTEMPTS})           ║"
    echo "╚══════════════════════════════════════════════════╝${NC}"
    echo ""

    if [ "$SELF_HEAL" = false ] || [ $attempt -ge $MAX_HEAL_ATTEMPTS ]; then
      echo -e "${RED}Test failures detected. Check logs above for details.${NC}"
      echo ""
      echo -e "${YELLOW}Debugging tips:${NC}"
      echo "  View backend logs:  ${BOLD}${COMPOSE_CMD} logs backend${NC}"
      echo "  Shell into backend: ${BOLD}${COMPOSE_CMD} exec backend bash${NC}"
      echo "  Run specific test:  ${BOLD}cd backend && python manage.py test tests.e2e.test_gym_owner_onboarding -v2${NC}"
      final_exit_code=1
      break
    else
      echo -e "${YELLOW}Self-heal mode: Restarting backend and retrying...${NC}"
      if [ "$USE_DOCKER" = true ]; then
        $COMPOSE_CMD restart backend 2>/dev/null || true
        sleep 15
      fi
      attempt=$((attempt + 1))
    fi
  fi
done

# ── Test Report Summary ───────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}Test Summary:${NC}"
echo "  Attempts:  $attempt"
echo "  Final:     $([ $final_exit_code -eq 0 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
echo ""

exit $final_exit_code
