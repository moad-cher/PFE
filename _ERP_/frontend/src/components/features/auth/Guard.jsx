import { useAuth } from '../../../context/AuthContext';
import { 
  hasRole, 
  canManageHiring, 
  canManageProjects, 
  isProjectManager, 
  canEditTask, 
  ROLES 
} from '../../../utils/permissions';

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

  if (!user) return fallback;

  let allowed = false;

  // Combine checks (Logical OR)
  if (role && hasRole(user, [role])) allowed = true;
  if (roles && hasRole(user, roles)) allowed = true;
  if (checkHiring && canManageHiring(user)) allowed = true;
  if (checkProjects && canManageProjects(user)) allowed = true;
  if (checkPM && isProjectManager(user, project)) allowed = true;
  if (checkEditTask && canEditTask(user, task, project)) allowed = true;

  if (!allowed) return fallback;

  return children;
}

/**
 * Hook for programmatic access
 * Example: const { canEditTask } = usePermissions({ project, task });
 */
export function usePermissions({ project, task } = {}) {
  const { user } = useAuth();

  return {
    user,
    // Booleans (legacy support & convenience)
    canManageHiring: canManageHiring(user),
    canManageProjects: canManageProjects(user),
    isProjectManager: isProjectManager(user, project),
    canEditTask: canEditTask(user, task, project),
    
    // Functional helpers (flexible)
    checkHiring: () => canManageHiring(user),
    checkProjects: () => canManageProjects(user),
    checkPM: (p) => isProjectManager(user, p || project),
    checkEditTask: (t, p) => canEditTask(user, t || task, p || project),
    
    hasRole: (roles) => hasRole(user, roles),
    isAdmin: hasRole(user, [ROLES.ADMIN]),
    isHR: hasRole(user, [ROLES.HR_MANAGER]),
    isPM: hasRole(user, [ROLES.PROJECT_MANAGER]),
  };
}


