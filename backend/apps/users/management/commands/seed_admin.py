from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the default super admin user if it does not exist'

    def handle(self, *args, **options):
        email = 'admin@gym.com'
        password = 'Admin@123'

        if not User.objects.filter(email=email).exists():
            self.stdout.write(f'Creating superuser: {email}')
            User.objects.create_superuser(
                email=email,
                password=password,
                first_name='System',
                last_name='Admin'
            )
            self.stdout.write(self.style.SUCCESS(f'Successfully created superuser: {email}'))
        else:
            self.stdout.write(f'Superuser {email} already exists.')
