import json
import os

import aiofiles
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.deps import get_current_user, get_db, require_roles
from app.core.media import ensure_media_dir, get_media_url, RESUMES_DIR
from app.notifications.service import notify_application_received
from app.hiring.ai import analyze_resume
from app.users.models import User, RoleEnum
from app.hiring.models import Application, ApplicationStatusEnum, Interview, JobPosting, JobStatusEnum
from app.hiring.schemas import (
    ApplicationDetailRead,
    ApplicationRead,
    ApplicationStatusUpdate,
    InterviewCreate,
    InterviewRead,
    JobPostingCreate,
    JobPostingRead,
    JobPostingUpdate,
)

router = APIRouter(prefix="/hiring", tags=["hiring"])

_HR_ROLES = ("hr_manager", "admin")


# ── Job Postings ──────────────────────────────────────────────────────────────

@router.get("/jobs", response_model=list[JobPostingRead])
async def list_jobs(
    status: str | None = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(get_db),
):
    """Public — anyone can list jobs."""
    q = select(JobPosting).options(selectinload(JobPosting.applications)).order_by(JobPosting.created_at.desc())
    if status:
        q = q.where(JobPosting.status == status)
    result = await db.execute(q)
    jobs = result.scalars().unique().all()
    for job in jobs:
        job.application_count = len(job.applications) if hasattr(job, "applications") else 0
    return jobs


@router.post("/jobs", response_model=JobPostingRead, status_code=201)
async def create_job(
    data: JobPostingCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(*_HR_ROLES)),
):
    job = JobPosting(**data.model_dump(), created_by_id=current_user.id)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job


