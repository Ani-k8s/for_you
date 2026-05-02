from django.core.management.base import BaseCommand
from core.models import SupportConfig

class Command(BaseCommand):
    help = 'Seeds the database with initial Support Center FAQs.'

    def handle(self, *args, **kwargs):
        faqs = [
            {
                "question": "How to reset password?",
                "answer": "To reset your password, click the 'Forgot Password' link on the login page. You will receive an email with instructions to set a new one. If you are a member, your gym owner can also trigger a reset for you.",
                "role": "global"
            },
            {
                "question": "How to mark attendance?",
                "answer": "Navigate to the 'Access Logs' or 'Attendance' section. Search for the member by name or email, then click the check-in button. The system will log the timestamp and verify their active subscription.",
                "role": "staff"
            },
            {
                "question": "How to manage members?",
                "answer": "Go to the 'Member Database' section. Here you can add new members by clicking 'Add Member', or edit existing ones. You can update their gym plans, contact info, and view their attendance history.",
                "role": "owner"
            },
            {
                "question": "How to check payments?",
                "answer": "Owners can view the 'Payments' dashboard to track revenue and pending dues. For individual members, visit their profile in the Member Database to see specific transaction history.",
                "role": "owner"
            },
            {
                "question": "How can I see my progress?",
                "answer": "As a member, your dashboard shows your recent attendance and active plan details. For more specific workout progress, please consult with your gym's trainer.",
                "role": "member"
            }
        ]

        created_count = 0
        for faq in faqs:
            obj, created = SupportConfig.objects.get_or_create(
                question=faq['question'],
                defaults={
                    'answer': faq['answer'],
                    'role': faq['role'],
                    'is_active': True
                }
            )
            if created:
                created_count += 1
        
        self.stdout.write(self.style.SUCCESS(f'Successfully seeded {created_count} Support FAQs.'))
