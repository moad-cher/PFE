# cahier de charges summary

## hiring
- [x] HR manager can create job postings
- [x] condidats can apply for job postings via a web form
- [x] resumes are stored
- [x] AI will analyse resumes and rank candidates based on qualifications
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
    - [x] kanban permissions (only the concerned who shall update the task status)
    - [ ] scrum (in progess)

- [x] AI suggests task assignments based on team members' skills and workload

- [x] chaque employé a un profil avec ses compétences et son historique de travail


# what i'm thinking right now

thesis would be on 10/06/2026
but i need to understand where i'm going and to delever something reflecting good understanding of AI agents, ML and/or data 
i don't want a simple AI engineering project or an AI wrapper. tool call with structured output seems to be the most basic form of AI agents

| What                                   |     Why it matters for thesis      |
| -------------------------------------- | :--------------------------------: |
| ML models as LLM tools                 |    Core thesis argument (maybe)    |
| Agentic loop with multi-tool reasoning |    Shows i understand agents     |
| Bulk resume appraisal                  | Showcases the ML pipeline at scale |

# features

## AI

### project assistance workflow:

workflow (skill with defined tool use or organique json output):

- **fn 1:** suggest project name description and project backlog if one of them is provided
- **fn 2:** suggest sprints backlogs decomposition and tasks based on product backlog
- **fn3:** eterative refinement with previous sprint retrospection analysis
~~- **fn 4:** suggest task assignment~~ (partially implemented, not so important for now)


## dev

### high priority

- [ ] scrum
    - [ ] working sprints
        - [ ] sprint goal and retrospective notes
        - [ ] sprint backlog
        - [ ] separate scrum board view with swimlanes for each sprint and backlog items colored by status
    - [ ] in project details instead of recent tasks, show horizontally scrollable gantt chart with colored tasks, assignees, with sprints separated (like an area or something) and current sprint highlighted and current day marked


### medium priority
- [ ] resume bulk appraisal for a job posting
- [ ] assignment suggestions should be integrated into the assignment component

### low priority
- [ ] calendar for users
    - [ ] interview scheduling for HR manager
    - [ ] tasks time tracking for team members

- @mentions in group chat and comments



# to do if i have time


# role permissions matrix

| Action                     | admin | hr_manager | project_manager | team_member |
| -------------------------- | :---: | :--------: | :-------------: | :---------: |
| View all users             |  ✓   |     ✓     |       ✕        |     ✕      |
| Edit user profile (own)    |  ✓   |     ✓     |       ✓        |     ✓      |
| Edit user profile (others) |  ✓   |     ✓     |       ✕        |     ✕      |
| Change roles               |  ✓   |     ✕     |       ✕        |     ✕      |
| Activate/deactivate        |  ✓   |     ✓     |       ✕        |     ✕      |
| Delete user (hard)         |  ✓   |     ✕     |       ✕        |     ✕      |
| Manage departments         |  ✓   |     ✓     |       ✕        |     ✕      |
| Create job posting         |  ✓   |     ✓     |       ✕        |     ✕      |
| View applications          |  ✓   |     ✓     |       ✕        |     ✕      |
| Create project             |  ✓   |     ✕     |       ✓        |     ✕      |
| Assign tasks               |  ✓   |     ✕     |       ✓        |     ✕      |
| View own tasks             |  ✓   |     ✓     |       ✓        |     ✓      |

