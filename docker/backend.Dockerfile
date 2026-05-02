# =============================================================================
# ForYou Gym SaaS — Backend Dockerfile (Multi-Stage)
# =============================================================================
# Stage 1: builder  — install build tools + compile Python wheels
# Stage 2: runtime  — lean production image (no gcc, no libpq-dev headers)
#
# Benefits:
#   - Final image ~50% smaller (build deps not included)
#   - Better layer caching (deps layer cached until requirements.txt changes)
#   - Reduced attack surface (no compiler toolchain in prod)
# =============================================================================

# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

# Build-time args (labels only — not exposed in runtime)
ARG BUILD_DATE=unknown
ARG GIT_SHA=unknown

# Environment: no .pyc files, unbuffered stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /build

# Install build-time system dependencies
# libpq-dev + gcc: needed to compile psycopg2 (even binary needs headers on some archs)
# We only need these in the builder stage
RUN echo 'Acquire::ForceIPv4 "true";' > /etc/apt/apt.conf.d/99force-ipv4 && \
    apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first — maximises Docker layer cache hits
COPY requirements.txt .

# Build wheels into /wheels — these are copied to the runtime stage
RUN pip install --upgrade pip \
    && pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt


# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Build args carried from builder (for OCI labels)
ARG BUILD_DATE=unknown
ARG GIT_SHA=unknown

# OCI image labels
LABEL org.opencontainers.image.title="ForYou Gym SaaS Backend" \
      org.opencontainers.image.description="Multi-tenant Gym SaaS — Django + DRF + Gunicorn" \
      org.opencontainers.image.created="${BUILD_DATE}" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.vendor="ForYou Gym SaaS"

# Runtime environment
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONFAULTHANDLER=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Runtime-only system dependencies:
#   libpq5       — PostgreSQL client library (psycopg2 runtime dependency)
#   postgresql-client — pg_isready for entrypoint healthcheck
#   curl         — healthcheck in Docker / docker-compose
RUN echo 'Acquire::ForceIPv4 "true";' > /etc/apt/apt.conf.d/99force-ipv4 && \
    apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy pre-built wheels from builder stage and install (no compilation needed)
COPY --from=builder /wheels /wheels
RUN pip install --no-cache-dir --no-index --find-links=/wheels /wheels/* \
    && rm -rf /wheels

# Copy application code
COPY . .

# Make entrypoint executable
RUN chmod +x /app/entrypoint.sh

# Create non-root user for security
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser \
    && chown -R appuser:appgroup /app

USER appuser

# Expose application port
EXPOSE 8000

# Docker-level healthcheck (Compose healthcheck overrides this, but useful standalone)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8000/api/health/ || exit 1

# Default command — entrypoint handles migrations + collectstatic + gunicorn
CMD ["/app/entrypoint.sh"]
