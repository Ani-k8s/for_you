import json
from django.core.management.base import BaseCommand
from core.models import UserManual

SUPER_ADMIN_MANUAL = [
    {
        "title": "Welcome to the Super Admin Control Panel",
        "content": "As a Super Admin, you have full control over the entire SaaS platform. This manual will guide you through your responsibilities and tools available to manage the system effectively."
    },
    {
        "title": "Approving Gym Deployments",
        "content": "When a new gym registers, their account is placed in a pending state. You must navigate to the 'Pending Approvals' section to review their details. Once approved, the system automatically provisions their dedicated portal and sub-domain."
    },
    {
        "title": "Platform Analytics",
        "content": "The Super Admin dashboard provides a bird's-eye view of all registered gyms, their active members, and overall system health. Use these metrics to track platform growth."
    },
    {
        "title": "Tenant Feature Configuration",
        "content": "You can manage features specifically for each gym from your distribution dashboard. This allows for tailored experiences across different tenants without globally affecting others."
    }
]

GYM_OWNER_MANUAL = [
    {
        "title": "Welcome to Your Gym Dashboard",
        "content": "As a Gym Owner, this platform is your central hub for managing your facility. You have access to member management, trainer assignment, and automated communications."
    },
    {
        "title": "Managing Members",
        "content": "The 'Members' tab allows you to view your entire client base. You can add new members manually, update their subscription status, and view their attendance history. Ensure their email addresses are correct so they can log in."
    },
    {
        "title": "Attendance Tracking",
        "content": "Keep track of who is visiting your gym. Staff can log attendance via the 'Attendance' portal. You can view daily reports to optimize your peak hours."
    },
    {
        "title": "Automated Reminders",
        "content": "Use the 'Reminders' module to send WhatsApp or Email notifications to members. You can schedule these for class updates, payment reminders, or general announcements. (Note: This feature must be enabled by the platform administrator)."
    }
]

STAFF_MANUAL = [
    {
        "title": "Welcome to the Staff Portal",
        "content": "As a Staff member or Trainer, your primary role is to ensure smooth day-to-day operations and assist members with their fitness journey."
    },
    {
        "title": "Logging Attendance",
        "content": "When members arrive, navigate to the 'Attendance' page to mark them as present. This helps the gym owner track facility usage and ensures members are staying consistent."
    },
    {
        "title": "Viewing Member Profiles",
        "content": "You can view basic member information to verify their active status. If a member has expired access, politely direct them to the front desk or the gym owner to renew."
    }
]

MEMBER_MANUAL = [
    {
        "title": "Welcome to Your Fitness Hub",
        "content": "This is your personal portal for managing your gym membership. Here you can track your progress and stay up to date with gym announcements."
    },
    {
        "title": "Your Profile & Subscription",
        "content": "Navigate to your profile area to see your current subscription status and expiration date. Keeping your profile information up to date ensures you don't miss important updates from your gym."
    },
    {
        "title": "Attendance & Classes",
        "content": "Every time you visit the gym, ensure you check in at the front desk. You can view your past attendance records from your dashboard to see how consistently you've been training!"
    }
]

class Command(BaseCommand):
    help = 'Seeds the database with role-based user manuals.'

    def handle(self, *args, **kwargs):
        manuals_data = [
            ('super_admin', 'Super Admin Guide', SUPER_ADMIN_MANUAL),
            ('owner', 'Gym Owner Guide', GYM_OWNER_MANUAL),
            ('staff', 'Staff & Trainer Guide', STAFF_MANUAL),
            ('member', 'Member Guide', MEMBER_MANUAL),
        ]

        created_count = 0
        updated_count = 0

        for role_id, title, sections in manuals_data:
            obj, created = UserManual.objects.update_or_create(
                role=role_id,
                defaults={
                    'title': title,
                    'content': sections
                }
            )
            
            # Generate the PDF file
            from core.utils.manual_utils import generate_manual_pdf
            try:
                generate_manual_pdf(obj)
            except Exception as e:
                self.stderr.write(self.style.ERROR(f"Failed to generate PDF for {role_id}: {str(e)}"))

            if created:
                created_count += 1
            else:
                updated_count += 1
                
        self.stdout.write(self.style.SUCCESS(f'Successfully seeded manuals and generated PDFs: {created_count} created, {updated_count} updated.'))
