"""
Migration: Add enable_email and enable_whatsapp to GymFeatureConfig.

Both fields have defaults so this is a zero-downtime migration.
All existing rows get:
  - enable_email = True   (safe default — continues sending as before)
  - enable_whatsapp = False (safe default — disabled until explicitly enabled)
"""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gyms', '0018_gym_status_alter_gym_is_active'),
    ]

    operations = [
        migrations.AddField(
            model_name='gymfeatureconfig',
            name='enable_email',
            field=models.BooleanField(
                default=True,
                help_text='Enable outbound email notifications for this gym (welcome, reminders, broadcasts).',
            ),
        ),
        migrations.AddField(
            model_name='gymfeatureconfig',
            name='enable_whatsapp',
            field=models.BooleanField(
                default=False,
                help_text='Enable WhatsApp notifications for this gym. Requires global WHATSAPP_PROVIDER config.',
            ),
        ),
    ]
