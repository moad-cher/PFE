"""
Async Ollama-based resume analysis — FastAPI port of Django's hiring/ai.py.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os

from app.ai.service import ollama_chat

logger = logging.getLogger(__name__)


# ── Text extraction ────────────────────────────────────────────────────────── #

def extract_text_from_file(file_path: str) -> str:
    """
    Extract plain text from a resume file (PDF, TXT, DOCX).
    Synchronous function intended to be run in a thread.
    """
    ext = os.path.splitext(file_path)[1].lower()
    text = ""
    try:
        if ext == ".pdf":
            import fitz  # PyMuPDF
            doc = fitz.open(file_path)
            text = "\n".join(page.get_text() for page in doc).strip()
            doc.close()

        elif ext in (".txt", ".md"):
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read().strip()

        elif ext == ".docx":
            try:
                import docx
                document = docx.Document(file_path)
                text = "\n".join(p.text for p in document.paragraphs).strip()
            except ImportError:
                text = "[python-docx not installed — cannot read .docx]"

        else:
            text = f"[Unsupported format: {ext}]"

    except Exception as exc:
        logger.error(f"Error reading file {file_path}: {exc}")
        text = f"[Error reading file: {exc}]"

    return text


# ── Main analysis function ─────────────────────────────────────────────────── #

async def analyze_resume(application_id: int) -> None:
    """
    Load the Application from DB, extract resume text, call Ollama,
    and save ai_score + ai_analysis back to the row.
    Called as a background task from the hiring router.
    """
    from app.core.database import AsyncSessionLocal
    from app.hiring.models import Application
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(Application)
                .where(Application.id == application_id)
                .options(selectinload(Application.job))
            )
            app = result.scalar_one_or_none()
            if app is None:
                return

            # Extract text if not yet done — run in thread to avoid blocking event loop
            if not app.resume_text and app.resume and os.path.exists(app.resume):
                app.resume_text = await asyncio.to_thread(extract_text_from_file, app.resume)
                await db.commit()
                await db.refresh(app)

            system_prompt = (
                "You are an expert HR assistant specialising in CV analysis. "
                "Analyse the candidate's CV against the job posting. "
                "Reply ONLY with a valid JSON object, no text before or after. "
                'Required format: {"score": <int 0-100>, "analysis": "<text>", '
                '"strengths": ["<item>", ...], "weaknesses": ["<item>", ...]}'
            )

            prompt = f"""
Job posting:
- Title: {app.job.title}
- Description: {app.job.description}
- Required skills: {app.job.required_skills}

Candidate:
- Name: {app.candidate_name}
- Email: {app.candidate_email}
- CV text: {app.resume_text or 'Not available'}
- Cover letter: {app.cover_letter or 'Not provided'}
"""

            try:
                raw = await ollama_chat(
                    [{"role": "user", "content": prompt}],
                    system_prompt=system_prompt,
                    json_mode=True
                )

                # Parse JSON from response
                try:
                    start = raw.find("{")
                    end = raw.rfind("}") + 1
                    if start >= 0 and end > start:
                        data = json.loads(raw[start:end])
                        app.ai_score = min(100.0, max(0.0, float(data.get("score", 0))))
                        app.ai_analysis = json.dumps(data, ensure_ascii=False, indent=2)
                    else:
                        app.ai_score = 0.0
                        app.ai_analysis = f"Invalid AI response format: {raw}"
                except (json.JSONDecodeError, ValueError) as exc:
                    logger.warning(f"Failed to parse AI JSON for application {application_id}: {exc}")
                    app.ai_score = 0.0
                    app.ai_analysis = raw

            except Exception as exc:
                logger.error(f"AI analysis failed for application {application_id}: {exc}")
                app.ai_score = 0.0
                app.ai_analysis = f"Error: {exc}"

            await db.commit()

            # Notify the HR manager who created the job posting
            try:
                from app.notifications.service import notify_ai_complete
                await notify_ai_complete(
                    hr_id=app.job.created_by_id,
                    applicant_name=app.candidate_name,
                    app_id=app.id,
                    job_id=app.job_id
                )
            except Exception as e:
                logger.error(f"Failed to send AI completion notification: {e}")

        except Exception as outer_exc:
            logger.error(f"Critical error in analyze_resume for application {application_id}: {outer_exc}")
