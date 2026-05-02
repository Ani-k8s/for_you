# 🏋️ ForYou SaaS Platform — End-to-End Deployment Guide

## 📌 Overview

This project is a **multi-tenant Gym SaaS platform** built using:

- Backend: Django (REST APIs)
- Frontend: React + Vite
- Database: PostgreSQL
- Cache: Redis
- Deployment:
  - Frontend → Vercel
  - Backend → Render
- Containerization: Docker (local)
- Version Control: Git + GitHub

---

# 🧠 Architecture (High-Level)

User → Browser  
↓  
Frontend (Vercel - React)  
↓  
API Calls  
↓  
Backend (Render - Django)  
↓  
Database (Render PostgreSQL)  

---

# 🧩 Multi-Tenant Concept

This application follows **subdomain-based multi-tenancy**:

Example:

roaring.foryou.com → Gym: roaring  
elite.foryou.com → Gym: elite  

### How it works:

1. Extract subdomain from request:
for-you-1-bqij.onrender.com → subdomain = for-you-1-bqij  

2. Match in DB:
Gym.objects.filter(subdomain=subdomain)

3. Load tenant-specific data

---

# ⚙️ Tech Stack

| Layer | Technology |
|------|-----------|
| Frontend | React + Vite |
| Backend | Django |
| Database | PostgreSQL |
| Cache | Redis |
| Deployment | Vercel + Render |
| CI/CD | GitHub (auto deploy) |
| Container | Docker |

---

# 🚀 Step-by-Step Deployment Flow

## 🔹 Step 1: Local Development

docker-compose up --build

---

## 🔹 Step 2: Push Code to GitHub

git init  
git add .  
git commit -m "Initial commit"  
git push origin main  

---

## 🔹 Step 3: Deploy Frontend (Vercel)

- Import repo
- Set Root Directory = frontend
- Deploy

---

## 🔹 Step 4: Deploy Backend (Render)

- Root Directory = backend
- Build: pip install -r requirements.txt
- Start: sh entrypoint.sh

---

## 🔹 Step 5: Add Environment Variables

DATABASE_URL = postgres://...  
DEBUG = False  
SECRET_KEY = random-string  
ALLOWED_HOSTS = *  

---

## 🔹 Step 6: Database Config (Django)

import dj_database_url
import os

DATABASES = {
"default": dj_database_url.config(default=os.environ.get("DATABASE_URL"))
}

---

## 🔹 Step 7: Entry Point

#!/bin/sh
python manage.py migrate --noinput
python manage.py seed_admin || true
exec gunicorn project.wsgi:application --bind 0.0.0.0:8000

---

## 🔹 Step 8: Fix Multi-Tenant Issue

Gym.objects.get_or_create(
subdomain="for-you-1-bqij",
defaults={"name": "Default Gym", "is_active": True}
)

---

## 🔹 Step 9: Connect Frontend

export const API_BASE_URL = "https://for-you-1-bqij.onrender.com";

---

## 🔹 Step 10: Final Test

admin@gym.com  
Admin@123  

---

---

### 🔑 Key Issues Fixed in Production

#### 1. Authentication 404 (Login Error)
- **Problem**: Frontend was calling `/api/login/` but backend expects `/api/token/` (SimpleJWT).
- **Fix**: Updated `AuthContext.tsx` and `LoginForm.tsx` to use `/api/token/`.
- **Result**: Login works seamlessly with Render backend.

#### 2. API Connectivity
- **Problem**: Localhost fallback logic causing network errors in production.
- **Fix**: Hardcoded `https://for-you-1-bqij.onrender.com` in `client.ts` for production stability.

#### 3. TypeScript Build Readiness
- **Problem**: `tsc` build errors due to union type mismatches and missing imports.
- **Fix**: 
    - Standardized `Badge` and `Loader2` imports.
    - Added explicit type casting in `MembersPage.tsx`.
    - Added safety to `JSON.parse` in `SuperAdminDashboard.tsx`.
- **Result**: `npm run build` passes locally and on Vercel.

### 🛠️ Frontend Build Troubleshooting

If Vercel build fails:
1. Ensure `node_modules` is cleared and re-installed.
2. Run `npm run build` locally to catch TypeScript errors.
3. Check `lucide-react` version; ensure `Loader2` is available (standard in v0.284+).
4. Verify `vite.config.ts` has correct base path if not deploying to root.

### 🚀 Verification Flow
1. Visit `https://for-you-1-bqij.onrender.com/api/token/` (returns 405 Method Not Allowed - Correct).
2. Visit Vercel Frontend.
3. Login as Admin.
4. Verify Dashboard data loads from Render.

---

# 🎯 Outcome

- **Live SaaS App**: Fully functional and accessible on production domains.
- **Multi-tenant Ready**: Domain-based resolution works with fallback support.
- **Secure Auth**: JWT-based authentication implemented and verified end-to-end.

---
