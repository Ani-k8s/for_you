from django.contrib import admin

from attendance.models import Attendance


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ["id", "gym", "member", "date", "check_in", "check_out", "is_active"]
    search_fields = ["member__user__email", "gym__subdomain", "date"]
    list_filter = ["gym", "date"]
