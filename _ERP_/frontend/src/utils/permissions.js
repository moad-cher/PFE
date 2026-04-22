/**
 * Role-based permission helpers
 * Roles: admin, hr_manager, project_manager, team_member
 */

export const ROLES = {
  ADMIN: 'admin',
  HR_MANAGER: 'hr_manager',
  PROJECT_MANAGER: 'project_manager',
  TEAM_MEMBER: 'team_member',
};

/**
 * Check if user has one of the required roles
 * @param {Object} user - User object with role property
 * @param {string[]} allowedRoles - Array of allowed role slugs
 * @returns {boolean}
 */
export function hasRole(user, allowedRoles) {
  if (!user?.role) return false;
  return allowedRoles.includes(user.role);
}

/**
 * Admin or HR Manager can manage hiring
 */
export function canManageHiring(user) {
  return hasRole(user, [ROLES.ADMIN, ROLES.HR_MANAGER]);
}

/**
 * Admin, HR Manager or Project Manager can manage projects
 */
export function canManageProjects(user) {
  return hasRole(user, [ROLES.ADMIN, ROLES.PROJECT_MANAGER]);
}

/**
 * Check if user is project manager (admin, PM, or project's manager)
 */
export function isProjectManager(user, project) {
  if (hasRole(user, [ROLES.ADMIN, ROLES.PROJECT_MANAGER])) return true;
  return project?.manager?.id === user?.id;
}

/**
 * Check if user can edit task (manager or assignee)
 */
export function canEditTask(user, task, project) {
  return isProjectManager(user, project) || task?.assigned_to?.some(a => a.id === user?.id);
}

/**
 * Role display labels
 */
export function formatRole(role) {
  if (!role) return '';
  return role.replace(/_/g, ' ');
}
