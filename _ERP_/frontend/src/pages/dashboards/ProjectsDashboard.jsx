import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE, getProjectStats, listProjects, getDashboard, getProjectManagerOverview } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/shared/ui/Spinner';
import StatusBadge from '../../components/shared/ui/StatusBadge';
import PriorityBadge from '../../components/shared/ui/PriorityBadge';
import DashboardChartCard from '../../components/shared/cards/DashboardChartCard';
import StatCard from '../../components/shared/cards/StatCard';
import { CHART_TYPES } from '../../components/shared/cards/DashboardChartRegistry';
import TaskEdit from '../projects/TaskEdit';
import { usePermissions } from '../../auth/Guard';

const KANBAN_STATUS_COLORS = {
  todo: '#e74c3c',
  in_progress: '#f39c12',
  review: '#3498db',
  done: '#2ecc71',
};

export default function ProjectsDashboard() {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [overview, setOverview] = useState(null);
  const [tasksDueThisWeek, setTasksDueThisWeek] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingTask, setEditingTask] = useState(null);

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
      
      // If Admin, show all projects. Otherwise, filter by membership.
      const displayProjects = isAdmin 
        ? projectsRes.data 
        : projectsRes.data.filter(project => {
            const isManager = project.manager?.id === user?.id;
            const isMember = project.members?.some(member => member.id === user?.id);
            return isManager || isMember;
          });
      setProjects(displayProjects);
      
      setDashboardData(dashboardRes.data);
      setOverview(overviewRes.data);

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
      setError('Failed to load projects dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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

  const taskStatusData = useMemo(() => {
    if (!stats) return [];
    const done = Number(stats.completed_tasks) || 0;
    const active = Math.max(0, (Number(stats.total_tasks) || 0) - done);
    return [
      { name: 'Completed', value: done, fill: KANBAN_STATUS_COLORS.done },
      { name: 'In Progress', value: active, fill: KANBAN_STATUS_COLORS.in_progress },
    ];
  }, [stats]);

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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Projects Dashboard</h1>
        <p className="text-gray-600 mt-1">Status and progress of active projects</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Projects"
          value={overview?.summary?.total_projects || stats?.total_projects || 0}
          color="bg-blue-100"
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
        />
        <StatCard
          label="Total Tasks"
          value={overview?.summary?.total_tasks || stats?.total_tasks || 0}
          color="bg-purple-100"
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />
        <StatCard
          label="Completion Rate"
          value={`${overview?.summary?.avg_completion_rate || stats?.completion_rate || 0}%`}
          color="bg-green-100"
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          subtext={`${overview?.summary?.total_completed || stats?.completed_tasks || 0} completed`}
        />
        <StatCard
          label="Overdue Tasks"
          value={stats?.overdue_tasks || 0}
          color="bg-red-100"
          icon={
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 lg:auto-rows-[320px] gap-6 mb-8">
        <DashboardChartCard
          title="Project Completion Rates"
          type={CHART_TYPES.BAR}
          data={projectCompletionData}
          dataKey="completion"
          nameKey="name"
          color={KANBAN_STATUS_COLORS.review}
          horizontal={true}
        />
        <DashboardChartCard
          title="Task Status Distribution"
          type={CHART_TYPES.PIE}
          data={taskStatusData}
          dataKey="value"
          nameKey="name"
          colorMap={{
            completed: KANBAN_STATUS_COLORS.done,
            'in progress': KANBAN_STATUS_COLORS.in_progress,
          }}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Projects */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">{isAdmin ? 'All Projects' : 'My Projects'}</h2>
            {!isAdmin && (
              <Link
                to="/projects/new"
                className="text-sm text-purple-600 hover:text-purple-800 font-medium"
              >
                + New Project
              </Link>
            )}
          </div>

          {projects.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              No projects found
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {projects.map((project) => {
                const stories = project.stories || [];
                const tasks = project.tasks || [];
                const totalStories = stories.length;
                const completedStories = stories.filter((story) => {
                  const storyTasks = tasks.filter((t) => t.story_id === story.id);
                  return storyTasks.length > 0 && storyTasks.every((t) => t.status === 'done');
                }).length;
                const completionRate = totalStories > 0
                  ? Math.round((completedStories / totalStories) * 100)
                  : 0;
                const sprints = project.sprints || [];
                const activeSprint = (() => {
                  if (sprints.length === 0) return null;
                  const active = sprints.find((s) => s.status === 'active');
                  if (active) return active;
                  return [...sprints].sort((a, b) => new Date(b.end_date) - new Date(a.end_date))[0];
                })();
                const sprintStories = activeSprint
                  ? stories.filter((s) => s.sprint_id === activeSprint.id)
                  : [];
                const sprintCompletedStories = sprintStories.filter((story) => {
                  const storyTasks = tasks.filter((t) => t.story_id === story.id);
                  return storyTasks.length > 0 && storyTasks.every((t) => t.status === 'done');
                }).length;
                const sprintCommittedPoints = activeSprint
                  && activeSprint.committed_points !== null
                  && activeSprint.committed_points !== undefined
                  ? Number(activeSprint.committed_points) || 0
                  : sprintStories.reduce((sum, story) => sum + Number(story.points || 0), 0);
                const sprintDonePoints = sprintStories
                  .filter((story) => {
                    const storyTasks = tasks.filter((t) => t.story_id === story.id);
                    return storyTasks.length > 0 && storyTasks.every((t) => t.status === 'done');
                  })
                  .reduce((sum, story) => sum + Number(story.points || 0), 0);
                const sprintCompletionRate = sprintCommittedPoints > 0
                  ? Math.round((sprintDonePoints / sprintCommittedPoints) * 100)
                  : 0;
                const isManager = project.manager?.id === user?.id;
                const manager = project.manager || {};
                const managerName = [manager.first_name, manager.last_name].filter(Boolean).join(' ')
                  || manager.username
                  || 'Unassigned';
                const managerInitials = [manager.first_name, manager.last_name].filter(Boolean)
                  .map((n) => n[0].toUpperCase())
                  .join('') || manager.username?.[0]?.toUpperCase() || '?';
                const managerAvatarUrl = manager.avatar
                  ? (manager.avatar.startsWith('http') ? manager.avatar : `${API_BASE}${manager.avatar}`)
                  : null;

                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="block bg-white rounded-xl border border-gray-100 p-4 group hover:border-purple-200 hover:bg-purple-50/30 transition-all shadow-sm hover:shadow"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-800 group-hover:text-purple-600 truncate transition-colors">
                            {project.name}
                          </h3>
                          {isManager && (
                            <span className="flex-shrink-0 text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-200 font-medium">
                              Manager
                            </span>
                          )}
                        </div>
                        {project.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          {managerAvatarUrl ? (
                            <img
                              src={managerAvatarUrl}
                              alt={manager.username || managerName}
                              className="h-6 w-6 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-6 w-6 rounded-full bg-purple-500/90 flex items-center justify-center text-[10px] text-white font-semibold">
                              {managerInitials}
                            </div>
                          )}
                          <span className="text-xs text-gray-500">Manager: {managerName}</span>
                        </div>
                      </div>
                      {completionRate > 0 && (
                        <span className="text-xs bg-purple-100 text-purple-600 rounded-full px-2.5 py-0.5 flex-shrink-0">
                          {completionRate}%
                        </span>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-purple-500 h-full transition-all duration-500"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      {activeSprint && sprintStories.length > 0 ? (
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                            Current Sprint Health
                          </span>
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-300 transition-all duration-500"
                              style={{ width: `${sprintCompletionRate}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-gray-500">
                            {sprintCompletionRate}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No active sprint</span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Due This Week */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Due This Week</h2>
            <span className="text-sm text-gray-500">{tasksDueThisWeek.length} tasks</span>
          </div>

          {tasksDueThisWeek.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              No tasks due this week
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {tasksDueThisWeek.map((task) => (
                <div
                  key={task.id}
                  onClick={() => setEditingTask(task)}
                  className="block bg-white rounded-lg shadow-mauve border border-pink-100/30 p-4 card-hover group cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-gray-800 group-hover:text-purple-600 text-sm line-clamp-2 flex-1 transition-colors">
                      {task.title}
                    </h4>
                    <PriorityBadge priority={task.priority} className="flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <StatusBadge status={task.status} />
                    {task.project_name && (
                      <span className="text-xs text-purple-300">{task.project_name}</span>
                    )}
                  </div>
                  {task.end_time && (
                    <p className="text-xs mt-2 text-gray-400">
                      Due: {new Date(task.end_time).toLocaleString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <TaskEdit 
        isOpen={!!editingTask} 
        onClose={() => setEditingTask(null)} 
        pk={editingTask?.project_id} 
        taskId={editingTask?.id} 
        onSuccess={loadData}
      />
    </div>
  );
}
