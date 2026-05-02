"""
tests/e2e/test_multi_tenant.py
================================
Alias entry point for multi-tenant isolation tests.

Re-exports all test classes from test_multi_tenant_isolation.py.

Run:
    python manage.py test tests.e2e.test_multi_tenant --verbosity=2
"""

from tests.e2e.test_multi_tenant_isolation import (
    TestMemberQueryIsolation,
    TestAttendanceIsolation,
    TestNotificationLogIsolation,
    TestFeatureFlagIsolation,
    TestTenantCacheIsolation,
    TestConcurrentTenants,
)

__all__ = [
    "TestMemberQueryIsolation",
    "TestAttendanceIsolation",
    "TestNotificationLogIsolation",
    "TestFeatureFlagIsolation",
    "TestTenantCacheIsolation",
    "TestConcurrentTenants",
]
