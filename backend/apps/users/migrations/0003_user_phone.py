"""
Migration: Add phone field to User model.

Phone is used for WhatsApp notification delivery.
Optional (null=True, blank=True) — no impact on existing users.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_alter_user_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='phone',
            field=models.CharField(
                blank=True,
                help_text='E.164 format: +919876543210. Used for WhatsApp notifications.',
                max_length=20,
                null=True,
            ),
        ),
    ]
