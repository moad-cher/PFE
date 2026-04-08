---
marp: true
paginate: true
math: true
meta:
  title: "Système ERP Intelligent - État d'Avancement du Projet"
  description: "Présentation de l'état d'avancement du projet de Système ERP Intelligent, couvrant les objectifs, l'architecture, les modules implémentés et les fonctionnalités IA."
---

<script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
<script>mermaid.initialize({startOnLoad:true});</script>

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

/* Code */
code {
  background: rgba(255, 255, 255, 0.7);
  padding: 2px 6px;
  border-radius: 4px;
  color: #9e3c3c;
  font-size: 0.9em;
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
</style>

# Système ERP Intelligent
## État d'Avancement du Projet

**Stagiaire**: Moad CHERGUI
**Encadrant**: Aymane BENDHAIBA
**Date**: 6 Avril 2026

---

<!-- _class: section-title -->

# Contexte du Projet

---

## Problématique

Les entreprises ont besoin d'outils intégrés pour gérer efficacement leurs **ressources humaines** et leurs **projets**.

---

## Objectifs

- Automatiser le **recrutement** avec analyse IA des CV
- Fournir un outil complet de **gestion de projets**
- Offrir une interface web **intuitive et temps réel**

## Périmètre

**Module Recrutement** + **Module Gestion de Projets**

---

<!-- _class: section-title -->

# Architecture & Technologies

---

## Architecture

**Architecture 3-tiers** : Frontend React + Backend FastAPI + Base de données PostgreSQL


## Stack Technique

**Backend**: FastAPI (Python) $\cdot$ PostgreSQL $\cdot$ JWT Auth $\cdot$ WebSockets
**Frontend**: React $\cdot$ Tailwind CSS
**IA**: Ollama (LLM local 1b) $\cdot$ PyMuPDF $\cdot$ python-docx
**DevOps**: Git $\cdot$ (Future: Docker $\cdot$ GitHub Actions)

---
<center>

![Diagramme d'architecture height:550px ](./imgs/Untitled%20Diagram-2026-04-06T08-55-18.svg)

**vue simplifiée de l'architecture**
</center>

---

<!-- _class: section-title -->
<!-- 

# Choix Technologiques

---

## FastAPI
- Architecture **async/await native** → Performance optimale avec WebSockets
- Validation Pydantic intégrée → Moins d'erreurs

## PostgreSQL
- Relations complexes (projets $\leftrightarrow$ tâches $\leftrightarrow$ utilisateurs)
- Support **SQLAlchemy async** $\rightarrow$ Cohérence avec FastAPI
- Robustesse en production

---

## React
- Composants réutilisables → Moins de duplication de code
- Écosystème riche (React Router, Context API)
- Interface réactive

## Ollama3.2:1b (LLM local léger pour le moment)
- **Aucune dépendance cloud** → Pas de coûts API
- Confidentialité des données RH
- Contrôle total sur le modèle

---

## WebSockets
- Communication **bidirectionnelle temps réel**
- Notifications instantanées + chat en direct

---
-->

<!-- _class: section-title -->

# Modules Implémentés

---

## Gestion de Projets
- Création et configuration de projets
- **Kanban Board** avec drag & drop
- Gestion d'équipes et membres

## Gestion des Tâches
- Assignation multi-utilisateurs
- Priorités et deadlines
- **Système de récompenses** (points)

---

## Recrutement
- Publication d'offres d'emploi
- Formulaire de candidature public
- Upload et stockage de CV (PDF/DOCX)

## Communication
- **Notifications en temps réel** (WebSockets)
- Commentaires sur tâches
- Chat projet et chat tâche

<!-- 
VISUAL: Screenshot du Dashboard avec les 4 modules visibles
-->

---

<!-- _class: section-title -->

# Intégration IA

---

## Analyse de CV

- Extraction automatique des compétences
- **Scoring** basé sur les qualifications
- Classement des candidats par pertinence

## Suggestions d'Assignation

- Analyse des compétences des membres
- Prise en compte de la **charge de travail**

---
![classement des candidats](./imgs/classement-des-candidats.jpeg)

---
![scoring CV](./imgs/analyse-de-cv.jpeg)


---

![suggestions d'assignation](./imgs/suggestion-d'assignation.jpeg)

---

<!-- _class: section-title -->

# Démonstration

---

<!--
DÉMONSTRATION LIVE:

1. Login et Dashboard
   - Afficher les stats
   - Voir les notifications

2. Kanban Board
   - Drag & drop de tâches
   - Changer les statuts
   - Voir les assignations

3. Module Recrutement
   - Créer une offre d'emploi
   - Voir les candidatures
   - Afficher le scoring IA d'un CV

4. Chat Temps Réel
   - Envoyer un message dans le chat projet
   - Notification instantanée

-->

---

<!-- _class: section-title -->

# À faire

---

## En Cours

- Analyse groupée de CV pour un poste
- Visualisations (graphiques de progression)
- Raffinement du système de permissions et roles

---

## Fonctionnalités Planifiées

- @ mentions dans les commentaires et conversations
- Scrum Board (gestion des sprints, backlogs ...etc)
- Diagramme de Gantt
- Calendrier personnel
- Gestion des départements et hiérarchie

---

<!-- _class: lead -->

# Merci pour votre attention

## Questions ?

<br><br>


**Email**: moadchergui13@gmail.com
**GitHub**: [moad-cher](https://github.com/moad-cher/PFE)

---
<!-- paginate: false -->
