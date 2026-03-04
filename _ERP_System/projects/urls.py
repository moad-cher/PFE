from django.urls import path
from . import views

app_name = 'projects'

urlpatterns = [
    path('', views.dashboard, name='dashboard'),
    path('create/', views.project_create, name='project_create'),
    path('<int:pk>/', views.project_detail, name='project_detail'),
    path('<int:pk>/edit/', views.project_edit, name='project_edit'),
    path('<int:pk>/settings/', views.project_settings, name='project_settings'),
    path('<int:pk>/kanban/', views.kanban_board, name='kanban_board'),
    path('<int:pk>/scrum/', views.scrum_board, name='scrum_board'),
    path('<int:pk>/members/', views.members_view, name='members_view'),
    path('<int:pk>/members/search/', views.member_search, name='member_search'),
    path('<int:pk>/members/add/<int:user_pk>/', views.member_add, name='member_add'),
    path('<int:pk>/members/remove/<int:user_pk>/', views.member_remove, name='member_remove'),
    path('<int:pk>/leaderboard/', views.leaderboard, name='leaderboard'),
    path('<int:pk>/bulk-reassign/', views.task_bulk_reassign, name='task_bulk_reassign'),
    path('<int:pk>/status/<int:status_pk>/delete/', views.status_delete, name='status_delete'),
    # Tasks
    path('<int:project_pk>/tasks/create/', views.task_create, name='task_create'),
    path('task/<int:pk>/', views.task_detail, name='task_detail'),
    path('task/<int:pk>/edit/', views.task_edit, name='task_edit'),
    path('task/<int:pk>/move/', views.task_move, name='task_move'),
    path('task/<int:pk>/reassign/', views.task_reassign, name='task_reassign'),
    path('task/<int:pk>/delete/', views.task_delete, name='task_delete'),
    path('task/<int:pk>/comment/', views.task_add_comment, name='task_add_comment'),
    path('task/<int:task_pk>/ai-suggest/', views.ai_suggest, name='ai_suggest'),
    path('task/<int:task_pk>/apply-suggestion/<int:user_pk>/', views.apply_suggestion, name='apply_suggestion'),
]
