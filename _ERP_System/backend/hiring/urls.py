from django.urls import path
from . import views

app_name = 'hiring'

urlpatterns = [
    # Job Postings
    path('', views.job_list, name='job_list'),
    path('create/', views.job_create, name='job_create'),
    path('<int:pk>/', views.job_detail, name='job_detail'),
    path('<int:pk>/edit/', views.job_edit, name='job_edit'),
    # Applications
    path('<int:job_pk>/apply/', views.apply, name='apply'),
    path('application/<int:pk>/', views.application_detail, name='application_detail'),
    path('application/<int:pk>/status/', views.application_update_status, name='application_update_status'),
    path('application/<int:pk>/analyze/', views.analyze_resume, name='analyze_resume'),
    # Interviews
    path('application/<int:application_pk>/interview/', views.schedule_interview, name='schedule_interview'),
]
