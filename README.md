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

### 🔹 Issue: Login 404 Error

**Root Cause:**
Frontend was calling incorrect API endpoint (`/api/auth/login/`) while the actual Django authentication endpoint was configured as `/api/token/`.

**Fix:**
Aligned frontend API mapping with the actual Django authentication endpoint by updating `AuthContext` and login forms to use `/api/token/`.

**Debugging Steps:**

* Checked Render logs (confirmed backend healthy and receiving requests).
* Verified endpoints manually by inspecting `backend/project/urls.py`.
* Inspected browser Network tab to identify the exact 404 URL mismatch.
* Corrected API mapping and hardcoded the production `API_BASE_URL`.

**Learning:**
Always verify backend routes and endpoint signatures before integrating frontend APIs to ensure production parity.

---

# 🎯 Outcome

- **Live SaaS App**: Fully functional and accessible on production domains.
- **Multi-tenant Ready**: Domain-based resolution works with fallback support.
- **Secure Auth**: JWT-based authentication implemented and verified end-to-end.

---
