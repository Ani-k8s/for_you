#!/bin/sh
# Simplified entrypoint for stabilization

set -e

echo "[entrypoint] Running database migrations..."
python manage.py migrate --noinput

echo "[entrypoint] Seeding default admin user..."
python manage.py seed_admin || echo "[entrypoint] Seed failed, skipping..."

echo "[entrypoint] Collecting static files..."
python manage.py collectstatic --noinput --clear

echo "[entrypoint] Starting gunicorn..."
exec gunicorn project.wsgi:application \
  --bind "0.0.0.0:8000" \
  --workers 4 \
  --timeout 120 \
  --access-logfile - \
  --error-logfile - \
  --log-level info
