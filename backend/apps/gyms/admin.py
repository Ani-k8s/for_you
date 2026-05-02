from django.contrib import admin

from gyms.models import Gym, Plan


@admin.register(Gym)
class GymAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "subdomain", "is_active", "created_at"]
    search_fields = ["name", "subdomain"]
    list_filter = ["is_active", "created_at"]


@admin.register(Plan)
class PlanAdmin(admin.ModelAdmin):
    list_display = ["id", "name", "gym", "price", "duration_days"]
    search_fields = ["name", "gym__subdomain"]
    list_filter = ["duration_days"]
