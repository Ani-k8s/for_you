from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from gyms.models import Gym, GymRequest, GymFeatureConfig, Plan, Equipment, Announcement
from members.models import Member
from payments.models import Payment
from attendance.models import Attendance
from communication.models import ChatMessage
from notifications.models import Notification
from reminders.models import Reminder
from fitness.models import WorkoutPlan, DietPlan, MemberFitnessProfile

User = get_user_model()

class Command(BaseCommand):
    help = 'Resets all demo data for a clean multi-tenant SaaS demonstration'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('CAUTION: This will delete all demo data except SuperAdmins.'))
        
        # 1. Delete Operational Data
        self.stdout.write('Deleting Chat Messages...')
        ChatMessage.objects.all().delete()
        
        self.stdout.write('Deleting Notifications and Reminders...')
        Notification.objects.all().delete()
        Reminder.objects.all().delete()
        
        self.stdout.write('Deleting Payments and Attendance...')
        Payment.objects.all().delete()
        Attendance.objects.all().delete()
        
        self.stdout.write('Deleting Fitness Profiles and Plans...')
        MemberFitnessProfile.objects.all().delete()
        WorkoutPlan.objects.all().delete()
        DietPlan.objects.all().delete()
        
        # 2. Delete Member Data
        self.stdout.write('Deleting Members...')
        Member.objects.all().delete()
        
        # 3. Delete Gym Content
        self.stdout.write('Deleting Equipment, Plans, and Announcements...')
        Equipment.objects.all().delete()
        Plan.objects.all().delete()
        Announcement.objects.all().delete()
        
        # 4. Delete Gym Requests and Configs
        self.stdout.write('Deleting Gym Requests and Feature Configs...')
        GymRequest.objects.all().delete()
        GymFeatureConfig.objects.all().delete()
        
        # 5. Delete Non-SuperAdmin Users
        self.stdout.write('Deleting non-SuperAdmin users...')
        User.objects.exclude(role='super_admin').delete()
        
        # 6. Delete Gyms
        self.stdout.write('Deleting all Gyms...')
        Gym.objects.all().delete()

        self.stdout.write(self.style.SUCCESS('Successfully cleared all demo data. System ready for new onboarding.'))
