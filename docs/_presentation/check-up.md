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
  color: #cf4949;
  border: none;
  border-bottom: 6px solid #d74f4f;
  text-shadow: 1px 5px 5px rgba(189, 43, 43, 0.64);
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

table {
  font-size: 0.8em;
  background: rgba(255, 255, 255, 0.8);
  /* center */
  margin-left: auto;
  margin-right: auto;
  border: 1px solid;
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


- ERP web modulaire avec 2 blocs coeur:
  - **Recrutement intelligent**: offres, candidatures, parsing CV, scoring IA.
  - **Gestion de projets**: projets, taches, assignation, notifications, chat.
- Architecture 3 tiers: **React** + **FastAPI** + **PostgreSQL**.
- Logique IA: outils ML/LLM pour aide a la decision (RH + PM).
- Objectif: fluidifier le flux de travail du recrutement jusqu'a la livraison.

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

## Pourquoi ce choix
- Stack async coherente pour le temps reel.
- Base relationnelle robuste pour roles, projets, taches, candidatures.
- IA locale pour confidentialite des donnees RH.

---

# 4) État d'avancement de l'implémentation

---

## Livré
- Authentification JWT + gestion utilisateurs (admin/RH/PM/membre).
- dashboards personnalisés par role (statistiques CV, projets, utilisateurs). 
- Recrutement: creation d'offres, candidatures web, stockage CV, scoring IA, tri des candidats.
- Projet/Taches: assignation, suivi par membre, commentaires, group-chat, notifications deadline, recompenses.
- IA: suggestions d'assignation selon competences et charge , classification unitaire des CV.

---
 
**Matrice des permissions**

---

| Action | admin | HR | PM | team_member |
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

---

## Partiellement livré
- Permissions par role: règles kanban à finaliser.

## Non livré
- Evaluation groupee des CV pour une offre.
- Scrum board (sprints, story points) + vue sprint dans kanban.

---

# 5) Difficultés rencontrées

---

- Permissions metier plus complexes que prevu (cas admin/RH/PM/membre).
- Incoherences entre certains endpoints (formats de reponse differents).
- Qualite des CV variable (PDF scannes, DOCX mal structures).


---

## Actions prises

- Matrice permissions explicite par role et par action critique.
- Standardisation progressive des reponses API (codes et messages).
- Pipeline d'analyse CV avec controles de format et fallback.


---

# Priorités produit

---

## Haute priorité
- Scrum board reel (sprints + story points).
- Kanban filtre par sprint courant.
- Permissions kanban strictes:
  - seul le membre assigne modifie le statut.
  - seul le chef de projet re-assigne et change les deadlines.

---

## Moyenne priorité
- Bulk appraisal CV par offre.
- Diagramme de Gantt projet.
- Integration des suggestions IA dans le composant d'assignation.

## Basse priorité
- Calendrier (entretiens RH + suivi temps taches).
- Mentions @ dans commentaires et chat.

---


# l'objectif PFE (IA/ML/Agents)

| Axe | Ce qui est deja fait | Prochaine etape demonstrable |
|-----|-----------------------|-------------------------------|
| Parsing semantique CV | Extraction + scoring IA unitaire | Normaliser en features structurees |
| ML comme outil d'agent | Suggestions d'assignation | Boucle agentique multi-outils (profil, charge, historique) |
| Evaluation a l'echelle | Classement candidat par candidat | Bulk appraisal d'une offre complete |

---

<!-- _class: lead -->

# Merci pour votre attention

## Questions ?

<br><br>


**Email**: moadchergui13@gmail.com
**GitHub**: [moad-cher](https://github.com/moad-cher/PFE)

---
<!-- paginate: false -->
