from django.urls import path
from . import views

app_name = 'messaging'

urlpatterns = [
    # Project chat
    path('project/<int:pk>/', views.project_chat, name='project_chat'),
    path('project/<int:pk>/messages/', views.project_messages, name='project_messages'),
    path('project/<int:pk>/send/', views.send_project_message, name='send_project_message'),
    # Task chat
    path('task/<int:pk>/', views.task_chat, name='task_chat'),
    path('task/<int:pk>/messages/', views.task_messages, name='task_messages'),
    path('task/<int:pk>/send/', views.send_task_message, name='send_task_message'),
]
