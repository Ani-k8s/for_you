from rest_framework import serializers
from reminders.models import Reminder

class ReminderSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = Reminder
        fields = ['id', 'gym', 'message', 'send_via', 'is_automated', 'schedule_time', 'expiry_days_before', 'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['id', 'gym', 'created_by', 'created_at']
