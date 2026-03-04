def unread_notifications_count(request):
    """Template context processor — adds unread notification count."""
    if request.user.is_authenticated:
        count = request.user.notifications.filter(is_read=False).count()
    else:
        count = 0
    return {'unread_notifications_count': count}
