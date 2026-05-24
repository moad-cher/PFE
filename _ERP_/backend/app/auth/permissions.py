"""
Centralized permission rules - single source of truth
All permission logic lives here. Import and use these helpers everywhere.
"""
from app.users.models import User, RoleEnum
from app.projects.models import Project, Task, ScrumRole


# ── Role Groups ───────────────────────────────────────────────────────────────

ADMIN_ROLES = (RoleEnum.admin,)
HR_ROLES = (RoleEnum.admin, RoleEnum.hr_manager)
PROJECT_MANAGER_ROLES = (RoleEnum.admin, RoleEnum.project_manager)
ALL_ROLES = (RoleEnum.admin, RoleEnum.hr_manager, RoleEnum.project_manager, RoleEnum.team_member)


# ── Core Permission Checks ────────────────────────────────────────────────────

def is_admin(user: User) -> bool:
    """Check if user is admin"""
    return user.role == RoleEnum.admin


def can_manage_hiring(user: User) -> bool:
    """Admin or HR manager can manage hiring"""
    return user.role in HR_ROLES


def can_manage_projects(user: User) -> bool:
    """Admin or project manager can create/manage projects"""
    return user.role in PROJECT_MANAGER_ROLES


# ── Project Permissions ───────────────────────────────────────────────────────

def get_user_scrum_role(user: User, project: Project) -> ScrumRole | None:
    for m in project.members:
        if m.user_id == user.id:
            return m.scrum_role
    return None

def can_access_project(user: User, project: Project) -> bool:
    """User can access project if: admin or member"""
    return (
        is_admin(user)
        or any(m.user_id == user.id for m in project.members)
    )

def can_manage_project(user: User, project: Project) -> bool:
    """User can manage project if: admin, PM role, or PO/Scrum Master"""
    if is_admin(user) or user.role == RoleEnum.project_manager:
        return True
    role = get_user_scrum_role(user, project)
    return role in (ScrumRole.PRODUCT_OWNER, ScrumRole.SCRUM_MASTER)


# ── Task Permissions ──────────────────────────────────────────────────────────

def can_create_task(user: User, project: Project) -> bool:
    """Only managers can create tasks"""
    return can_manage_project(user, project)


def can_edit_task_status(user: User, task: Task, project: Project) -> bool:
    """Manager or assignee can change task status"""
    is_manager = can_manage_project(user, project)
    is_assignee = any(u.id == user.id for u in task.assigned_to)
    return is_manager or is_assignee


def can_reassign_task(user: User, project: Project) -> bool:
    """Only project manager or admin can reassign tasks"""
    if is_admin(user):
        return True
    role = get_user_scrum_role(user, project)
    return role in (ScrumRole.PRODUCT_OWNER, ScrumRole.SCRUM_MASTER)


def can_delete_task(user: User, project: Project) -> bool:
    """Only managers can delete tasks"""
    return can_manage_project(user, project)
