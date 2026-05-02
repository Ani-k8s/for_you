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

### 🔹 Issues Faced & Fixes (Production)

#### ❌ Issue: Login API returning 404
**Root Cause:**
Frontend was calling `/api/login` while the backend uses SimpleJWT, which expects `/api/token/` for generating JWT pairs.

**Fix:**
Updated the frontend API endpoint to `/api/token/` and verified the backend `urls.py` correctly maps this route to the `GlobalLoginView`.

**Learning:**
Understanding the specific endpoint requirements of the backend authentication library (SimpleJWT) is critical when integrating a decoupled frontend.

---

### 🔹 Authentication Flow

1. **User Input**: User enters email and password into the login form.
2. **Token Request**: Frontend sends a `POST` request to `https://for-you-1-bqij.onrender.com/api/token/`.
3. **JWT Generation**: Backend validates credentials and returns `access` and `refresh` tokens.
4. **Token Storage**: Frontend stores the `access` token in `localStorage` for session persistence.
5. **Authorized Requests**: Future API calls automatically include the `Authorization: Bearer <access_token>` header via an Axios interceptor.

---

### 🔹 Common Debugging Approach

1. **Render Logs**: Monitored the backend logs to verify that the server was receiving requests and identify 404 status codes on auth routes.
2. **Network Tab**: Used the browser's developer tools to inspect the exact URL being called by the frontend.
3. **Endpoint Verification**: Confirmed the backend `urls.py` configuration against the requested frontend path.
4. **Environment Check**: Verified that the production `API_BASE_URL` was correctly set to the live Render domain.

---

# 🎯 Outcome

- **Live SaaS App**: Fully functional and accessible on production domains.
- **Multi-tenant Ready**: Domain-based resolution works with fallback support.
- **Secure Auth**: JWT-based authentication implemented and verified end-to-end.

---
