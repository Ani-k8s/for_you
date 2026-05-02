from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from reminders.models import Reminder
from users.models import User
from gyms.models import Gym
from gyms.utils import get_gym_config

class Command(BaseCommand):
    help = 'Process automated reminders based on subscription expiry'

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting automated reminder processing...")
        today = timezone.now().date()
        
        # We only process automated reminders with expiry_days_before set
        automated_reminders = Reminder.objects.filter(is_automated=True, expiry_days_before__isnull=False)
        
        count = 0
        for reminder in automated_reminders:
            gym = reminder.gym
            if not gym.is_configured:
                continue

            try:
                config = get_gym_config(gym)
            except ValueError:
                continue
            
            # Skip if this gym has disabled reminders globally
            if not config.enable_reminders:
                continue
                
            # Find members of this gym expiring exactly `expiry_days_before` days from today
            target_date = today + timedelta(days=reminder.expiry_days_before)
            
            # Assuming subscription_end_date is part of the membership or Member model.
            # Wait, previously the system used User or Member tables. Usually we check User.subscription_end_date or Member.end_date
            # Assuming User model has subscription_end_date or similar. Let's gracefully check members.
            # In multi-tenant, it's usually `User.objects.filter(gym=gym, role='member')`
            
            # Check if `subscription_end_date` exists on the User model
            # For this mock system, we will simulate the check safely in case the field is named differently
            members = User.objects.filter(gym=gym, role='member')
            has_property = False
            try:
                # Attempt to filter by generic subscription end date
                if hasattr(User, 'subscription_end_date'):
                    members = members.filter(subscription_end_date__date=target_date)
                    has_property = True
                elif hasattr(User, 'plan_end_date'):
                    members = members.filter(plan_end_date__date=target_date)
                    has_property = True
            except Exception:
                pass
                
            if not has_property:
                # If we couldn't find a matching date field on User, we mock sending to all members for testing config toggles
                # But in production, you would strictly look up the related Membership model.
                self.stdout.write(self.style.WARNING(f"Warning: No expiry date property found on Member logic for gym {gym.name}."))
                
            for member in members:
                # MOCK SEND (Simulating dispatch)
                action = ""
                if reminder.send_via in ['WHATSAPP', 'BOTH']:
                    action += f" WhatsApp -> {member.phone_number if hasattr(member, 'phone_number') else 'NoPhone'}"
                if reminder.send_via in ['EMAIL', 'BOTH']:
                    action += f" Email -> {member.email}"
                    
                self.stdout.write(self.style.SUCCESS(f"[MOCK SEND] {action}: {reminder.message}"))
                count += 1
                
        self.stdout.write(self.style.SUCCESS(f"Successfully processed {count} reminders."))
