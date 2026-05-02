"""
Migration: Add NotificationLog table.

New table — no existing data touched. Zero-downtime migration.

Table design:
- Extends BaseModel (UUID pk, created_at, updated_at, is_active)
- idempotency_key: unique SHA-256 to prevent duplicate notifications
- Two composite indexes for audit queries by gym+event and gym+channel+date
"""
import django.db.models.deletion
import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('gyms', '0019_gymfeatureconfig_enable_email_whatsapp'),
        ('members', '0002_initial'),
        ('notifications', '0002_notification_member'),
        ('users', '0003_user_phone'),
    ]

    operations = [
        migrations.CreateModel(
            name='NotificationLog',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_active', models.BooleanField(default=True)),
                ('channel', models.CharField(
                    choices=[('email', 'Email'), ('whatsapp', 'WhatsApp')],
                    max_length=20,
                )),
                ('event_type', models.CharField(
                    choices=[
                        ('member_welcome', 'Member Welcome'),
                        ('member_deactivated', 'Member Deactivated'),
                        ('owner_welcome', 'Owner Welcome'),
                        ('expiry_reminder', 'Expiry Reminder'),
                        ('membership_renewed', 'Membership Renewed'),
                        ('attendance_confirmation', 'Attendance Confirmation'),
                        ('admin_broadcast', 'Admin Broadcast'),
                    ],
                    max_length=50,
                )),
                ('recipient', models.CharField(
                    help_text='Email address or phone number',
                    max_length=255,
                )),
                ('status', models.CharField(
                    choices=[
                        ('sent', 'Sent'),
                        ('failed', 'Failed'),
                        ('skipped', 'Skipped (Duplicate/Disabled)'),
                    ],
                    default='failed',
                    max_length=20,
                )),
                ('provider', models.CharField(
                    blank=True,
                    help_text='smtp / twilio / stub',
                    max_length=50,
                )),
                ('error_message', models.TextField(blank=True)),
                ('idempotency_key', models.CharField(
                    db_index=True,
                    help_text='SHA-256(gym_id:channel:event_type:member_id:date)',
                    max_length=64,
                    unique=True,
                )),
                ('gym', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notification_logs',
                    to='gyms.gym',
                )),
                ('member', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='notification_logs',
                    to='members.member',
                )),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='notificationlog',
            index=models.Index(
                fields=['gym', 'event_type', 'status'],
                name='notif_log_gym_event_status_idx',
            ),
        ),
        migrations.AddIndex(
            model_name='notificationlog',
            index=models.Index(
                fields=['gym', 'channel', 'created_at'],
                name='notif_log_gym_channel_date_idx',
            ),
        ),
    ]
