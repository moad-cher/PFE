from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.utils import timezone
from django.http import HttpResponse, HttpResponseForbidden
from django.db.models import Q, Count
from .models import Project, Task, Comment, RewardLog, TaskStatus, ProjectConfig
from .forms import ProjectForm, TaskForm, CommentForm, TaskStatusForm, ProjectConfigForm
from accounts.models import User
from accounts.decorators import role_required


def _ensure_default_statuses(project):
    """Create default Kanban columns if none exist."""
    if not project.statuses.exists():
        defaults = [
            ('À faire', 'todo', 0, '#e74c3c'),
            ('En cours', 'in_progress', 1, '#f39c12'),
            ('En revue', 'review', 2, '#3498db'),
            ('Terminé', 'done', 3, '#2ecc71'),
        ]
        for name, slug, order, color in defaults:
            TaskStatus.objects.create(project=project, name=name, slug=slug,
                                      order=order, color=color)


def _ensure_config(project):
    ProjectConfig.objects.get_or_create(project=project)


# ── Dashboard ────────────────────────────────────────────────

@login_required
def dashboard(request):
    user = request.user
    if user.is_superuser or user.role == 'admin':
        projects = Project.objects.all()
    elif user.is_project_manager:
        projects = Project.objects.filter(Q(manager=user) | Q(members=user)).distinct()
    else:
        projects = user.projects.all()
    my_tasks = Task.objects.filter(assigned_to=user).exclude(status='done')[:10]
    return render(request, 'projects/dashboard.html', {
        'projects': projects,
        'my_tasks': my_tasks,
    })


# ── Projects ─────────────────────────────────────────────────

@login_required
@role_required('admin', 'project_manager')
def project_create(request):
    form = ProjectForm(request.POST or None)
    all_users = User.objects.filter(role='team_member').exclude(pk=request.user.pk)
    if request.method == 'POST' and form.is_valid():
        project = form.save(commit=False)
        project.manager = request.user
        project.save()
        member_ids = request.POST.getlist('members')
        if member_ids:
            project.members.set(member_ids)
        _ensure_default_statuses(project)
        _ensure_config(project)
        return redirect('projects:project_detail', pk=project.pk)
    return render(request, 'projects/project_form.html', {
        'form': form, 'title': 'Créer un projet', 'all_users': all_users,
        'selected_member_ids': [],
    })


@login_required
@role_required('admin', 'project_manager')
def project_edit(request, pk):
    project = get_object_or_404(Project, pk=pk)
    if not request.user.is_superuser and request.user.role != 'admin' and project.manager != request.user:
        return HttpResponseForbidden('Accès refusé.')
    form = ProjectForm(request.POST or None, instance=project)
    all_users = User.objects.filter(role='team_member').exclude(pk=project.manager_id)
    selected_member_ids = list(project.members.values_list('id', flat=True))
    if request.method == 'POST' and form.is_valid():
        form.save()
        member_ids = request.POST.getlist('members')
        project.members.set(member_ids)
        return redirect('projects:project_detail', pk=pk)
    return render(request, 'projects/project_form.html', {
        'form': form, 'title': 'Modifier le projet',
        'all_users': all_users, 'selected_member_ids': selected_member_ids,
    })


@login_required
def project_detail(request, pk):
    project = get_object_or_404(Project, pk=pk)
    _ensure_default_statuses(project)
    return render(request, 'projects/project_detail.html', {'project': project})


@login_required
@role_required('admin', 'project_manager')
def project_settings(request, pk):
    project = get_object_or_404(Project, pk=pk)
    if not request.user.is_superuser and request.user.role != 'admin' and project.manager != request.user:
        return HttpResponseForbidden('Accès refusé.')
    _ensure_config(project)
    config_form = ProjectConfigForm(request.POST or None, instance=project.config)
    status_form = TaskStatusForm(request.POST or None)
    if request.method == 'POST':
        action = request.POST.get('action')
        if action == 'save_config' and config_form.is_valid():
            config_form.save()
            return redirect('projects:project_settings', pk=pk)
        elif action == 'add_status' and status_form.is_valid():
            s = status_form.save(commit=False)
            s.project = project
            s.save()
            return redirect('projects:project_settings', pk=pk)
    statuses = project.statuses.all()
    return render(request, 'projects/project_settings.html', {
        'project': project, 'config_form': config_form,
        'status_form': status_form, 'statuses': statuses,
    })


