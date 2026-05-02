from django.contrib import admin

from notifications.models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["id", "title", "gym", "type", "is_read", "created_at"]
    search_fields = ["title", "gym__subdomain"]
    list_filter = ["type", "is_read", "gym"]
