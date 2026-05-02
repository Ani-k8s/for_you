# ForYou Gym SaaS – Tactical Operation Manual

This document provides a complete high-fidelity workflow for managing, extending, and deploying the **ForYou** multi-tenant platform.

---

## 🏛️ System Architecture

- **Engine**: Django 5.2 (REST API)
- **Pulse**: React 18 (Vite + Tailwind + TypeScript)
- **Isolation**: Shared Database, Row-level multi-tenancy (Gym Model)
- **Authentication**: JWT (SimpleJWT) + Role Based Access Control (RBAC)

---

## 🚀 Rapid Development Setup

### 1. Backend Synchronization
```bash
cd backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser  # Create the prime authority
python manage.py runserver
```

### 2. Frontend Initialization
```bash
cd frontend
npm install
npm run dev
```

---

## 🛠️ Tactical Workflows

### A. Onboarding a New Gym (Tenant)
1. **Application**: New gyms apply via the public `/registration-link` portal.
2. **Approval**: SuperAdmin logs into `/dashboard/super-admin`, reviews the request, and clicks **Approve**.
3. **Automation**: The engine auto-creates the Gym instance, a primary Owner user, and sends a secure invitation email with a temporary password and subdomain access link.

### B. Managing Memberships & Payments
- **Auto-Ledger**: When a member is assigned a Plan, the system automatically generates a `PaymentLedger` entry.
- **Tracking**: Owners use the **Financial Ledger** page to mark payments as Paid or Partial.
- **Expiry**: The dashboard warns if members have expired plans or pending renewals.

### C. Internal Transmissions (Chat & Announcements)
- **Announcements**: Use the **Announcements** node to blast updates to Staff, Members, or Everyone.
- **Messenger**: A dedicated **Internal Transmissions** channel allows direct communication between gym nodes (Staff-to-Owner, Member-to-Staff).

---

## 🚢 Production Deployment (Render)

This project is optimized for deployment on **Render**.

### 1. Database & Infrastructure
- Provision a **PostgreSQL** instance on Render.
- Create a **Web Service** for the backend.
- Create a **Static Site** for the frontend.

### 2. Environment Variables
Ensure the following are set in your Render Web Service:
- `SECRET_KEY`: Long random string.
- `DATABASE_URL`: Your PostgreSQL connection string.
- `ALLOWED_HOSTS`: `*` or your specific domains.

### 3. Docker Deployment
Use the included `Dockerfile` for a unified containerized deployment:
```bash
docker-compose up --build
```

---

## 🛡️ Support Protocol
If you encounter a system anomaly or require a custom feature module, contact the **Elite Support Hub** via the support center link in the sidebar.
