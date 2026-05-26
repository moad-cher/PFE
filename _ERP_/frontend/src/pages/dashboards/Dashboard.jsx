import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AdministrationDashboard from './AdministrationDashboard';
import HiringDashboard from './HiringDashboard';
import ProjectsDashboard from './ProjectsDashboard';
import EmployeeDashboard from './EmployeeDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab');

  if (!user) return null;

  // Role-based dashboard mapping
  const dashboards = useMemo(() => {
    const list = [];
    if (user.role === 'admin' || user.role === 'hr_manager') {
      list.push({ id: 'administration', component: AdministrationDashboard });
      list.push({ id: 'hiring', component: HiringDashboard });
    }
    if (user.role === 'admin' || user.role === 'project_manager') {
      list.push({ id: 'projects', component: ProjectsDashboard });
    }
    if (user.role === 'employee' || list.length === 0) {
      list.push({ id: 'tasks', component: EmployeeDashboard });
    }
    return list;
  }, [user.role]);

  const currentTabId = activeTab || dashboards[0].id;
  const activeDashboard = dashboards.find(d => d.id === currentTabId) || dashboards[0];
  const ActiveComponent = activeDashboard.component;

  return (
    <div className="min-h-screen bg-gray-50/50 pt-4">
      {/* Active Dashboard Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <ActiveComponent />
      </div>
    </div>
  );
}
