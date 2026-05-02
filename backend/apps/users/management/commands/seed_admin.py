from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Seeds the default super admin user and default gym if they do not exist'

    def handle(self, *args, **options):
        from gyms.models import Gym
        
        # 1. Create Default Gym (for Render compatibility)
        # We use the Render subdomain provided in the issue report
        gym_subdomain = 'for-you-1-bqij'
        gym, created = Gym.objects.get_or_create(
            subdomain=gym_subdomain,
            defaults={
                'name': 'ForYou Elite Gym',
                'is_active': True,
                'is_approved': True
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f'Created default gym: {gym.name} ({gym_subdomain})'))
        else:
            self.stdout.write(f'Gym {gym_subdomain} already exists.')

        # 2. Create Super Admin
        email = 'admin@gym.com'
        password = 'Admin@123'

        if not User.objects.filter(email=email).exists():
            self.stdout.write(f'Creating superuser: {email}')
            User.objects.create_superuser(
                email=email,
                password=password,
                first_name='System',
                last_name='Admin',
                gym=gym # Associate with the default gym
            )
            self.stdout.write(self.style.SUCCESS(f'Successfully created superuser: {email}'))
        else:
            self.stdout.write(f'Superuser {email} already exists.')
