"""
core/middleware.py
==================
TenantSubdomainMiddleware — Resolves the active gym tenant from the request subdomain.

PERFORMANCE UPGRADE:
    Added an in-process TTL cache (60s) so subdomain→gym DB lookups are not
    repeated on every request from the same subdomain.

    In a multi-worker deployment, each worker process maintains its own cache.
    This is acceptable — a 60-second window of stale cache is a deliberate tradeoff
    for performance. For stricter consistency, replace with Django's cache framework:

        from django.core.cache import cache
        gym = cache.get(cache_key) or (DB lookup → cache.set(cache_key, gym, 60))

    The current solution requires no additional infrastructure (no Redis).

CACHE INVALIDATION:
    The cache automatically expires after TENANT_CACHE_TTL seconds.
    If a gym is deactivated, the worst-case window is TENANT_CACHE_TTL seconds.
    Set TENANT_CACHE_TTL=0 to disable caching (e.g., in admin-heavy environments).
"""

from __future__ import annotations

import logging
import time
from typing import Optional

from django.http import JsonResponse

from core.utils import extract_subdomain
from core.tenant import set_current_tenant

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# In-process tenant cache
# ---------------------------------------------------------------------------
# Maps subdomain → (gym_instance_or_None, expiry_timestamp)
# Thread safety: Python's GIL protects dict operations in CPython.
_TENANT_CACHE: dict[str, tuple] = {}
TENANT_CACHE_TTL: int = 60  # seconds — override via settings if needed


def _cache_get(subdomain: str):
    """Return cached gym (may be None for 'not found') or sentinel if expired."""
    entry = _TENANT_CACHE.get(subdomain)
    if entry is None:
        return ...  # cache miss (ellipsis as sentinel)
    gym, expires_at = entry
    if time.monotonic() > expires_at:
        del _TENANT_CACHE[subdomain]
        return ...  # expired
    return gym  # may be None (known-missing) or Gym instance


def _cache_set(subdomain: str, gym) -> None:
    """Store a gym (or None for not-found) in the cache."""
    _TENANT_CACHE[subdomain] = (gym, time.monotonic() + TENANT_CACHE_TTL)


def _resolve_gym(subdomain: str):
    """
    Resolve a Gym from subdomain. Checks cache first, falls back to DB.
    Caches both hits (gym found) and misses (gym not found → None).
    """
    cached = _cache_get(subdomain)
    if cached is not ...:
        return cached  # Cache hit (gym or None)

    # Cache miss — query DB
    try:
        from gyms.models import Gym
        gym = Gym.objects.filter(subdomain=subdomain, is_active=True).first()
    except Exception as exc:
        logger.error("Tenant DB lookup failed for subdomain=%s: %s", subdomain, exc)
        gym = None

    _cache_set(subdomain, gym)
    return gym


# ---------------------------------------------------------------------------
# Middleware
# ---------------------------------------------------------------------------

class TenantSubdomainMiddleware:
    """
    Sets request.tenant to the resolved Gym based on the request subdomain.

    - Main domain (localhost, yourdomain.com) → request.tenant = None (global)
    - Tenant subdomain (gym1.localhost) → request.tenant = Gym instance
    - Unknown/inactive subdomain → 404 JSON response
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        host = request.get_host()
        subdomain = extract_subdomain(host)

        if subdomain is None:
            # Main domain — global context (Super Admin, marketing site)
            request.tenant = None
            set_current_tenant(None)
            return self.get_response(request)

        # API health check — skip tenant resolution for monitoring
        if request.path.startswith("/api/health"):
            request.tenant = None
            return self.get_response(request)

        gym = _resolve_gym(subdomain)

        if gym is None:
            logger.warning(
                "Tenant not found for subdomain=%s | path=%s", subdomain, request.path
            )
            return JsonResponse(
                {
                    "error": "Gym not found",
                    "detail": f"No active gym found for subdomain '{subdomain}'.",
                    "subdomain": subdomain,
                },
                status=404,
            )

        request.tenant = gym
        set_current_tenant(gym)
        response = self.get_response(request)
        set_current_tenant(None)  # Always clear after request
        return response
