# 🛠 ForYou Gym SaaS Maintenance Guide

This document outlines the standard procedures for managing dependencies and environments for the ForYou Gym SaaS project to ensure production stability and reproducibility.

---

## 1. Environment Isolation (Python)

Always use a virtual environment (`venv`) to avoid dependency conflicts.

### Setup (Initial)
```powershell
# Windows
python -m venv .venv
.\.venv\Scripts\activate

# Unix/macOS
python3 -m venv .venv
source .venv/bin/activate
```

### Installation
```bash
pip install -r backend/requirements.txt
```

---

## 2. Dependency Management Strategy

### Part A: Strict Version Pinning
All packages in `requirements.txt` and `package.json` are **exactly pinned** (e.g., `Django==5.2` rather than `Django>=5.0`). 
- **NO LOOSE VERSIONS**: Avoid `^`, `~`, or `>=`.
- **LTS PREFERRED**: Use Long-Term Support versions for core framework stability.

### Part B: Lock Files
- **Backend**: `requirements-lock.txt` is generated via `pip freeze` and contains the full recursive tree of installed packages.
- **Frontend**: `package-lock.json` is automatically managed by `npm`.

To regenerate the backend lock file:
```bash
pip freeze > backend/requirements-lock.txt
```

---

## 3. Safe Upgrade Strategy (Rules)

To maintain a production-ready system, follow these rules for upgrades:

1.  **DO NOT auto-upgrade**: Never run `pip install --upgrade` on all packages without testing.
2.  **One by One**: Upgrade one package at a time.
3.  **Test Environment**: Always perform upgrades in a separate feature branch first.
4.  **Audit for Warnings**: Run the system (e.g., `python manage.py check`) and watch for deprecation warnings (e.g., `RequestsDependencyWarning`).
5.  **Re-lock**: Immediately regenerate `requirements-lock.txt` after a successful, tested upgrade.

---

## 4. Frontend Stability

The frontend dependencies in `frontend/package.json` are also locked to exact versions. When adding new packages, use:
```bash
npm install <package-name> --save-exact
```

---

## 5. Development Infrastructure

### VS Code Integration
The project is configured via `.vscode/settings.json` and `.vscode/launch.json` to automatically use the correct `.venv` interpreter and established paths. 
- Use the **"Django: Run Server"** launch configuration for debugging.
- Use the **"Full Stack: Setup All"** task to quickly prepare both environments.
