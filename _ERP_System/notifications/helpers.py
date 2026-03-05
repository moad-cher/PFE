"""Helper functions to create notifications from anywhere in the codebase."""
from django.urls import reverse


def _push_ws(user, notif):
    """Push a notification to the user's WebSocket group (fire-and-forget)."""
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        from .models import Notification
        unread = Notification.objects.filter(recipient=user, is_read=False).count()
        async_to_sync(get_channel_layer().group_send)(
            f'user_{user.pk}',
            {
                'type':         'notification_message',
                'title':        notif.title,
                'message':      notif.message,
                'link':         notif.link,
                'unread_count': unread,
            }
        )
    except Exception:
        pass  # Channels not available (e.g. during tests / management commands)


def _create(recipient, notif_type, title, message='', link=''):
    from .models import Notification
    notif = Notification.objects.create(
        recipient=recipient,
        type=notif_type,
        title=title,
        message=message,
        link=link,
    )
    _push_ws(recipient, notif)


def notify_task_assigned(task):
    """Notify all assignees of a new task."""
    link = reverse('projects:task_detail', args=[task.pk])
    for user in task.assigned_to.all():
        _create(user, 'task_assigned',
                f"Nouvelle tâche: {task.title}",
                f"Vous avez été assigné à « {task.title} » dans {task.project.name}.",
                link)


def notify_task_updated(task, detail=''):
    """Notify assignees that a task was updated."""
    link = reverse('projects:task_detail', args=[task.pk])
    for user in task.assigned_to.all():
        _create(user, 'task_updated',
                f"Tâche mise à jour: {task.title}",
                detail, link)


def notify_deadline_approaching(task):
    """Notify assignees about an approaching deadline."""
    link = reverse('projects:task_detail', args=[task.pk])
    for user in task.assigned_to.all():
        _create(user, 'deadline',
                f"Échéance proche: {task.title}",
                f"La tâche « {task.title} » arrive à échéance le {task.deadline}.",
                link)


def notify_new_application(application):
    """Notify HR managers about a new job application."""
    link = reverse('hiring:application_detail', args=[application.pk])
    from accounts.models import User
    hr_users = User.objects.filter(role='hr_manager')
    for user in hr_users:
        _create(user, 'application',
                f"Nouvelle candidature: {application.candidate_name}",
                f"Candidature pour « {application.job.title} ».",
                link)


def notify_interview_scheduled(interview):
    """Notify about a scheduled interview."""
    from accounts.models import User
    hr_users = User.objects.filter(role='hr_manager')
    for user in hr_users:
        _create(user, 'interview',
                f"Entretien planifié: {interview.application.candidate_name}",
                f"Le {interview.date} à {interview.time}.",
                '')
