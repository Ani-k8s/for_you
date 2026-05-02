from django.contrib import admin

from core.models import Documentation, UserManual, SupportConfig


@admin.register(Documentation)
class DocumentationAdmin(admin.ModelAdmin):
    list_display = ("title", "version", "updated_at", "is_active")
    search_fields = ("title",)

    def _is_super_admin(self, request) -> bool:
        return bool(request.user and request.user.is_authenticated and getattr(request.user, "role", None) == "super_admin")

    def has_add_permission(self, request):
        return self._is_super_admin(request)

    def has_change_permission(self, request, obj=None):
        return self._is_super_admin(request)

    def has_delete_permission(self, request, obj=None):
        return self._is_super_admin(request)

    def has_module_permission(self, request):
        return self._is_super_admin(request)

    def has_module_permission(self, request):
        return self._is_super_admin(request)

@admin.register(SupportConfig)
class SupportConfigAdmin(admin.ModelAdmin):
    list_display = ("keyword", "role", "is_active", "updated_at")
    list_filter = ("role", "is_active")
    search_fields = ("keyword", "response")

    def _is_super_admin(self, request) -> bool:
        return bool(request.user and request.user.is_authenticated and getattr(request.user, "role", None) == "super_admin")

    def has_add_permission(self, request):
        return self._is_super_admin(request)

    def has_change_permission(self, request, obj=None):
        return self._is_super_admin(request)

    def has_delete_permission(self, request, obj=None):
        return self._is_super_admin(request)

    def has_module_permission(self, request):
        return self._is_super_admin(request)
