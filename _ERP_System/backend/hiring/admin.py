from django.contrib import admin
from .models import JobPosting, Application, Interview


@admin.register(JobPosting)
class JobPostingAdmin(admin.ModelAdmin):
    list_display = ('title', 'contract_type', 'status', 'deadline', 'application_count')
    list_filter = ('status', 'contract_type')


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'ai_score', 'status', 'created_at')
    list_filter = ('status',)


@admin.register(Interview)
class InterviewAdmin(admin.ModelAdmin):
    list_display = ('application', 'date', 'time', 'location')
