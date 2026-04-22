import { useAuth } from '../context/AuthContext';
import { hasRole, canManageHiring, canManageProjects, isProjectManager, canEditTask, ROLES } from '../utils/permissions';

/**
 * Conditional rendering wrapper based on user role
 *
 * Usage:
 * <Guard role="admin">...</Guard>
 * <Guard roles={['admin', 'hr_manager']}>...</Guard>
 * <Guard canManageHiring>...</Guard>
 * <Guard canManageProjects>...</Guard>
 * <Guard isProjectManager project={project}>...</Guard>
 * <Guard canEditTask task={task} project={project}>...</Guard>
 */
export default function Guard({
  children,
  role,
  roles,
  canManageHiring: checkHiring,
  canManageProjects: checkProjects,
  isProjectManager: checkPM,
  canEditTask: checkEditTask,
  project,
  task,
  fallback = null,
}) {
  const { user } = useAuth();

  let allowed = false;

  if (role) {
    allowed = hasRole(user, [role]);
  } else if (roles) {
    allowed = hasRole(user, roles);
  } else if (checkHiring) {
    allowed = canManageHiring(user);
  } else if (checkProjects) {
    allowed = canManageProjects(user);
  } else if (checkPM) {
    allowed = isProjectManager(user, project);
  } else if (checkEditTask) {
    allowed = canEditTask(user, task, project);
  }

  if (!allowed) return fallback;

  return children;
}

/**
 * Render function for inline use
 * Example: {Guard.render({ roles: ['admin'] }, () => <button>Edit</button>)}
 */
Guard.render = (props, renderFn) => {
  const { user } = useAuth();

  let allowed = false;
  if (props.role) allowed = hasRole(user, [props.role]);
  else if (props.roles) allowed = hasRole(user, props.roles);
  else if (props.canManageHiring) allowed = canManageHiring(user);
  else if (props.canManageProjects) allowed = canManageProjects(user);
  else if (props.isProjectManager) allowed = isProjectManager(user, props.project);
  else if (props.canEditTask) allowed = canEditTask(user, props.task, props.project);

  return allowed ? renderFn() : null;
};

/**
 * Hook for programmatic access
 * Example: const { canEdit } = usePermissions();
 */
export function usePermissions({ project, task } = {}) {
  const { user } = useAuth();

  return {
    user,
    canManageHiring: canManageHiring(user),
    canManageProjects: canManageProjects(user),
    isProjectManager: isProjectManager(user, project),
    canEditTask: canEditTask(user, task, project),
    hasRole: (roles) => hasRole(user, roles),
    isAdmin: hasRole(user, [ROLES.ADMIN]),
    isHR: hasRole(user, [ROLES.HR_MANAGER]),
    isPM: hasRole(user, [ROLES.PROJECT_MANAGER]),
  };
}
