---
marp: true
paginate: true
math: true
meta:
  title: "Système ERP Intelligent - État d'Avancement du Projet"
  description: "Présentation de l'état d'avancement du projet de Système ERP Intelligent, couvrant les objectifs, l'architecture, les modules implémentés et les fonctionnalités IA."
---

<!-- backgroundImage: url('https://slidescorner.com/wp-content/uploads/2022/09/03-Heidi-Pastel-Abstract-Organic-Shapes-Background-by-SlidesCorner-1024x576.jpg') -->
<!-- _class: lead -->
<style>
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');

/* Global */
section {

    
  font-family: 'Poppins', 'Segoe UI', sans-serif;
  padding: 50px 70px;
  color: #2d3748;
  line-height: 1.6;
}

/* Titles - Deep coral/terracotta to complement pastel peach */
h1 {
  color: #c2564a;
  font-size: 2.1em;
  font-weight: 700;
  border-bottom: 4px solid #e8998d;
  padding-bottom: 0.3em;
  margin-bottom: 0.6em;
}

h2 {
  color: #3e7d9be9;
  
  font-size: 1.45em;
  font-weight: 600;
  margin-top: 1.2em;
  margin-bottom: 0.7em;
}

/* Lead slides (title/end pages) */
section.lead {
  text-align: center;
  justify-content: center;
}

section.lead h1 {
  font-size: 3em;
  color: #9e3c3c;
  border: none;
  border-bottom: 6px solid #9e3c3c;
  text-shadow: 1px 5px 5px rgba(20, 91, 162, 0.64);
}


/* Lists */
ul { margin-left: 1.2em; }
li { margin-bottom: 0.6em; }
li::marker { color: #c2564a; }

/* Bold text - Teal blue to complement the light blue in background */
strong {
  color: #439a9a;
  font-weight: 600;
}


/* Section title slides */
section.section-title {
  text-align: center;
  justify-content: center;
}

section.section-title h1 {
  font-size: 3em;
  color: #9e3c3c;
  border: none;
  text-shadow: 2px 2px 4px rgba(255,255,255,0.6);
}

/* Footer/Header */
footer, header {
  color: #7a8a8a;
  font-size: 0.75em;
}

/* other */
/* Prefer parent selectors when available, with fallback */
td:has(y) {
  color: #1ad270 !important;
  font-weight: 600;
  background: rgba(0, 255, 0, 0.1) !important;
}
td:has(n) {
  color: #ff4c4c !important;
  font-weight: 600;
  background: rgba(255, 0, 0, 0.1) !important;
}
td:has(y)::before {
  content: "✓";
  margin-right: 0.25em;
}
td:has(n)::before {
  content: "✕";
  margin-right: 0.25em;
}


</style>

<!-- _paginate: false -->

# Système ERP Intelligent
## Point d'avancement

**Stagiaire**: Moad CHERGUI
**Encadrant**: prof Mourad JABRANE
**Date**: 16 Avril 2026

---

# Plan rapide
<!-- don't touch -->
- La problématique abordée
- La solution proposée
- Les technologies utilisées
- L'état d'avancement
- Les difficultés rencontrées

---

# 1) Problématique abordée

---


- Les équipes utilisent outils séparés pour RH, projets et communication.
- Résultat: suivi fragmenté, duplication des données, décisions lentes.
- Besoin principal: une plateforme unique pour recrutement + exécution projet.

---

# 2) Solution proposée

---


- ERP web modulaire avec 2 blocs cœur:
  - **Recrutement intelligent** (offres, candidatures, scoring IA).
  - **Gestion de projets** (projets, tâches, collaboration temps réel).
- Architecture 3 tiers: **React** + **FastAPI** + **PostgreSQL**.
- Objectif: fluidifier du recrutement jusqu'à la livraison projet.

---

<center>

![Diagramme d'architecture height:520px](./imgs/Untitled%20Diagram-2026-04-06T08-55-18.svg)

**Vue simplifiée de l'architecture**
</center>

---

# 3) Technologies utilisées

---


- **Backend**: FastAPI, SQLAlchemy async, PostgreSQL, WebSockets.
- **Frontend**: React, Tailwind CSS, Axios, Recharts.
- **IA**: Ollama local, PyMuPDF, python-docx.
- **Qualité/Outillage**: Alembic, Pytest, Git.

---

# 4) État d'avancement de l'implémentation

---

## Déjà implémenté
- Auth JWT + gestion des rôles.
- Recrutement: offres, candidatures, upload CV, analyse IA.
- Projets: dashboard, kanban, tâches, assignation, notifications, chat.

## En cours
- Stabilisation des permissions selon rôle.
- Fiabilisation UX/API (erreurs 500, retours API cohérents).

---

# 5) Difficultés rencontrées

---


- **Permissions complexes** selon rôles (admin, RH, manager, membre).
- **Erreurs backend intermittentes** après mutation (sérialisation relationnelle).
- **Problèmes de cohérence API** entre endpoints legacy et nouveaux endpoints.
- **Intégration IA**: qualité variable des CV selon format (PDF/DOCX).

## Actions prises
- Harmonisation des routes critiques.
- Chargement explicite des relations avant réponse API.
- Renforcement des tests de flux dashboard/admin.

---

# Prochaines étapes (court terme)

- Finaliser matrice permissions par module.
- Ajouter tests de non-régression sur endpoints critiques.
- Terminer analyse groupée des CV pour un poste.
- Préparer mini démonstration stable orientée métier.

---

<!-- _class: lead -->

# Merci pour votre attention

## Questions ?

<br><br>


**Email**: moadchergui13@gmail.com
**GitHub**: [moad-cher](https://github.com/moad-cher/PFE)

---
<!-- paginate: false -->

```python
print("hello world")
```

---
stuff  i don't know where to put but want to mention:
*matrice des permissions*

| Action | admin | hr_manager | project_manager | team_member |
|--------|-------|------------|-----------------|-------------|
| View all users | <y/> | <y/> | <n/> | <n/> |
| Edit user profile (own) | <y/> | <y/> | <y/> | <y/> |
| Edit user profile (others) | <y/> | <y/> | <n/> | <n/> |
| Change roles | <y/> | <n/> | <n/> | <n/> |
| Activate/deactivate | <y/> | <y/> | <n/> | <n/> |
| Delete user (hard) | <y/> | <n/> | <n/> | <n/> |
| Manage departments | <y/> | <y/> | <n/> | <n/> |
| Create job posting | <y/> | <y/> | <n/> | <n/> |
| View applications | <y/> | <y/> | <n/> | <n/> |
| Create project | <y/> | <n/> | <y/> | <n/> |
| Assign tasks | <y/> | <n/> | <y/> | <n/> |
| View own tasks | <y/> | <y/> | <y/> | <y/> |