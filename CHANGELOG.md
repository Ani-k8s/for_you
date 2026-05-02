# Changelog

All notable changes to the ForYou Gym SaaS project will be documented in this file.

## [1.0.0] - 2026-04-05
### Added
- Project restructuring for production readiness.
- Multi-app modular architecture in `backend/apps/`.
- Separate Dockerfiles for frontend and backend.
- root `docker-compose.yml` for orchestration.
- `Jenkinsfile` for CI/CD pipeline setup.
- Gym registration and approval system.
- Role-based access control (RBAC).
- Member dashboard and notifications.
- Attendance tracking and payment management.
- Subscription plans and automated reminders.
- Multi-tenant tenant resolution via subdomains.
