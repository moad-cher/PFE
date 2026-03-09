from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import HttpResponse
from .models import JobPosting, Application, Interview
from .forms import JobPostingForm, ApplicationForm, InterviewForm
from accounts.decorators import role_required


# ── Job Postings ─────────────────────────────────────────────

@login_required
@role_required('admin', 'hr_manager')
def job_list(request):
    jobs = JobPosting.objects.all()
    status_filter = request.GET.get('status')
    if status_filter:
        jobs = jobs.filter(status=status_filter)
    return render(request, 'hiring/job_list.html', {'jobs': jobs})


@login_required
@role_required('admin', 'hr_manager')
def job_create(request):
    form = JobPostingForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        job = form.save(commit=False)
        job.created_by = request.user
        job.save()
        return redirect('hiring:job_list')
    return render(request, 'hiring/job_form.html', {'form': form, 'title': 'Créer une offre'})


@login_required
@role_required('admin', 'hr_manager')
def job_edit(request, pk):
    job = get_object_or_404(JobPosting, pk=pk)
    form = JobPostingForm(request.POST or None, instance=job)
    if request.method == 'POST' and form.is_valid():
        form.save()
        return redirect('hiring:job_detail', pk=pk)
    return render(request, 'hiring/job_form.html', {'form': form, 'title': 'Modifier l\'offre'})


@login_required
@role_required('admin', 'hr_manager')
def job_detail(request, pk):
    job = get_object_or_404(JobPosting, pk=pk)
    applications = job.applications.all()
    return render(request, 'hiring/job_detail.html', {'job': job, 'applications': applications})


# ── Applications ─────────────────────────────────────────────

def apply(request, job_pk):
    """Public view — candidates apply without authentication."""
    job = get_object_or_404(JobPosting, pk=job_pk, status=JobPosting.Status.PUBLISHED)
    form = ApplicationForm(request.POST or None, request.FILES or None)
    if request.method == 'POST' and form.is_valid():
        app = form.save(commit=False)
        app.job = job
        app.save()
        # Trigger AI analysis asynchronously in the background
        from .ai import analyze_resume_async
        analyze_resume_async(app.id)
        return render(request, 'hiring/apply_success.html', {'job': job})
    return render(request, 'hiring/apply.html', {'job': job, 'form': form})


@login_required
@role_required('admin', 'hr_manager')
def application_detail(request, pk):
    import json
    app = get_object_or_404(Application, pk=pk)
    ai_data = None
    ai_error = None
    if app.ai_analysis:
        try:
            raw = app.ai_analysis
            start = raw.find('{')
            end = raw.rfind('}') + 1
            if start >= 0 and end > start:
                ai_data = json.loads(raw[start:end])
            else:
                ai_error = raw
        except (json.JSONDecodeError, ValueError):
            ai_error = app.ai_analysis
    import os
    resume_ext = os.path.splitext(app.resume.name)[1].lower() if app.resume else ''
    return render(request, 'hiring/application_detail.html', {
        'application': app,
        'ai_data': ai_data,
        'ai_error': ai_error,
        'resume_ext': resume_ext,
    })


@login_required
@role_required('admin', 'hr_manager')
def application_update_status(request, pk):
    """HTMX endpoint to update application status."""
    app = get_object_or_404(Application, pk=pk)
    new_status = request.POST.get('status')
    if new_status in dict(Application.Status.choices):
        app.status = new_status
        app.save()
    return render(request, 'hiring/partials/application_row.html', {'app': app})


@login_required
@role_required('admin', 'hr_manager')
def analyze_resume(request, pk):
    """HTMX endpoint — trigger AI analysis on demand."""
    import json
    app = get_object_or_404(Application, pk=pk)
    ai_data = None
    ai_error = None
    try:
        from .ai import analyze_resume_sync
        analyze_resume_sync(app)
        if app.ai_analysis:
            raw = app.ai_analysis
            start = raw.find('{')
            end = raw.rfind('}') + 1
            if start >= 0 and end > start:
                ai_data = json.loads(raw[start:end])
            else:
                ai_error = raw
    except Exception as e:
        ai_error = str(e)
    return render(request, 'hiring/partials/ai_analysis.html', {
        'application': app,
        'ai_data': ai_data,
        'ai_error': ai_error,
    })


# ── Interviews ───────────────────────────────────────────────

@login_required
@role_required('admin', 'hr_manager')
def schedule_interview(request, application_pk):
    application = get_object_or_404(Application, pk=application_pk)
    form = InterviewForm(request.POST or None)
    if request.method == 'POST' and form.is_valid():
        interview = form.save(commit=False)
        interview.application = application
        interview.created_by = request.user
        interview.save()
        application.status = Application.Status.INTERVIEW
        application.save()
        return redirect('hiring:application_detail', pk=application_pk)
    return render(request, 'hiring/interview_form.html', {
        'form': form, 'application': application
    })
