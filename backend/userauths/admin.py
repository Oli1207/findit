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