# ── Kanban Board ─────────────────────────────────────────────

@login_required
def kanban_board(request, pk):
    project = get_object_or_404(Project, pk=pk)
    _ensure_default_statuses(project)
    statuses = project.statuses.all()
    columns = []
    for s in statuses:
        tasks = project.tasks.filter(status=s.slug)
        columns.append({'status': s, 'tasks': tasks})
    return render(request, 'projects/kanban.html', {'project': project, 'columns': columns})


@login_required
def task_move(request, pk):
    """HTMX endpoint — move task to a new status column."""
    task = get_object_or_404(Task, pk=pk)
    new_status = request.POST.get('status')
    if new_status:
        old_status = task.status
        task.status = new_status
        if new_status == 'done' and old_status != 'done':
            task.completed_at = timezone.now()
            _award_points(task)
        task.save()
        # Send notification
        from notifications.helpers import notify_task_updated
        notify_task_updated(task, f"Statut changé → {new_status}")
    project = task.project
    _ensure_default_statuses(project)
    statuses = project.statuses.all()
    columns = []
    for s in statuses:
        tasks = project.tasks.filter(status=s.slug)
        columns.append({'status': s, 'tasks': tasks})
    return render(request, 'projects/partials/kanban_columns.html',
                  {'columns': columns, 'project': project})


# ── Scrum Board ──────────────────────────────────────────────

@login_required
def scrum_board(request, pk):
    project = get_object_or_404(Project, pk=pk)
    tasks = project.tasks.all().order_by('deadline', '-priority')
    return render(request, 'projects/scrum.html', {'project': project, 'tasks': tasks})


# ── Task CRUD ────────────────────────────────────────────────

@login_required
@role_required('admin', 'project_manager')
def task_create(request, project_pk):
    project = get_object_or_404(Project, pk=project_pk)
    form = TaskForm(request.POST or None, project=project)
    if request.method == 'POST' and form.is_valid():
        task = form.save(commit=False)
        task.project = project
        task.save()
        form.save_m2m()
        from notifications.helpers import notify_task_assigned
        notify_task_assigned(task)
        return redirect('projects:kanban_board', pk=project_pk)
    return render(request, 'projects/task_form.html', {
        'form': form, 'project': project, 'title': 'Créer une tâche'
    })


@login_required
def task_detail(request, pk):
    task = get_object_or_404(Task, pk=pk)
    comment_form = CommentForm()
    comments = task.comments.select_related('author').all()
    return render(request, 'projects/task_detail.html', {
        'task': task, 'comment_form': comment_form, 'comments': comments,
    })


@login_required
def task_edit(request, pk):
    task = get_object_or_404(Task, pk=pk)
    # Only admin, project manager (owner), or task assignees can edit
    u = request.user
    if not u.is_superuser and u.role != 'admin' and task.project.manager != u and u not in task.assigned_to.all():
        return HttpResponseForbidden('Accès refusé.')
    form = TaskForm(request.POST or None, instance=task, project=task.project)
    if request.method == 'POST' and form.is_valid():
        form.save()
        return redirect('projects:task_detail', pk=pk)
    return render(request, 'projects/task_form.html', {
        'form': form, 'project': task.project, 'title': 'Modifier la tâche'
    })


@login_required
def task_add_comment(request, pk):
    """HTMX endpoint — add comment."""
    task = get_object_or_404(Task, pk=pk)
    form = CommentForm(request.POST or None)
    if form.is_valid():
        c = form.save(commit=False)
        c.task = task
        c.author = request.user
        c.save()
        from notifications.helpers import notify_task_updated
        notify_task_updated(task, f"Nouveau commentaire de {request.user.username}")
    comments = task.comments.all()
    return render(request, 'projects/partials/comments.html', {'comments': comments, 'task': task})


# ── Members Management ───────────────────────────────────────

