# 777c8 ELITE: Non-Technical Test Guide

Welcome! This guide will help you run and test the Gym SaaS platform on your computer in just a few minutes. No coding knowledge required!

---

## 1. Things You Need
Before we start, make sure you have these installed:
* **Node.js**: [Download here](https://nodejs.org/)
* **Python**: [Download here](https://www.python.org/)
* **PostgreSQL**: [Download here](https://www.postgresql.org/)
* **Visual Studio Code**: [Download here](https://code.visualstudio.com/)

---

## 2. Setting Up the Project

1. Open the project folder in **Visual Studio Code**.
2. Open the **Terminal** in VS Code (Top menu: `Terminal` -> `New Terminal`).

### A. Start the Backend (The Brain)
In the terminal, type these commands one by one:
```powershell
# 1. Install Python packages
pip install -r requirements.txt

# 2. Prepare the database
python manage.py migrate

# 3. Start the server
python manage.py runserver
```
*Keep this terminal open!*

### B. Start the Frontend (The Visuals)
Open a **second terminal** (plus icon in terminal header) and type:
```powershell
cd frontend
npm install
npm run dev
```
*Keep this terminal open too!*

---

## 3. How to Test (Step-by-Step)

### Step 1: Clean Reset
If you want to start with a fresh system (no old data), run this in the first terminal:
```powershell
python manage.py reset_saas_data
```

### Step 2: Login as Super Admin
1. Open your browser to: `http://localhost:5173`
2. Login with these details:
   - **Email**: `operator@777c8.net`
   - **Password**: `operator777`

### Step 3: Create Your First Gym
1. You will see a dashboard that says "No gyms created yet".
2. Click the **"Initialize New Tenant"** button.
3. Fill in the **Gym Name** (e.g., "Elite Fitness").
4. Leave **Subdomain** empty (it will auto-calculate).
5. Fill in the **Owner Name** and **Owner Email**.
6. Click **"Deploy Tenant"**.

### Step 4: Share & Access the Gym
1. In the list of gyms, you will see your new gym.
2. Click the **"URL"** button to copy the link.
3. Click the **"Email"** button to copy the owner's email.
4. Open a **new tab** or **Incognito window** and paste the URL.
5. Login using the **Owner Email** and the password you set.

### Step 5: Explore
* Navigate the Owner Dashboard.
* Check the **User Manuals** in the sidebar.
* Try the **Support Center** chat bot.

---

## 4. Troubleshooting
* **Error message in browser?** Make sure both terminals are running.
* **Can't login?** Double check the email and password or run the "Clean Reset" command.
* **Still stuck?** Close VS Code and try restarting both servers.

---
**Enjoy testing the 777c8 ELITE Infrastructure!**
