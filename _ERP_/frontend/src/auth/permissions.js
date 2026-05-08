/**
 * Role-based permission helpers
 * Roles: admin, hr_manager, project_manager, team_member
 * 
 * NOTE: These logic rules must exactly mirror app/auth/permissions.py
 */

export const ROLES = {
  ADMIN: 'admin',
  HR_MANAGER: 'hr_manager',
  PROJECT_MANAGER: 'project_manager',
  TEAM_MEMBER: 'team_member',
};

/**
 * Basic role check
 */
export function hasRole(user, allowedRoles) {
  if (!user?.role) return false;
  return allowedRoles.includes(user.role);
}

/**
 * Check if user is admin
 */
export function isAdmin(user) {
  return user?.role === ROLES.ADMIN;
}

/**
 * Admin or HR Manager can manage hiring
 */
export function canManageHiring(user) {
  return [ROLES.ADMIN, ROLES.HR_MANAGER].includes(user?.role);
}

/**
 * Admin or Project Manager can create/manage projects
 */
export function canManageProjects(user) {
  return [ROLES.ADMIN, ROLES.PROJECT_MANAGER].includes(user?.role);
}

/**
 * User can access project if: admin, manager, or member
 */
export function canAccessProject(user, project) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  
  const isManager = project?.manager_id === user.id || project?.manager?.id === user.id;
  const isMember = project?.members?.some(m => (m.id === user.id || m === user.id));
  
  return isManager || isMember;
}

/**
 * User can manage project if: admin, PM role, or project's manager
 */
export function canManageProject(user, project) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (user.role === ROLES.PROJECT_MANAGER) return true;
  
  return project?.manager_id === user.id || project?.manager?.id === user.id;
}

/**
 * Only managers can create tasks
 */
export function canCreateTask(user, project) {
  return canManageProject(user, project);
}

/**
 * Manager or assignee can change task status
 */
export function canEditTaskStatus(user, task, project) {
  if (!user) return false;
  const isManager = canManageProject(user, project);
  const isAssignee = task?.assigned_to?.some(a => (a.id === user.id || a === user.id));
  return isManager || isAssignee;
}

/**
 * Only project manager or admin can reassign tasks
 */
export function canReassignTask(user, project) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return project?.manager_id === user.id || project?.manager?.id === user.id;
}

/**
 * Only managers can delete tasks
 */
export function canDeleteTask(user, project) {
  return canManageProject(user, project);
}

// ── Legacy Aliases ───────────────────────────────────────────────────────────
// These maintain compatibility with existing components (Guard.jsx, etc.)
export const isProjectManager = canManageProject;
export const canEditTask = canEditTaskStatus;

/**
 * Role display labels
 */
export function formatRole(role) {
  if (!role) return '';
  return role.replace(/_/g, ' ');
}
