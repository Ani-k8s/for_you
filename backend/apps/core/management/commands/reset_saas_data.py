from django.core.management.base import BaseCommand
from django.db import transaction
from users.models import User
from gyms.models import Gym, Plan, GymRequest, GymFeatureConfig, Equipment, Announcement
from members.models import Member
from payments.models import Payment, PaymentLedger
from attendance.models import Attendance
from notifications.models import Notification
from reminders.models import Reminder
from core.models import SupportConfig
from communication.models import ChatMessage
from fitness.models import WorkoutPlan, DietPlan

class Command(BaseCommand):
    help = "Reset all SaaS data except for super admin users"

    def handle(self, *args, **options):
        self.stdout.write("Starting SaaS data reset...")
        
        try:
            with transaction.atomic():
                # Delete communication
                ChatMessage.objects.all().delete()
                
                # Delete fitness
                WorkoutPlan.objects.all().delete()
                DietPlan.objects.all().delete()
                
                # Delete Reminders & Notifications
                Reminder.objects.all().delete()
                Notification.objects.all().delete()
                
                # Delete Attendance
                Attendance.objects.all().delete()
                
                # Delete Payments & Ledgers
                Payment.objects.all().delete()
                PaymentLedger.objects.all().delete()
                
                # Delete Members
                Member.objects.all().delete()
                
                # Delete Equipment & Announcements
                Equipment.objects.all().delete()
                Announcement.objects.all().delete()
                
                # Delete Gym Plans
                Plan.objects.all().delete()
                
                # Delete GymRequests
                GymRequest.objects.all().delete()
                
                # Delete Support Configs
                SupportConfig.objects.all().delete()
                
                # Delete Users except super admins
                # We also need to clear gym references from Users before deleting Gyms if not using CASCADE properly
                users_deleted, _ = User.objects.exclude(role='super_admin').delete()
                
                # Delete Gyms
                gyms_deleted, _ = Gym.objects.all().delete()
                
                self.stdout.write(self.style.SUCCESS(f"SaaS data reset completed. Deleted {users_deleted} users and {gyms_deleted} gyms."))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error during reset: {str(e)}"))
