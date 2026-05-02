import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
django.setup()

from users.models import User

email = 'admin@gym.com'
password = 'Admin@123'

u, created = User.objects.get_or_create(
    email=email,
    defaults={
        'username': 'admin',
        'is_staff': True,
        'is_superuser': True,
    }
)
u.set_password(password)
u.is_staff = True
u.is_superuser = True
u.save()

if created:
    print(f"Superuser {email} created successfully.")
else:
    print(f"Superuser {email} updated successfully.")
