"""
Management command: reset_demo_data
Purges all demo data while preserving super admin accounts.
"""
from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = "Deletes all demo data (gyms, users, members, configs, etc.) except super admins."

    def handle(self, *args, **options):
        with transaction.atomic():
            # Import here to avoid circular imports
            from gyms.models import Gym, GymFeatureConfig, GymRequest, Plan
            from members.models import Member
            from users.models import User
            from core.models import SupportConfig, UserManual

            # Delete in correct dependency order
            try:
                from attendance.models import Attendance
                Attendance.objects.all().delete()
                self.stdout.write("  ✓ Attendance cleared")
            except Exception as e:
                self.stdout.write(f"  ! Attendance skip: {e}")

            try:
                from notifications.models import Notification
                Notification.objects.all().delete()
                self.stdout.write("  ✓ Notifications cleared")
            except Exception as e:
                self.stdout.write(f"  ! Notifications skip: {e}")

            try:
                from payments.models import Payment
                Payment.objects.all().delete()
                self.stdout.write("  ✓ Payments cleared")
            except Exception as e:
                self.stdout.write(f"  ! Payments skip: {e}")

            try:
                from reminders.models import Reminder
                Reminder.objects.all().delete()
                self.stdout.write("  ✓ Reminders cleared")
            except Exception as e:
                self.stdout.write(f"  ! Reminders skip: {e}")

            Member.objects.all().delete()
            self.stdout.write("  ✓ Members cleared")

            GymFeatureConfig.objects.all().delete()
            self.stdout.write("  ✓ Gym configs cleared")

            GymRequest.objects.all().delete()
            self.stdout.write("  ✓ Gym requests cleared")

            Plan.objects.all().delete()
            self.stdout.write("  ✓ Plans cleared")

            Gym.objects.all().delete()
            self.stdout.write("  ✓ Gyms cleared")

            # Delete all users except super admins
            User.objects.exclude(role="super_admin").delete()
            self.stdout.write("  ✓ Non-super-admin users cleared")

        self.stdout.write(self.style.SUCCESS("\nDemo data reset successful"))
