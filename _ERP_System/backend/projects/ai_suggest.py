"""Ollama-based AI for task assignment suggestions in the Projects module."""
import json
import requests
from django.conf import settings


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
        resp = requests.post(url, json=payload, timeout=180)
        resp.raise_for_status()
        data = resp.json()
        return data.get("message", {}).get("content", "")
    except requests.exceptions.ConnectionError:
        return "[Erreur] Ollama n'est pas accessible. Vérifiez que le serveur est lancé (ollama serve)."
    except Exception as e:
        return f"[Erreur] {str(e)}"


def suggest_assignment(task):
    """Suggest the best team member(s) for a task based on skills and workload."""
    project = task.project
    members = project.members.all()

    if not members.exists():
        return {"suggestion": "Aucun membre dans le projet.", "members": []}

    # Build member info
    member_info = []
    for m in members:
        active_tasks = m.assigned_tasks.filter(project=project).exclude(status='done').count()
        member_info.append({
            "name": m.get_full_name() or m.username,
            "username": m.username,
            "skills": m.skills or "Non renseigné",
            "active_tasks": active_tasks,
            "reward_points": m.reward_points,
        })

    system_prompt = (
        "Tu es un assistant de gestion de projet. "
        "Analyse la tâche et les membres de l'équipe pour proposer un classement des meilleurs candidats. "
        "Considère les compétences, la charge de travail actuelle et les points de récompense. "
        "Réponds UNIQUEMENT en JSON valide avec la clé \"ranked_members\": tableau de 1 à 3 objets, "
        "chaque objet ayant: username (string), reason (string), confidence (int 0-100)."
    )

    prompt = f"""
Tâche à assigner:
- Titre: {task.title}
- Description: {task.description}
- Priorité: {task.get_priority_display()}
- Créneau: {task.get_time_slot_display() if task.time_slot else 'Non défini'}
- Échéance: {task.deadline or 'Non définie'}

Membres disponibles:
{json.dumps(member_info, ensure_ascii=False, indent=2)}
"""

    raw = _call_ollama(prompt, system_prompt)

    # Build a username→member lookup
    member_by_username = {m.username: m for m in members}

    try:
        start = raw.find('{')
        end = raw.rfind('}') + 1
        if start >= 0 and end > start:
            data = json.loads(raw[start:end])
            ranked = data.get("ranked_members", [])
            candidates = []
            for item in ranked[:3]:
                uname = item.get("username", "")
                m = member_by_username.get(uname)
                if m:
                    active = m.assigned_tasks.filter(project=task.project).exclude(status='done').count()
                    candidates.append({
                        "pk": m.pk,
                        "username": m.username,
                        "full_name": m.get_full_name() or m.username,
                        "skills": m.skills or "",
                        "active_tasks": active,
                        "confidence": item.get("confidence", 0),
                        "reason": item.get("reason", ""),
                    })
            if candidates:
                return {"members": candidates, "error": None}
    except (json.JSONDecodeError, ValueError):
        pass

    return {"members": [], "error": raw}
