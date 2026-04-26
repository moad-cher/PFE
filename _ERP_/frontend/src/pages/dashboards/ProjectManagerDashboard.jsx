import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getProjectStats, listProjects, getDashboard, getProjectManagerOverview } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/ui/Spinner';
import StatusBadge from '../../components/ui/StatusBadge';
import PriorityBadge from '../../components/ui/PriorityBadge';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, CartesianGrid, AreaChart, Area } from 'recharts';

const CHART_COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#06B6D4', '#F97316'];
const KANBAN_STATUS_COLORS = {
  todo: '#e74c3c',
  in_progress: '#f39c12',
  review: '#3498db',
  done: '#2ecc71',
};

function StatCard({ icon, label, value, color, subtext }) {
  return (
    <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-600">{label}</p>
          {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

function PieChartCard({ title, data, dataKey, nameKey, colorByName = {} }) {
  const chartData = (data || []).map(item => ({
    ...item,
    [dataKey]: Number(item?.[dataKey]) || 0,
  }));

  return (
    <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6 h-full flex flex-col">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      {chartData.length > 0 ? (
        <div className="flex-1 min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey={dataKey}
                nameKey={nameKey}
                cx="50%"
                cy="50%"
                outerRadius={70}
                innerRadius={40}
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`${entry?.[nameKey] || entry?.name || index}`}
                    fill={
                      entry.fill
                      || colorByName[String(entry?.[nameKey] || '').toLowerCase()]
                      || CHART_COLORS[index % CHART_COLORS.length]
                    }
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex-1 min-h-[220px] flex items-center justify-center text-gray-400 text-sm">
          No data available
        </div>
      )}
    </div>
  );
}

function BarChartCard({ title, data, dataKey, nameKey, color = "#8B5CF6" }) {
  const chartData = (data || []).map(item => ({
    ...item,
    [dataKey]: Number(item?.[dataKey]) || 0,
  }));
  const isCompletionChart = String(dataKey).toLowerCase().includes('completion');

  return (
    <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6 h-full flex flex-col">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      {chartData.length > 0 ? (
        <div className="flex-1 min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
              <XAxis
                type="number"
                domain={isCompletionChart ? [0, 100] : ['auto', 'auto']}
                tickFormatter={isCompletionChart ? (value) => `${value}%` : undefined}
              />
              <YAxis type="category" dataKey={nameKey} width={100} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} minPointSize={2} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex-1 min-h-[220px] flex items-center justify-center text-gray-400 text-sm">
          No data available
        </div>
      )}
    </div>
  );
}

function LineChartCard({ title, data, dataKey, nameKey, color = "#8B5CF6" }) {
  return (
    <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6 h-full flex flex-col">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      {data && data.length > 0 ? (
        <div className="flex-1 min-h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex-1 min-h-[220px] flex items-center justify-center text-gray-400 text-sm">
          No data available
        </div>
      )}
    </div>
  );
}

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
      setProjects(projectsRes.data);
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Project Manager Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage projects and team workload</p>
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
        <BarChartCard
          title="Project Completion Rates"
          data={projectCompletionData}
          dataKey="completion"
          nameKey="name"
          color={KANBAN_STATUS_COLORS.review}
        />
        <PieChartCard
          title="Task Status Distribution"
          data={taskStatusData}
          dataKey="value"
          nameKey="name"
          colorByName={{
            completed: KANBAN_STATUS_COLORS.done,
            'in progress': KANBAN_STATUS_COLORS.in_progress,
          }}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* My Projects */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">My Projects</h2>
            <Link
              to="/projects/new"
              className="text-sm text-purple-600 hover:text-purple-800 font-medium"
            >
              + New Project
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              No projects yet
            </div>
          ) : (
            <div className="space-y-3">
              {projects.map((project) => {
                const projectOverview = overview?.projects?.find(p => p.id === project.id);
                const completionRate = projectOverview?.completion_rate || 0;
                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="block bg-white rounded-xl shadow-lilac border border-purple-100/30 p-5 card-hover group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-800 group-hover:text-purple-600 truncate transition-colors">
                          {project.name}
                        </h3>
                        {project.description && (
                          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
                        )}
                      </div>
                      {completionRate > 0 && (
                        <span className="text-xs bg-purple-100 text-purple-600 rounded-full px-2.5 py-0.5 flex-shrink-0">
                          {completionRate}%
                        </span>
                      )}
                    </div>
                    {/* Progress bar */}
                    <div className="mt-3 w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${completionRate}%`, backgroundColor: KANBAN_STATUS_COLORS.review }}
                      />
                    </div>
                    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-purple-100/50 text-xs text-gray-400">
                      <span>{project.tasks_count ?? projectOverview?.total_tasks ?? 0} tasks</span>
                      <span>{project.members_count ?? 0} members</span>
                      <span>{projectOverview?.completed_tasks ?? 0} completed</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Tasks Due This Week */}
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
            <div className="space-y-3">
              {tasksDueThisWeek.map((task) => (
                <Link
                  key={task.id}
                  to={`/projects/${task.project_id}/tasks/${task.id}`}
                  className="block bg-white rounded-lg shadow-mauve border border-pink-100/30 p-4 card-hover group"
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
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Team Workload Section (if data available) */}
      {overview && overview.projects && overview.projects.length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Project Overview Summary</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overview.projects.slice(0, 6).map((proj) => (
              <div key={proj.id} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                <h4 className="font-medium text-gray-900 truncate">{proj.name}</h4>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-gray-500">{proj.completed_tasks}/{proj.total_tasks} tasks</span>
                  <span className="text-purple-600 font-medium">{proj.completion_rate}%</span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className="bg-purple-500 h-1.5 rounded-full"
                    style={{ width: `${proj.completion_rate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}





