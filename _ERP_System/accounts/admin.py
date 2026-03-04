from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Department


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'member_count', 'created_at')
    search_fields = ('name',)

    def member_count(self, obj):
        return obj.members.count()
    member_count.short_description = 'Membres'


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'department', 'reward_points')
    list_filter = ('role', 'department')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('ERP Info', {'fields': ('role', 'skills', 'avatar', 'department', 'reward_points')}),
    )
