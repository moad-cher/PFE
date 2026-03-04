"""Ollama-based resume analysis AI for the Hiring module."""
import json
import os
import requests
from django.conf import settings


def extract_text_from_resume(application):
    """Extract plain text from the uploaded resume file (PDF, TXT, DOCX).

    Saves the result to application.resume_text and returns the text.
    """
    if not application.resume:
        return ""

    file_path = application.resume.path
    ext = os.path.splitext(file_path)[1].lower()
    text = ""

    try:
        if ext == ".pdf":
            import fitz  # PyMuPDF
            doc = fitz.open(file_path)
            pages = [page.get_text() for page in doc]
            doc.close()
            text = "\n".join(pages).strip()

        elif ext in (".txt", ".md"):
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read().strip()

        elif ext in (".docx",):
            try:
                import docx
                doc = docx.Document(file_path)
                text = "\n".join(p.text for p in doc.paragraphs).strip()
            except ImportError:
                text = "[python-docx non installé — impossible de lire .docx]"

        else:
            text = f"[Format non supporté: {ext}]"

    except Exception as e:
        text = f"[Erreur lors de la lecture du fichier: {e}]"

    if text:
        application.resume_text = text
        application.save(update_fields=["resume_text"])

    return text


def _call_ollama(prompt, system_prompt=""):
    """Send a prompt to Ollama using the /api/chat endpoint."""
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
        resp = requests.post(url, json=payload, timeout=120)
        resp.raise_for_status()
        data = resp.json()
        return data.get("message", {}).get("content", "")
    except requests.exceptions.ConnectionError:
        return "[Erreur] Ollama n'est pas accessible. Vérifiez que le serveur est lancé (ollama serve)."
    except Exception as e:
        return f"[Erreur] {str(e)}"


def analyze_resume_sync(application):
    """Analyze a resume and return a score + analysis.

    Updates the Application model in-place.
    """
    # Extract text from file first if not already done
    if not application.resume_text and application.resume:
        extract_text_from_resume(application)

    system_prompt = (
        "Tu es un assistant RH expert en analyse de CV. "
        "Analyse le CV du candidat par rapport à l'offre d'emploi. "
        "Réponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou après. "
        "Format exact requis: "
        '{"score": <entier 0-100>, "analysis": "<texte>", "strengths": ["<item>", ...], "weaknesses": ["<item>", ...]}'
    )

    prompt = f"""
Offre d'emploi:
- Titre: {application.job.title}
- Description: {application.job.description}
- Compétences requises: {application.job.required_skills}

Candidat:
- Nom: {application.candidate_name}
- Email: {application.candidate_email}
- CV (texte): {application.resume_text or 'Non disponible'}
- Lettre de motivation: {application.cover_letter or 'Non fournie'}
"""

    raw = _call_ollama(prompt, system_prompt)

    # Try to parse JSON from the response
    try:
        # Find JSON in the response (Ollama may wrap it in text)
        start = raw.find('{')
        end = raw.rfind('}') + 1
        if start >= 0 and end > start:
            data = json.loads(raw[start:end])
            application.ai_score = min(100, max(0, int(data.get('score', 0))))
            application.ai_analysis = json.dumps(data, ensure_ascii=False, indent=2)
        else:
            application.ai_score = 0
            application.ai_analysis = raw
    except (json.JSONDecodeError, ValueError):
        application.ai_score = 0
        application.ai_analysis = raw

    application.save()
    return application


def analyze_resume_async(application_id):
    """Wrapper that takes an ID — useful for async/background calls."""
    from hiring.models import Application
    application = Application.objects.get(pk=application_id)
    return analyze_resume_sync(application)
