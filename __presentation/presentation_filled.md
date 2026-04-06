---
marp: true
theme: default
paginate: true
backgroundColor: #fff
header: 'Système ERP - État d\'Avancement'
footer: 'Stage de Fin d\'Études | 2026'
---

<!-- _class: lead -->

# **Système ERP Intelligent**
## État d'Avancement du Projet

**Stagiaire**: CHERGUI Moad
**Encadrant**: Aymane [Nom ?]
**Date**: 6 Avril 2026

<!-- 
VISUAL: Photo du stagiaire (disponible dans les images fournies)
-->

---

# **Contexte du Projet**

## 🎯 Problématique

Les entreprises ont besoin d'outils intégrés pour gérer efficacement leurs **ressources humaines** et leurs **projets**.

## ✨ Objectifs

- Automatiser le processus de **recrutement** avec IA
- Fournir un outil complet de **gestion de projets**
- Intégrer l'**intelligence artificielle** pour l'analyse et les suggestions
- Offrir une interface web **intuitive et temps réel**

## 📦 Périmètre

**Module Recrutement** + **Module Gestion de Projets**

---

# **Architecture & Technologies**

## 🏗️ Architecture

**Architecture 3-tiers** : Frontend React + Backend FastAPI + Base de données PostgreSQL

<!-- 
VISUAL: Diagramme d'architecture avec 3 couches:
- Frontend (React + Vite + Tailwind CSS)
- Backend (FastAPI + SQLAlchemy + WebSockets)
- Database (PostgreSQL)
- AI Layer (Ollama LLM)
-->

## 💻 Stack Technique

**Backend**: FastAPI (Python) • PostgreSQL • JWT Auth • WebSockets • Alembic
**Frontend**: React 18 • Vite • Tailwind CSS • Axios • React Router
**IA**: Ollama (LLM local) • PyMuPDF • python-docx
**DevOps**: Git • .env config • Batch scripts

---

# **Modules Implémentés**

## 📊 Gestion de Projets
- Création et configuration de projets
- **Kanban Board** avec drag & drop
- **Scrum Board** avec sprints
- Gestion d'équipes et membres

## ✅ Gestion des Tâches
- Assignation multi-utilisateurs
- Priorités et deadlines
- **Système de récompenses** (points)
- Commentaires en temps réel

---

# **Modules Implémentés** (suite)

## 💼 Recrutement (Hiring)
- Publication d'offres d'emploi
- Formulaire de candidature public
- Upload et stockage de CV (PDF/DOCX)
- Planification d'entretiens

## 💬 Communication
- **Notifications en temps réel** (WebSockets)
- Chat projet et chat tâche
- Alertes deadlines et updates

<!-- 
VISUAL: Screenshot du Dashboard avec les 4 modules visibles
-->

---

# **Intégration IA** 🤖

## 📄 Analyse de CV

- Extraction automatique des compétences
- **Scoring** basé sur les qualifications
- Classement des candidats par pertinence
- Support PDF et DOCX

## 👥 Suggestions d'Assignation

- Analyse des compétences des membres
- Prise en compte de la **charge de travail**
- Recommandations intelligentes

## 💬 Chat LLM (Ollama)

- Génération de descriptions
- Résumés de texte
- Chat conversationnel intégré

<!-- 
VISUAL: Exemple de scoring de CV avec barre de progression et détails
-->

---

# **État d'Avancement**

## ✅ Fonctionnalités Complétées (75-80%)

**Backend:**
- ✅ Auth JWT + Gestion utilisateurs (rôles, profils, avatars)
- ✅ CRUD complet (Projets, Tâches, Jobs, Applications)
- ✅ WebSocket manager (notifications + chat temps réel)
- ✅ Intégration IA Ollama (CV, suggestions, chat)
- ✅ Migrations DB avec Alembic

**Frontend:**
- ✅ Pages authentification + Dashboard
- ✅ Kanban Board interactif (drag & drop)
- ✅ Gestion projets/tâches/équipes
- ✅ Module recrutement complet
- ✅ Chat temps réel + notifications live

---

# **État d'Avancement** (suite)

## 🚧 En Cours

- 🚧 Scrum Board (raffinements UI)
- 🚧 Système de permissions avancé
- 🚧 Bulk appraisal de CV pour un poste
- 🚧 Visualisations (pie charts de progression)

## 📋 Fonctionnalités Planifiées

- 📋 Diagramme de Gantt
- 📋 Calendrier personnel
- 📋 Départements et hiérarchie
- 📋 Analytics et rapports
- 📋 RAG pour analyse groupée de CV
- 📋 @mentions dans les commentaires

---

# **Démonstration** 🎬

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

VISUAL: Captures d'écran pour chaque partie si démo non disponible
-->

---

<!-- _class: lead -->

# **Statistiques du Projet** 📊

**Backend**: 8 modules • ~3500 lignes de code
**Frontend**: 20+ pages • 40+ composants
**Base de données**: 15+ tables
**API**: 60+ endpoints REST + WebSocket
**Tests**: Tests unitaires et d'intégration

**Technologies maîtrisées**: 
Python • FastAPI • React • PostgreSQL • WebSockets • LLM • TailwindCSS

---

<!-- _class: lead -->

# **Merci pour votre attention** 🙏

## Questions ?

**Email**: chergui.moad@example.com
**GitHub**: [Lien vers le repo si applicable]

---
