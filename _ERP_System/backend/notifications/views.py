from django.shortcuts import get_object_or_404
from django.contrib.auth.decorators import login_required
from django.shortcuts import render
from .models import Notification


@login_required
def notification_list(request):
    notifications = request.user.notifications.all()[:50]
    return render(request, 'notifications/list.html', {'notifications': notifications})


@login_required
def mark_read(request, pk):
    """HTMX — mark a single notification as read."""
    notif = get_object_or_404(Notification, pk=pk, recipient=request.user)
    notif.is_read = True
    notif.save()
    return render(request, 'notifications/partials/notification_item.html',
                  {'notification': notif})


@login_required
def mark_all_read(request):
    """HTMX — mark all notifications as read."""
    request.user.notifications.filter(is_read=False).update(is_read=True)
    notifications = request.user.notifications.all()[:50]
    # Return dropdown partial when called from the dropdown panel
    if request.headers.get('HX-Target') == 'notif-dropdown-panel':
        return render(request, 'notifications/partials/dropdown.html', {
            'notifications': notifications[:15],
            'unread_count': 0,
        })
    return render(request, 'notifications/partials/notification_list.html',
                  {'notifications': notifications})


@login_required
def dropdown(request):
    """HTMX — load notifications dropdown panel."""
    notifications = request.user.notifications.all()[:15]
    unread_count = request.user.notifications.filter(is_read=False).count()
    return render(request, 'notifications/partials/dropdown.html', {
        'notifications': notifications,
        'unread_count': unread_count,
    })
