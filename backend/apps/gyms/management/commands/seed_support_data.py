"""
Management command: seed_support_data
Seeds default Support FAQ entries and role-based User Manuals.
"""
from django.core.management.base import BaseCommand
from core.models import SupportConfig, UserManual


DEFAULT_FAQS = [
    {
        "question": "How to login?",
        "answer": "Go to the login page, enter your email address and password, then click 'Login'. If you forgot your password, click the 'Support Center' link.",
        "role": "global",
    },
    {
        "question": "How to add members?",
        "answer": "Go to the 'Members' section from the sidebar. Click 'Add Member', fill in their name, email, phone, and membership plan, then click Save.",
        "role": "global",
    },
    {
        "question": "How to reset password?",
        "answer": "To reset your password, please contact your gym administrator who can update your account. Alternatively, use the 'Support Center' link on the login page.",
        "role": "global",
    },
    {
        "question": "How to use dashboard?",
        "answer": "The dashboard shows key statistics like total members, attendance today, and recent activity. Use the sidebar to navigate between Members, Attendance, and other sections.",
        "role": "global",
    },
    {
        "question": "How to mark attendance?",
        "answer": "Go to the 'Attendance' section. Search for the member by name or phone number, then click the check-in button to mark their attendance for today.",
        "role": "global",
    },
    {
        "question": "How to see payments?",
        "answer": "Navigate to the 'Payments' section in the sidebar. You can view payment history, status, and amounts for each member.",
        "role": "global",
    },
    {
        "question": "How to create a gym?",
        "answer": "As a Super Admin, go to your dashboard and click 'Create New Gym'. Fill in the gym name, URL identifier, and owner details, then click 'Create Gym'.",
        "role": "super_admin",
    },
    {
        "question": "How to copy gym URL?",
        "answer": "In the Super Admin dashboard, find the gym in the list and click the 'Copy URL' button next to it. The URL is automatically copied to your clipboard.",
        "role": "super_admin",
    },
    {
        "question": "How to configure gym features?",
        "answer": "Click the settings icon next to a gym in the Super Admin dashboard. You can enable or disable Email Login, Google Sign-In, and Notifications for that gym.",
        "role": "super_admin",
    },
]

DEFAULT_MANUALS = {
    "super_admin": {
        "title": "Super Admin User Manual",
        "content": [
            {
                "title": "Getting Started",
                "content": "Welcome to the Gym SaaS Super Admin panel. You have full control over all gyms, users, and platform settings."
            },
            {
                "title": "Creating a Gym",
                "content": "Click 'Create New Gym' on your dashboard. Enter the gym name, a unique URL identifier (subdomain), owner name, and owner email/password. Click 'Create Gym' to complete setup."
            },
            {
                "title": "Managing Gyms",
                "content": "Your dashboard shows all gyms with their status. You can copy the gym URL, copy the owner email, configure features, or enable/disable a gym using the action buttons."
            },
            {
                "title": "Configuring Features",
                "content": "Click the gear icon next to any gym to open its feature settings. Toggle Email Login, Google Sign-In, and Notifications on or off."
            },
            {
                "title": "Managing Manuals",
                "content": "In the 'User Manuals' section, you can edit the documentation for each role (Super Admin, Gym Owner, Staff, Member). Changes are saved as PDF files automatically."
            },
            {
                "title": "Support Chat",
                "content": "Go to Help Center to manage the support FAQ questions and answers. You can add, edit, or remove questions from the Support Config page."
            },
        ]
    },
    "owner": {
        "title": "Gym Owner User Manual",
        "content": [
            {
                "title": "Getting Started",
                "content": "Welcome! You manage your own gym. Your dashboard shows member stats, attendance, and recent activity."
            },
            {
                "title": "Adding Members",
                "content": "Click 'Members' in the sidebar, then click 'Add Member'. Enter the member's name, email, phone number, and select their membership plan. Click Save to finish."
            },
            {
                "title": "Managing Members",
                "content": "In the Members list, you can view all members, search by name, and click any member to edit their details or manage their subscription."
            },
            {
                "title": "Tracking Attendance",
                "content": "Go to the 'Attendance' section. Search for a member and click 'Check In' to mark their attendance. You can view daily and historical attendance records."
            },
            {
                "title": "Gym Branding",
                "content": "On your dashboard, scroll to the Branding section to upload a custom background image for your gym's login page. This gives members a branded experience."
            },
            {
                "title": "Need Help?",
                "content": "Click the Help Center link in the sidebar. You can view your user manual, download it as a PDF, and chat with support for quick answers."
            },
        ]
    },
    "staff": {
        "title": "Staff User Manual",
        "content": [
            {
                "title": "Your Role",
                "content": "As staff, you can manage daily gym operations including member check-ins and viewing member details."
            },
            {
                "title": "Marking Attendance",
                "content": "Go to 'Attendance' in the sidebar. Search for the member's name and click 'Check In' to record their visit for the day."
            },
            {
                "title": "Viewing Members",
                "content": "The Members section shows all registered members. You can view their details and current membership status."
            },
            {
                "title": "Need Help?",
                "content": "Visit the Help Center from the sidebar. You can chat with support or download this guide as a PDF."
            },
        ]
    },
    "member": {
        "title": "Member User Manual",
        "content": [
            {
                "title": "Welcome",
                "content": "Welcome to the gym! This guide will help you use the member portal."
            },
            {
                "title": "Checking Your Status",
                "content": "Log in to see your membership status, including your plan and expiry date."
            },
            {
                "title": "Attendance History",
                "content": "You can view your attendance records in the Attendance section to track your gym visits."
            },
            {
                "title": "Need Help?",
                "content": "Click Help Center in the navigation. You can chat with support for quick answers to common questions."
            },
        ]
    },
}


class Command(BaseCommand):
    help = "Seeds default support FAQ entries and role-based user manuals."

    def handle(self, *args, **options):
        # Seed Support FAQs
        created_count = 0
        for faq in DEFAULT_FAQS:
            obj, created = SupportConfig.objects.get_or_create(
                question=faq["question"],
                defaults={"answer": faq["answer"], "role": faq["role"], "is_active": True}
            )
            if created:
                created_count += 1

        self.stdout.write(f"  ✓ {created_count} new FAQs seeded ({len(DEFAULT_FAQS) - created_count} already existed)")

        # Seed User Manuals
        manual_count = 0
        for role, data in DEFAULT_MANUALS.items():
            manual, created = UserManual.objects.get_or_create(
                role=role,
                defaults={"title": data["title"], "content": data["content"]}
            )
            if not created:
                # Update content if already exists
                manual.title = data["title"]
                manual.content = data["content"]
                manual.save()

            # Generate PDF
            try:
                from core.utils.manual_utils import generate_manual_pdf
                generate_manual_pdf(manual)
                manual_count += 1
                self.stdout.write(f"  ✓ Manual generated: {role}")
            except Exception as e:
                self.stdout.write(f"  ! Manual PDF error ({role}): {e}")

        self.stdout.write(self.style.SUCCESS(f"\nSeeding complete. {manual_count} manuals generated."))