@login_required
@role_required('admin', 'project_manager')
def members_view(request, pk):
    project = get_object_or_404(Project, pk=pk)
    members = project.members.all()
    member_data = []
    for m in members:
        tasks_count = project.tasks.filter(assigned_to=m).count()
        done_count = project.tasks.filter(assigned_to=m, status='done').count()
        active_tasks = project.tasks.filter(assigned_to=m).exclude(status='done')
        member_data.append({
            'member': m, 'tasks_count': tasks_count,
            'done_count': done_count, 'active_tasks': active_tasks,
        })
    return render(request, 'projects/members.html', {
        'project': project, 'member_data': member_data,
    })


@login_required
@role_required('admin', 'project_manager')
def member_search(request, pk):
    """HTMX — search users to add as project members."""
    project = get_object_or_404(Project, pk=pk)
    q = request.GET.get('q', '').strip()
    results = []
    if len(q) >= 2:
        existing_ids = project.members.values_list('id', flat=True)
        results = User.objects.filter(
            role='team_member'
        ).filter(
            Q(username__icontains=q) | Q(first_name__icontains=q) |
            Q(last_name__icontains=q) | Q(email__icontains=q)
        ).exclude(id__in=existing_ids).exclude(id=project.manager_id)[:10]
    return render(request, 'projects/partials/member_search_results.html', {
        'results': results, 'project': project,
    })


@login_required
@role_required('admin', 'project_manager')
def member_add(request, pk, user_pk):
    """HTMX — add a user to the project."""
    project = get_object_or_404(Project, pk=pk)
    user = get_object_or_404(User, pk=user_pk)
    project.members.add(user)
    from notifications.helpers import _create
    _create(user, 'task_assigned', f"Ajouté au projet '{project.name}'",
            f"Vous avez été ajouté au projet « {project.name} ».",
            f"/projects/{project.pk}/")
    return _render_member_list(request, project)


@login_required
@role_required('admin', 'project_manager')
def member_remove(request, pk, user_pk):
    """HTMX — remove a user from the project and unassign their tasks."""
    project = get_object_or_404(Project, pk=pk)
    user = get_object_or_404(User, pk=user_pk)
    # Unassign from all project tasks
    for task in project.tasks.filter(assigned_to=user):
        task.assigned_to.remove(user)
    project.members.remove(user)
    return _render_member_list(request, project)


def _render_member_list(request, project):
    """Helper — re-render member list partial."""
    members = project.members.all()
    member_data = []
    for m in members:
        tasks_count = project.tasks.filter(assigned_to=m).count()
        done_count = project.tasks.filter(assigned_to=m, status='done').count()
        active_tasks = project.tasks.filter(assigned_to=m).exclude(status='done')
        member_data.append({
            'member': m, 'tasks_count': tasks_count,
            'done_count': done_count, 'active_tasks': active_tasks,
        })
    return render(request, 'projects/partials/member_list.html', {
        'project': project, 'member_data': member_data,
    })


# ── Leaderboard ──────────────────────────────────────────────

@login_required
def leaderboard(request, pk):
    project = get_object_or_404(Project, pk=pk)
    members = project.members.all().order_by('-reward_points')
    return render(request, 'projects/leaderboard.html', {
        'project': project, 'members': members,
    })


# ── AI Suggestion ────────────────────────────────────────────

@login_required
def ai_suggest(request, task_pk):
    """HTMX endpoint — get AI suggestion for task assignment."""
    task = get_object_or_404(Task, pk=task_pk)
    from .ai_suggest import suggest_assignment
    result = suggest_assignment(task)
    return render(request, 'projects/partials/ai_suggestion.html', {
        'result': result, 'task': task,
    })


@login_required
@role_required('admin', 'project_manager')
def apply_suggestion(request, task_pk, user_pk):
    """HTMX — assign the AI-suggested member to the task."""
    task = get_object_or_404(Task, pk=task_pk)
    user = get_object_or_404(User, pk=user_pk)
    task.assigned_to.add(user)
    from notifications.helpers import notify_task_assigned
    notify_task_assigned(task)
    return render(request, 'projects/partials/task_assignees.html', {
        'task': task, 'project': task.project,
    })


