from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', lambda r: redirect('projects:dashboard')),
    path('accounts/', include('accounts.urls')),
    path('hiring/', include('hiring.urls')),
    path('projects/', include('projects.urls')),
    path('notifications/', include('notifications.urls')),
    path('messaging/', include('messaging.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

