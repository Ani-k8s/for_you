from django.contrib import admin

from members.models import Member


@admin.register(Member)
class MemberAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "gym", "plan", "start_date", "end_date", "is_active"]
    search_fields = ["user__email", "gym__subdomain"]
    list_filter = ["gym", "plan", "is_active"]
