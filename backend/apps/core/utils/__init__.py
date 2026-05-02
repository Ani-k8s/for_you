from __future__ import annotations

from typing import Optional


def extract_subdomain(host: str) -> Optional[str]:
    """
    Extract the first subdomain label from a request host.

    Examples:
    - gym1.localhost -> gym1
    - gym2.localhost:8000 -> gym2
    - localhost:8000 -> None
    """
    host = host.split(":")[0].strip().lower()
    parts = host.split(".")
    
    # 3+ parts: gym1.domain.com -> gym1
    if len(parts) >= 3:
        return parts[0]
    
    # 2 parts with internal/dev suffixes: gym1.localhost, gym1.foryou -> gym1
    if len(parts) == 2 and parts[1] in ["localhost", "foryou", "local"]:
        return parts[0]
        
    return None


def get_request_tenant_gym(request) -> Optional[object]:
    """
    Return the resolved tenant gym stored by TenantSubdomainMiddleware.
    """
    return getattr(request, "tenant", None)


def user_has_matching_tenant(request, user_gym) -> bool:
    """
    Enforce subdomain isolation:
    - super_admin may use any subdomain
    - non-super_admin must match the tenant gym if the middleware resolved one.
    """
    if user_gym is None:
        # Super admin (gym is nullable for super_admin users).
        return True
    tenant_gym = get_request_tenant_gym(request)
    if tenant_gym is None:
        # No subdomain resolved (e.g. localhost without gym1.localhost).
        return True
    return getattr(tenant_gym, "id", None) == getattr(user_gym, "id", None)
