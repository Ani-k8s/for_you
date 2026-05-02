#!/bin/sh
# =============================================================================
# ForYou Gym SaaS — Docker Entrypoint
# =============================================================================
# Responsibilities:
#   1. Wait for PostgreSQL to be ready (handles cold-start race condition)
#   2. Run migrations (idempotent — safe to run on every container start)
#   3. Collect static files (for WhiteNoise to serve)
#   4. Start gunicorn with production-safe settings
#
# Usage: CMD ["/app/entrypoint.sh"] in Dockerfile
# =============================================================================

set -e

# ---------------------------------------------------------------------------
# 1. Database Check
# ---------------------------------------------------------------------------
echo "[entrypoint] Preparing for production..."

# ---------------------------------------------------------------------------
# 2. Run migrations & seed data
# ---------------------------------------------------------------------------
echo "[entrypoint] Running database migrations..."
python manage.py migrate --noinput

echo "[entrypoint] Seeding default admin user..."
python manage.py seed_admin


# ---------------------------------------------------------------------------
# 3. Collect static files (WhiteNoise requires this in production)
# ---------------------------------------------------------------------------
echo "[entrypoint] Collecting static files..."
python manage.py collectstatic --noinput --clear

# ---------------------------------------------------------------------------
# 4. Start gunicorn
# ---------------------------------------------------------------------------
WORKERS="${GUNICORN_WORKERS:-4}"
TIMEOUT="${GUNICORN_TIMEOUT:-120}"
BIND="${GUNICORN_BIND:-0.0.0.0:8000}"

echo "[entrypoint] Starting gunicorn | workers=${WORKERS} | bind=${BIND}"
exec gunicorn project.wsgi:application \
  --bind "${BIND}" \
  --workers "${WORKERS}" \
  --timeout "${TIMEOUT}" \
  --access-logfile - \
  --error-logfile - \
  --log-level info
