from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone
from decimal import Decimal

from gyms.models import Gym, Plan, GymFeatureConfig
from members.models import Member
from users.models import User as GymUser

User = get_user_model()

class Command(BaseCommand):
    help = "Seeds the database with essential Demo V1 data for presentation."

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Starting Demo V1 Seeding..."))

        # 1. Create Super Admin
        admin_email = "admin@gym.com"
        admin_pass = "admin123"
        super_admin, created = User.objects.get_or_create(
            email=admin_email,
            defaults={
                "first_name": "Super",
                "last_name": "Admin",
                "role": GymUser.Roles.SUPER_ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "is_verified": True,
            }
        )
        if created or not super_admin.check_password(admin_pass):
            super_admin.set_password(admin_pass)
            super_admin.save()
            self.stdout.write(self.style.SUCCESS(f"SuperAdmin: {admin_email} / {admin_pass}"))

        # 2. Create Demo Gym
        gym_subdomain = "demo"
        gym_name = "Demo Fitness"
        gym, created = Gym.objects.get_or_create(
            subdomain=gym_subdomain,
            defaults={
                "name": gym_name,
                "is_active": True,
                "status": "approved",
                "is_approved": True,
            }
        )
        if created:
            self.stdout.write(self.style.SUCCESS(f"Gym Created: {gym_name} ({gym_subdomain}.localhost)"))
        
        # Ensure feature config exists
        GymFeatureConfig.objects.get_or_create(
            gym=gym,
            defaults={
                "enable_email_login": True,
                "enable_reminders": True,
                "enable_google_auth": False,
            }
        )

        # 3. Create Plans for the Gym
        basic_plan, _ = Plan.all_objects.get_or_create(
            gym=gym,
            name="Basic Monthly",
            defaults={"price": Decimal("29.99"), "duration_days": 30}
        )
        elite_plan, _ = Plan.all_objects.get_or_create(
            gym=gym,
            name="Elite Annual",
            defaults={"price": Decimal("299.99"), "duration_days": 365}
        )

        # 4. Create Gym Owner
        owner_email = "owner@gym.com"
        owner, created = User.objects.get_or_create(
            email=owner_email,
            defaults={
                "first_name": "Demo",
                "last_name": "Owner",
                "role": GymUser.Roles.GYM_OWNER,
                "gym": gym,
                "is_verified": True,
            }
        )
        if created or not owner.check_password("owner123"):
            owner.set_password("owner123")
            owner.save()
            self.stdout.write(self.style.SUCCESS(f"Owner: {owner_email} / owner123"))

        # 5. Create Trainer
        trainer_email = "trainer@gym.com"
        trainer, created = User.objects.get_or_create(
            email=trainer_email,
            defaults={
                "first_name": "Alex",
                "last_name": "Trainer",
                "role": GymUser.Roles.STAFF,
                "gym": gym,
                "is_verified": True,
            }
        )
        if created or not trainer.check_password("trainer123"):
            trainer.set_password("trainer123")
            trainer.save()
            self.stdout.write(self.style.SUCCESS(f"Trainer: {trainer_email} / trainer123"))

        # 6. Create Members
        members_data = [
            {"email": "member1@gym.com", "first": "John", "last": "Member", "plan": basic_plan},
            {"email": "member2@gym.com", "first": "Jane", "last": "Active", "plan": elite_plan},
        ]

        for m_data in members_data:
            m_user, created = User.objects.get_or_create(
                email=m_data["email"],
                defaults={
                    "first_name": m_data["first"],
                    "last_name": m_data["last"],
                    "role": GymUser.Roles.MEMBER,
                    "gym": gym,
                    "is_verified": True,
                }
            )
            if created or not m_user.check_password("member123"):
                m_user.set_password("member123")
                m_user.save()
            
            # Create Member record
            member_profile, _ = Member.all_objects.get_or_create(
                user=m_user,
                defaults={
                    "gym": gym,
                    "plan": m_data["plan"],
                    "is_active": True,
                    "start_date": timezone.now().date(),
                    "end_date": timezone.now().date() + timezone.timedelta(days=m_data["plan"].duration_days)
                }
            )
            self.stdout.write(self.style.SUCCESS(f"Member: {m_data['email']} / member123"))

        self.stdout.write(self.style.SUCCESS("Demo V1 Seeding Completed Successfully!"))