# ── Task Reassignment ────────────────────────────────────────

@login_required
@role_required('admin', 'project_manager')
def task_reassign(request, pk):
    """HTMX — reassign a task to different members."""
    task = get_object_or_404(Task, pk=pk)
    project = task.project
    if request.method == 'POST':
        new_member_ids = request.POST.getlist('assigned_to')
        old_members = set(task.assigned_to.values_list('id', flat=True))
        task.assigned_to.set(new_member_ids)
        new_members = set(int(x) for x in new_member_ids)
        # Notify newly added assignees
        added = new_members - old_members
        if added:
            from notifications.helpers import _create
            for uid in added:
                try:
                    u = User.objects.get(pk=uid)
                    _create(u, 'task_assigned',
                            f"Tâche reassignée: {task.title}",
                            f"Vous avez été assigné à « {task.title} » dans {project.name}.",
                            f"/projects/task/{task.pk}/")
                except User.DoesNotExist:
                    pass
        return render(request, 'projects/partials/task_assignees.html', {
            'task': task, 'project': project,
        })
    # GET — show reassignment form
    members = project.members.all()
    current_ids = list(task.assigned_to.values_list('id', flat=True))
    return render(request, 'projects/partials/task_reassign_form.html', {
        'task': task, 'project': project,
        'members': members, 'current_ids': current_ids,
    })


@login_required
@role_required('admin', 'project_manager')
def task_delete(request, pk):
    """Delete a task."""
    task = get_object_or_404(Task, pk=pk)
    project_pk = task.project.pk
    if request.method == 'POST':
        task.delete()
        return redirect('projects:kanban_board', pk=project_pk)
    return render(request, 'projects/task_confirm_delete.html', {'task': task})


@login_required
@role_required('admin', 'project_manager')
def status_delete(request, pk, status_pk):
    """Delete a Kanban column status."""
    project = get_object_or_404(Project, pk=pk)
    status = get_object_or_404(TaskStatus, pk=status_pk, project=project)
    if request.method == 'POST':
        # Move tasks in this status to the first remaining status
        fallback = project.statuses.exclude(pk=status_pk).first()
        if fallback:
            project.tasks.filter(status=status.slug).update(status=fallback.slug)
        status.delete()
    return redirect('projects:project_settings', pk=pk)


@login_required
@role_required('admin', 'project_manager')
def task_bulk_reassign(request, pk):
    """Bulk reassign tasks within a project."""
    project = get_object_or_404(Project, pk=pk)
    members = project.members.all()
    tasks = project.tasks.exclude(status='done')

    if request.method == 'POST':
        task_ids = request.POST.getlist('task_ids')
        new_assignee_id = request.POST.get('new_assignee')
        action = request.POST.get('action', 'add')  # add or replace
        if task_ids and new_assignee_id:
            new_assignee = get_object_or_404(User, pk=new_assignee_id)
            selected_tasks = project.tasks.filter(pk__in=task_ids)
            for task in selected_tasks:
                if action == 'replace':
                    task.assigned_to.clear()
                task.assigned_to.add(new_assignee)
            from notifications.helpers import _create
            _create(new_assignee, 'task_assigned',
                    f"{len(task_ids)} tâche(s) assignée(s)",
                    f"Vous avez été assigné à {len(task_ids)} tâche(s) dans {project.name}.",
                    f"/projects/{project.pk}/kanban/")
            return redirect('projects:task_bulk_reassign', pk=pk)

    return render(request, 'projects/task_bulk_reassign.html', {
        'project': project, 'members': members, 'tasks': tasks,
    })


# ── Helpers ──────────────────────────────────────────────────

def _award_points(task):
    """Award points to assignees when a task is completed."""
    project = task.project
    _ensure_config(project)
    config = project.config
    on_time = not task.is_overdue
    pts = config.points_on_time if on_time else config.points_late
    for user in task.assigned_to.all():
        user.reward_points += pts
        user.save()
        RewardLog.objects.create(user=user, task=task, points=pts,
                                 reason=f"Tâche '{task.title}' terminée {'à temps' if on_time else 'en retard'}")
