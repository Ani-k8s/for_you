import os
import sys
import django
from pathlib import Path

# Setup Django environment
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))
sys.path.insert(0, str(BASE_DIR / 'apps'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings.production')
django.setup()

from django.core.management import call_command
from django.contrib.auth import get_user_model

User = get_user_model()

def reset_db():
    print("--- STARTING STRICT DATABASE RESET ---")
    
    # 1. Flush database
    print("Flushing database...")
    call_command('flush', '--noinput')
    
    # 2. Re-create Master Admin
    admin_email = os.environ.get("SUPER_ADMIN_EMAIL", "admin@gym.com")
    admin_pass = os.environ.get("SUPER_ADMIN_PASSWORD", "Admin@123")
    
    print(f"Creating Master Admin: {admin_email}")
    User.objects.create_superuser(
        email=admin_email,
        password=admin_pass,
        first_name="System",
        last_name="Administrator",
        role="super_admin"
    )
    
    print("--- RESET COMPLETE: SYSTEM IS CLEAN AND SECURE ---")
    print(f"Master Admin: {admin_email}")

if __name__ == "__main__":
    reset_db()
