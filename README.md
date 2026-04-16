# ERP System requirements and features
<!-- (cahier de charges summary) -->

## hiring
- [x] HR manager can create job postings
- [x] condidats can apply for job postings via a web form
- [x] resumes are stored
- [x] AI will analyse resumes and rank candidates based on qualifications
    - [ ] bulk appraisal of candidates for a job posting
- [x] HR manager can review ranked candidates and schedule interviews

## project management
every project has tasks, deadlines, and tasks have assigned team members.
### task management

- [x] show who is assigned to each task in task view
- [x] show tasks assigned to each team member in members view
- [x] allow team members to update task status and add comments
- [x] send notifications to team members when tasks are updated or deadlines are approaching
- [x] allow project managers to reassign tasks and adjust deadlines as needed
- [x] reward team members with points for completing tasks on time
- [ ] proper permissions system with roles (admin, manager, employee)
    - [x] rh and admin can manage accounts
    - [ ] kanban permissions (only the concerned who shall update the task status)
    - [ ] scrum roles (a whole other story)

- [x] AI suggests task assignments based on team members' skills and workload

- [x] chaque employé a un profil avec ses compétences et son historique de travail


# what i'm thinking right now

thesis would be on 10/06/2026
but i need to understand where i'm going and to delever something reflecting good understanding of AI agents, ML and/or data 
i don't want a simple AI engineering project or an AI wrapper. tool call with structured output seems to be the most basic form of AI agents

| What                                   |     Why it matters for thesis      |
| -------------------------------------- | :--------------------------------: |
| ML models as LLM tools                 |    Core thesis argument (maybe)    |
| Agentic loop with multi-tool reasoning |    Shows you understand agents     |
| Bulk resume appraisal                  | Showcases the ML pipeline at scale |

what to search for:
- how to use ML models as tools in an agentic loop
- semantic parsing of unstructured data (resumes) into structured data for ML model input
- elastic search , redis , pg vector

# features by priority



## high priority

<!-- 
### my supervisors recommendations (to do ASAP):
- [x] each role with its own dashboard and features

    - admin
        - [x] dashboards avec tous les statistiques (hiérarchie, projets, employés ...etc)
        - [x] gestion des utilisateurs et leurs roles
            - [x] CRUD des comptes utilisateurs
               - [x] création de compte par admin
               - [x] activation/désactivation de comptes
            - [x] assignation des rôles
        - [x] gestion des départements

    - RH
        - [x] dashboard des statistiques CVs , **utilisateurs** ...etc

    - chef de projet 
        - [x] dashboard (charts and all stats related to projects and teams) 
-->

- scrum
    - [ ] actual scrum board view with sprints and story points
    - [ ] kanban board shows current sprint tasks

- kanban permissions:
    - [ ] only assigned members can update task status
    - [ ] only project manager can reassign tasks and adjust deadlines



## medium priority
- [ ] resume bulk appraisal for a job posting
- [ ] gantt for projects <!-- with assignees displayed and deadlines and milestones -->
- [ ] assignment suggestions should be integrated into the assignment component



## low priority
- [ ] calendar for users
    - [ ] interview scheduling for HR manager
    - [ ] tasks time tracking for team members

- @mentions in group chat and comments



# to do if i have time
  - [ ] AI drafts
      - [ ] project parameters as json response
          - [ ] tasks
          - [ ] gantt chart
  - [ ] suggest next steps for projects based on progress and deadlines

# role permissions matrix

| Action | admin | hr_manager | project_manager | team_member |
|--------|-------|------------|-----------------|-------------|
| View all users | ✓ | ✓ | ✕ | ✕ |
| Edit user profile (own) | ✓ | ✓ | ✓ | ✓ |
| Edit user profile (others) | ✓ | ✓ | ✕ | ✕ |
| Change roles | ✓ | ✕ | ✕ | ✕ |
| Activate/deactivate | ✓ | ✓ | ✕ | ✕ |
| Delete user (hard) | ✓ | ✕ | ✕ | ✕ |
| Manage departments | ✓ | ✓ | ✕ | ✕ |
| Create job posting | ✓ | ✓ | ✕ | ✕ |
| View applications | ✓ | ✓ | ✕ | ✕ |
| Create project | ✓ | ✕ | ✓ | ✕ |
| Assign tasks | ✓ | ✕ | ✓ | ✕ |
| View own tasks | ✓ | ✓ | ✓ | ✓ |

