from django.contrib import admin
from userauths.models import *

class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'full_name', 'email', 'phone']

class ProfileAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'about', 'gender', 'country']
    #list_editable = [ 'about', 'gender', 'country']
    search_fields = ['full_name', 'country']
    list_filter = ['date']

admin.site.register(User, UserAdmin)
admin.site.register(Profile, ProfileAdmin)
admin.site.register(Conversation)
admin.site.register(Message)


@admin.register(AdminRole)
class AdminRoleAdmin(admin.ModelAdmin):
    list_display  = ['name', 'can_manage_roles', 'can_process_payouts', 'can_approve_vendors', 'created_at']
    search_fields = ['name']


@admin.register(AdminProfile)
class AdminProfileAdmin(admin.ModelAdmin):
    list_display  = ['user', 'role', 'is_superadmin', 'is_active', 'created_at']
    list_filter   = ['is_superadmin', 'is_active', 'role']
    search_fields = ['user__email', 'user__full_name']
    raw_id_fields = ['user', 'created_by']