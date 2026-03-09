from functools import wraps
from django.http import HttpResponseForbidden
from django.contrib.auth.decorators import login_required


def role_required(*roles):
    """
    Decorator that restricts access to users whose role is in *roles*.
    Superusers always pass.  Must be used AFTER @login_required.
    """
    def decorator(view_func):
        @wraps(view_func)
        def _wrapped(request, *args, **kwargs):
            if request.user.is_superuser or request.user.role in roles:
                return view_func(request, *args, **kwargs)
            return HttpResponseForbidden(
                '<h2 style="text-align:center;margin-top:80px;">'
                'Accès refusé — vous n\'avez pas les permissions nécessaires.'
                '</h2>'
            )
        return _wrapped
    return decorator
