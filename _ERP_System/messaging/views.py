from django.shortcuts import get_object_or_404, render, redirect
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseForbidden
from projects.models import Project, Task
from .models import ChatMessage


def _can_access(user, project):
    return (user.is_superuser or user.role == 'admin'
            or project.manager == user or user in project.members.all())


# ── Project Chat ─────────────────────────────────────────────

@login_required
def project_chat(request, pk):
    project = get_object_or_404(Project, pk=pk)
    if not _can_access(request.user, project):
        return HttpResponseForbidden()
    msgs = list(project.chat_messages.filter(task=None).select_related('author').order_by('-created_at')[:100])
    msgs.reverse()
    return render(request, 'messaging/project_chat.html', {
        'project': project, 'messages': msgs,
    })


@login_required
def project_messages(request, pk):
    """HTMX GET — poll latest project messages."""
    project = get_object_or_404(Project, pk=pk)
    msgs = list(project.chat_messages.filter(task=None).select_related('author').order_by('-created_at')[:100])
    msgs.reverse()
    return render(request, 'messaging/partials/messages.html', {
        'messages': msgs, 'current_user': request.user,
    })


@login_required
def send_project_message(request, pk):
    """HTMX POST — send a project message, return updated list."""
    project = get_object_or_404(Project, pk=pk)
    if not _can_access(request.user, project):
        return HttpResponseForbidden()
    content = request.POST.get('content', '').strip()
    if content:
        ChatMessage.objects.create(project=project, task=None, author=request.user, content=content)
    msgs = list(project.chat_messages.filter(task=None).select_related('author').order_by('-created_at')[:100])
    msgs.reverse()
    return render(request, 'messaging/partials/messages.html', {
        'messages': msgs, 'current_user': request.user,
    })


# ── Task Chat ────────────────────────────────────────────────

@login_required
def task_chat(request, pk):
    task = get_object_or_404(Task, pk=pk)
    if not _can_access(request.user, task.project):
        return HttpResponseForbidden()
    msgs = list(task.chat_messages.select_related('author').order_by('-created_at')[:100])
    msgs.reverse()
    return render(request, 'messaging/task_chat.html', {
        'task': task, 'project': task.project, 'messages': msgs,
    })


@login_required
def task_messages(request, pk):
    """HTMX GET — poll latest task messages."""
    task = get_object_or_404(Task, pk=pk)
    msgs = list(task.chat_messages.select_related('author').order_by('-created_at')[:100])
    msgs.reverse()
    return render(request, 'messaging/partials/messages.html', {
        'messages': msgs, 'current_user': request.user,
    })


@login_required
def send_task_message(request, pk):
    """HTMX POST — send a task message, return updated list."""
    task = get_object_or_404(Task, pk=pk)
    if not _can_access(request.user, task.project):
        return HttpResponseForbidden()
    content = request.POST.get('content', '').strip()
    if content:
        ChatMessage.objects.create(project=task.project, task=task, author=request.user, content=content)
    msgs = list(task.chat_messages.select_related('author').order_by('-created_at')[:100])
    msgs.reverse()
    return render(request, 'messaging/partials/messages.html', {
        'messages': msgs, 'current_user': request.user,
    })