@router.get("/jobs/{job_id}", response_model=JobPostingRead)
async def get_job(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(JobPosting).options(selectinload(JobPosting.applications)).where(JobPosting.id == job_id)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@router.patch("/jobs/{job_id}", response_model=JobPostingRead)
async def update_job(
    job_id: int,
    data: JobPostingUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(*_HR_ROLES)),
):
    result = await db.execute(select(JobPosting).where(JobPosting.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(job, field, value)
    await db.commit()
    await db.refresh(job)
    return job


@router.delete("/jobs/{job_id}", status_code=204)
async def delete_job(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(*_HR_ROLES)),
):
    result = await db.execute(select(JobPosting).where(JobPosting.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found")
    await db.delete(job)
    await db.commit()


# ── Applications ──────────────────────────────────────────────────────────────

@router.get("/applications", response_model=list[ApplicationRead])
async def list_all_applications(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(*_HR_ROLES)),
):
    """All applications across all jobs, ordered by AI score desc."""
    result = await db.execute(
        select(Application)
        .order_by(Application.ai_score.desc().nullslast(), Application.created_at.desc())
    )
    return result.scalars().all()


@router.get("/jobs/{job_id}/applications", response_model=list[ApplicationRead])
async def list_job_applications(
    job_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(*_HR_ROLES)),
):
    result = await db.execute(
        select(Application)
        .where(Application.job_id == job_id)
        .order_by(Application.ai_score.desc().nullslast(), Application.created_at.desc())
    )
    return result.scalars().all()


@router.post("/jobs/{job_id}/apply", response_model=ApplicationRead, status_code=201)
async def apply(
    job_id: int,
    background_tasks: BackgroundTasks,
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(""),
    cover_letter: str = Form(""),
    resume: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — no authentication required."""
    result = await db.execute(
        select(JobPosting).where(JobPosting.id == job_id, JobPosting.status == JobStatusEnum.published)
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, "Job not found or not published")

    allowed = {".pdf", ".docx", ".txt", ".doc"}
    ext = os.path.splitext(resume.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(400, f"Unsupported file type '{ext}'. Allowed: {', '.join(allowed)}")

    resume_dir = ensure_media_dir(RESUMES_DIR)
    safe_email = email.replace("@", "_at_").replace(".", "_")
    filename = f"{job_id}_{safe_email}_{resume.filename}"
    file_path = resume_dir / filename
    async with aiofiles.open(file_path, "wb") as f:
        await f.write(await resume.read())

    application = Application(
        job_id=job_id,
        first_name=first_name, last_name=last_name,
        email=email, phone=phone,
        cover_letter=cover_letter,
        resume=str(file_path),  # Store absolute path for AI processing
    )
    db.add(application)
    await db.commit()
    await db.refresh(application)

    background_tasks.add_task(analyze_resume, application.id)

    # Notify all HR managers and admins of the new application
    hr_res = await db.execute(
        select(User).where(
            User.role.in_([RoleEnum.hr_manager, RoleEnum.admin]),
            User.is_active.is_(True),
        )
    )
    for hr_user in hr_res.scalars().all():
        background_tasks.add_task(notify_application_received, hr_user.id, job.title, application.id)

    return application


@router.get("/applications/{app_id}", response_model=ApplicationDetailRead)
async def get_application(
    app_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(*_HR_ROLES)),
):
    result = await db.execute(
        select(Application)
        .where(Application.id == app_id)
        .options(selectinload(Application.interviews))
    )
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")

    ai_data = None
    if app.ai_analysis:
        try:
            raw = app.ai_analysis
            start, end = raw.find("{"), raw.rfind("}") + 1
            if start >= 0 and end > start:
                ai_data = json.loads(raw[start:end])
        except (json.JSONDecodeError, ValueError):
            pass

    resp = ApplicationDetailRead.model_validate(app)
    resp.ai_data = ai_data
    return resp


@router.patch("/applications/{app_id}/status", response_model=ApplicationRead)
async def update_application_status(
    app_id: int,
    data: ApplicationStatusUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(*_HR_ROLES)),
):
    result = await db.execute(select(Application).where(Application.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")
    app.status = data.status
    await db.commit()
    await db.refresh(app)
    return app


@router.post("/applications/{app_id}/analyze", response_model=ApplicationRead)
async def trigger_analysis(
    app_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(*_HR_ROLES)),
):
    """Manually trigger / re-trigger AI resume analysis."""
    result = await db.execute(select(Application).where(Application.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")
    background_tasks.add_task(analyze_resume, app_id)
    return app


# ── Interviews ────────────────────────────────────────────────────────────────

@router.post("/applications/{app_id}/interviews", response_model=InterviewRead, status_code=201)
async def schedule_interview(
    app_id: int,
    data: InterviewCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(*_HR_ROLES)),
):
    result = await db.execute(select(Application).where(Application.id == app_id))
    app = result.scalar_one_or_none()
    if not app:
        raise HTTPException(404, "Application not found")

    interview = Interview(
        application_id=app_id,
        scheduled_at=data.scheduled_at,
        location=data.location,
        notes=data.notes,
        created_by_id=current_user.id,
    )
    db.add(interview)

    if app.status not in (ApplicationStatusEnum.accepted, ApplicationStatusEnum.rejected):
        app.status = ApplicationStatusEnum.interview

    await db.commit()
    await db.refresh(interview)
    return interview


@router.get("/applications/{app_id}/interviews", response_model=list[InterviewRead])
async def list_interviews(
    app_id: int,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(*_HR_ROLES)),
):
    result = await db.execute(
        select(Interview)
        .where(Interview.application_id == app_id)
        .order_by(Interview.scheduled_at)
    )
    return result.scalars().all()


# ── HR Stats ──────────────────────────────────────────────────────────────────

@router.get("/stats")
async def hr_stats(
    db: AsyncSession = Depends(get_db),
    _=Depends(require_roles(*_HR_ROLES)),
):
    """HR Manager stats: job postings, applicants, candidates per posting, avg AI score."""
    # Total job postings
    jobs_result = await db.execute(select(func.count(JobPosting.id)))
    total_job_postings = jobs_result.scalar_one()
    
    # Total applicants
    apps_result = await db.execute(select(func.count(Application.id)))
    total_applicants = apps_result.scalar_one()
    
    # Candidates per posting (average)
    if total_job_postings > 0:
        candidates_per_posting = total_applicants / total_job_postings
    else:
        candidates_per_posting = 0
    
    # Average AI score
    avg_score_result = await db.execute(
        select(func.avg(Application.ai_score))
        .where(Application.ai_score.is_not(None))
    )
    avg_ai_score = avg_score_result.scalar_one() or 0
    
    # Applications by status
    status_result = await db.execute(
        select(Application.status, func.count(Application.id))
        .group_by(Application.status)
    )
    applications_by_status = {status.value: count for status, count in status_result.all()}
    
    # Open job postings
    open_jobs_result = await db.execute(
        select(func.count(JobPosting.id))
        .where(JobPosting.status == JobStatusEnum.published)
    )
    open_postings = open_jobs_result.scalar_one()
    
    return {
        "total_job_postings": total_job_postings,
        "open_postings": open_postings,
        "total_applicants": total_applicants,
        "candidates_per_posting": round(candidates_per_posting, 2),
        "avg_ai_score": round(float(avg_ai_score), 2) if avg_ai_score else 0,
        "applications_by_status": applications_by_status,
    }

