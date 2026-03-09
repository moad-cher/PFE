from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages as django_messages
from django.db.models import Q
from .forms import LoginForm, RegisterForm, ProfileForm


def login_view(request):
    if request.user.is_authenticated:
        return redirect('projects:dashboard')
    form = LoginForm(request, data=request.POST or None)
    if request.method == 'POST' and form.is_valid():
        login(request, form.get_user())
        return redirect('projects:dashboard')
    return render(request, 'accounts/login.html', {'form': form})


def register_view(request):
    form = RegisterForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        user = form.save()
        login(request, user)
        return redirect('projects:dashboard')
    return render(request, 'accounts/register.html', {'form': form})


@login_required
def logout_view(request):
    logout(request)
    return redirect('accounts:login')


@login_required
def profile_view(request):
    from projects.models import Task, Project
    user = request.user
    form = ProfileForm(request.POST or None, request.FILES or None, instance=user)
    if request.method == 'POST' and form.is_valid():
        form.save()
        django_messages.success(request, 'Profil mis à jour avec succès.')
        return redirect('accounts:profile')
    active_projects = Project.objects.filter(
        Q(manager=user) | Q(members=user)
    ).distinct()[:6]
    tasks_done = Task.objects.filter(assigned_to=user, status='done').count()
    tasks_active = Task.objects.filter(assigned_to=user).exclude(status='done').count()
    return render(request, 'accounts/profile.html', {
        'form': form,
        'active_projects': active_projects,
        'tasks_done': tasks_done,
        'tasks_active': tasks_active,
    })
