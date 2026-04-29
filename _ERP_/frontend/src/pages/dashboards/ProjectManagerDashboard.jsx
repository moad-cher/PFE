import { useState, useEffect, useMemo } from 'react';
import { getProjectStats, listProjects, getDashboard, getProjectManagerOverview } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { cardRegistry } from '../../components/dashboard/cardRegistry';
import Spinner from '../../components/ui/Spinner';

const KANBAN_STATUS_COLORS = {
  todo: '#e74c3c',
  in_progress: '#f39c12',
  review: '#3498db',
  done: '#2ecc71',
};

export default function ProjectManagerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [overview, setOverview] = useState(null);
  const [tasksDueThisWeek, setTasksDueThisWeek] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, projectsRes, dashboardRes, overviewRes] = await Promise.all([
        getProjectStats(),
        listProjects(),
        getDashboard(),
        getProjectManagerOverview(),
      ]);
      setStats(statsRes.data);
      
      // Filter projects to only show those the user is involved in
      const userProjects = projectsRes.data.filter(project => {
        const isManager = project.manager?.id === user?.id;
        const isMember = project.members?.some(member => member.id === user?.id);
        return isManager || isMember;
      });
      setProjects(userProjects);
      
      setDashboardData(dashboardRes.data);
      setOverview(overviewRes.data);

      // Filter tasks due this week
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);

      const dueThisWeek = (dashboardRes.data.my_tasks || []).filter(task => {
        if (!task.end_time) return false;
        const endTime = new Date(task.end_time);
        return endTime >= today && endTime <= nextWeek && task.status !== 'done';
      });
      setTasksDueThisWeek(dueThisWeek);
    } catch (err) {
      setError('Failed to load project manager dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Team workload chart data
  const workloadData = useMemo(() => {
    if (!overview?.projects) return [];
    // Aggregate workload across all projects
    const workloadMap = {};
    overview.projects.forEach(proj => {
      // Would need additional data for full workload
    });
    return [];
  }, [overview]);

  // Project completion chart data
  const projectCompletionData = useMemo(() => {
    if (!overview?.projects) return [];
    return overview.projects.map(p => ({
      name: (p.name || p.project_name || 'Untitled').length > 15
        ? (p.name || p.project_name || 'Untitled').slice(0, 15) + '...'
        : (p.name || p.project_name || 'Untitled'),
      completion: (() => {
        const raw = Number(p.completion_rate);
        if (!Number.isFinite(raw)) return 0;
        const percent = raw > 0 && raw <= 1 ? raw * 100 : raw;
        return Math.max(0, Math.min(100, Number(percent.toFixed(2))));
      })(),
      tasks: Number(p.total_tasks ?? p.tasks_count) || 0,
    }));
  }, [overview?.projects]);

  // Task status distribution
  const taskStatusData = useMemo(() => {
    if (!stats) return [];
    const done = Number(stats.completed_tasks) || 0;
    const active = Math.max(0, (Number(stats.total_tasks) || 0) - done);
    return [
      { name: 'Completed', value: done, fill: KANBAN_STATUS_COLORS.done },
      { name: 'In Progress', value: active, fill: KANBAN_STATUS_COLORS.in_progress },
    ];
  }, [stats]);

  // Priority distribution
  const priorityData = useMemo(() => {
    const priorities = {};
    dashboardData?.my_tasks?.forEach(task => {
      const p = task.priority || 'medium';
      priorities[p] = (priorities[p] || 0) + 1;
    });
    return Object.entries(priorities).map(([name, value]) => ({ name, value }));
  }, [dashboardData?.my_tasks]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>
      </div>
    );
  }

  const dashboardCards = cardRegistry.filter(card => card.roles.includes('project_manager'));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Project Manager Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage projects and team workload</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardCards.map(card => {
          const CardComponent = card.component;
          const cardProps = {};

          if (card.id === 'pm-stats') { cardProps.overview = overview; cardProps.stats = stats; }
          if (card.id === 'pm-charts') { cardProps.projectCompletionData = projectCompletionData; cardProps.taskStatusData = taskStatusData; }
          if (card.id === 'pm-projects-list') { cardProps.projects = projects; cardProps.overview = overview; cardProps.user = user; }
          if (card.id === 'pm-tasks-due') { cardProps.tasksDueThisWeek = tasksDueThisWeek; }
          if (card.id === 'pm-overview-summary') { cardProps.overview = overview; }

          return (
            <div key={card.id} className={card.layout?.gridClass || ''}>
              <CardComponent {...cardProps} />
            </div>
          );
        })}
      </div>
    </div>
  );
}





