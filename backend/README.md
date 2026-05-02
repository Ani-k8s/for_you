# foryou_saas (Gym SaaS MVP)

Backend only (Django + DRF + PostgreSQL) with:
- JWT auth (`/api/auth/login`)
- Role-based access control
- Subdomain tenant scoping (e.g. `gym1.localhost`, `gym2.localhost`)
- React frontend in `/frontend` (Vite + Tailwind)

## Quick start

1. Create a virtual environment (optional).
2. Install dependencies:
   - `pip install -r requirements.txt`
3. Configure environment:
   - Copy `.env.example` to `.env`
4. Apply migrations:
   - `python manage.py migrate`
5. Create a super admin user:
   - `python manage.py createsuperuser`
6. Run the server:
   - `python manage.py runserver`

## Local multi-tenant subdomains

For requests to resolve tenant gyms, set your hosts entry so `gym1.localhost` and `gym2.localhost`
point to `127.0.0.1`.

## Frontend (optional)

1. Install dependencies:
   - `cd frontend && npm install`
2. Start dev server:
   - `cd frontend && npm run dev`

Frontend calls the backend at `VITE_API_BASE_URL` (defaults to `http://localhost:8000`).

