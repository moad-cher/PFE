"""
Async Ollama-based resume analysis — FastAPI port of Django's hiring/ai.py.
"""
from __future__ import annotations

import json
import os

import httpx

from app.core.config import settings


# ── Text extraction ────────────────────────────────────────────────────────── #

def extract_text_from_file(file_path: str) -> str:
    """Extract plain text from a resume file (PDF, TXT, DOCX)."""
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
        text = f"[Error reading file: {exc}]"

    return text


# ── Ollama call ────────────────────────────────────────────────────────────── #

async def _call_ollama(prompt: str, system_prompt: str = "") -> str:
    """Call Ollama /api/chat asynchronously and return the raw response string."""
    url = f"{settings.OLLAMA_BASE_URL}/api/chat"
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    payload = {
        "model": settings.OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "format": "json",
    }
    try:
        async with httpx.AsyncClient(timeout=120) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data.get("message", {}).get("content", "")
    except httpx.ConnectError:
        return '[{"error": "Ollama not reachable. Start it with: ollama serve"}]'
    except Exception as exc:
        return f'[{{"error": "{exc}"}}]'


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
        result = await db.execute(
            select(Application)
            .where(Application.id == application_id)
            .options(selectinload(Application.job))
        )
        app = result.scalar_one_or_none()
        if app is None:
            return

        # Extract text if not yet done
        if not app.resume_text and app.resume and os.path.exists(app.resume):
            app.resume_text = extract_text_from_file(app.resume)
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

        raw = await _call_ollama(prompt, system_prompt)

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
                app.ai_analysis = raw
        except (json.JSONDecodeError, ValueError):
            app.ai_score = 0.0
            app.ai_analysis = raw

        await db.commit()
