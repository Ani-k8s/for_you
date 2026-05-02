from django.contrib import admin

from users.models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ["id", "email", "role", "gym", "is_verified", "is_staff", "is_active"]
    search_fields = ["email", "gym__subdomain"]
    list_filter = ["role", "is_active", "is_staff", "gym"]
