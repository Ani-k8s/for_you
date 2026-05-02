"""
ForYou Gym SaaS — E2E Test Suite
=================================
Organized test structure for production-grade end-to-end testing.

Structure:
    backend/tests/e2e/
    ├── __init__.py
    ├── fixtures/
    │   ├── __init__.py
    │   └── factory.py       ← All DB object factories
    ├── utils/
    │   ├── __init__.py
    │   ├── assertions.py    ← Custom assertion helpers
    │   └── simulators.py    ← Workflow simulation helpers
    ├── test_gym_owner_onboarding.py
    ├── test_member_lifecycle.py
    ├── test_attendance_flow.py
    ├── test_notifications_flow.py
    └── test_multi_tenant_isolation.py

Run all E2E tests:
    python manage.py test tests.e2e --verbosity=2

Run a specific file:
    python manage.py test tests.e2e.test_gym_owner_onboarding --verbosity=2
"""
