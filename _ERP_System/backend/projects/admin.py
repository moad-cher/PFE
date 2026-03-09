from django.contrib import admin
from .models import Project, Task, TaskStatus, Comment, RewardLog, ProjectConfig


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'manager', 'start_date', 'end_date', 'progress')
    filter_horizontal = ('members',)


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'project', 'status', 'priority', 'deadline')
    list_filter = ('status', 'priority', 'project')
    filter_horizontal = ('assigned_to',)


@admin.register(TaskStatus)
class TaskStatusAdmin(admin.ModelAdmin):
    list_display = ('name', 'project', 'order', 'color')


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('task', 'author', 'created_at')


@admin.register(RewardLog)
class RewardLogAdmin(admin.ModelAdmin):
    list_display = ('user', 'points', 'reason', 'created_at')


@admin.register(ProjectConfig)
class ProjectConfigAdmin(admin.ModelAdmin):
    list_display = ('project', 'points_on_time', 'points_late')
