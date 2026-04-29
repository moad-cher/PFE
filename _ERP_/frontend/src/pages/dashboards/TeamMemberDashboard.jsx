import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard, getTeamMemberPerformance } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/ui/Spinner';
import StatusBadge from '../../components/ui/StatusBadge';
import PriorityBadge from '../../components/ui/PriorityBadge';
import DashboardChartCard from '../../components/ui/DashboardChartCard';
import StatCard from '../../components/ui/StatCard';
import DashboardChart, { CHART_TYPES } from '../../components/ui/DashboardChartRegistry';

const KANBAN_STATUS_COLORS = {
  todo: '#e74c3c',
  in_progress: '#f39c12',
  review: '#3498db',
  done: '#2ecc71',
};

function ChartCard({ title, type, data, dataKey, nameKey, color, colorMap, stacked, stackKeys, stackColors, rowSpan, colSpan }) {
  return (
    <DashboardChartCard title={title} rowSpan={rowSpan} colSpan={colSpan} hasData={data && data.length > 0}>
      <DashboardChart 
        type={type} 
        data={data} 
        dataKey={dataKey} 
        nameKey={nameKey} 
        color={color} 
        colorMap={colorMap}
        stacked={stacked}
        stackKeys={stackKeys}
        stackColors={stackColors}
      />
    </DashboardChartCard>
  );
}

export default function TeamMemberDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardRes, performanceRes] = await Promise.all([
        getDashboard(),
        getTeamMemberPerformance(),
      ]);
      setData(dashboardRes.data);
      setPerformance(performanceRes.data);
    } catch (err) {
      setError('Failed to load dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const myTasks = data?.my_tasks || [];
  const projects = data?.projects || [];

  // Filter today's tasks
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayTasks = myTasks.filter(task => {
    const scheduleRef = task.start_time || task.end_time;
    if (!scheduleRef || task.status === 'done') return false;
    const scheduledAt = new Date(scheduleRef);
    return scheduledAt >= today && scheduledAt < tomorrow;
  });

  const morningTasks = todayTasks.filter((t) => {
    const scheduleRef = t.start_time || t.end_time;
    if (!scheduleRef) return false;
    return new Date(scheduleRef).getHours() < 12;
  });
  const afternoonTasks = todayTasks.filter((t) => {
    const scheduleRef = t.start_time || t.end_time;
    if (!scheduleRef) return false;
    return new Date(scheduleRef).getHours() >= 12;
  });

  // Upcoming deadlines (next 7 days)
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const upcomingTasks = myTasks.filter(task => {
    if (!task.end_time || task.status === 'done') return false;
    const endTime = new Date(task.end_time);
    return endTime > today && endTime <= nextWeek;
  }).sort((a, b) => new Date(a.end_time) - new Date(b.end_time));

  const doneTasks = myTasks.filter((t) => t.status === 'done').length;
  const activeTasks = myTasks.filter((t) => t.status !== 'done').length;

  // Status distribution for chart
  const statusData = useMemo(() => {
    if (!performance?.status_distribution) return [];
    return Object.entries(performance.status_distribution).map(([name, value]) => ({
      name,
      value: Number(value) || 0,
      fill: KANBAN_STATUS_COLORS[name?.toLowerCase()] || undefined,
    }));
  }, [performance?.status_distribution]);

  // Project distribution for chart — new shape: [{project, total, todo, in_progress, review, done}, ...]
  const projectData = useMemo(() => {
    if (!performance?.project_distribution) return [];
    return performance.project_distribution.map(d => ({
      project: d.project,
      total: d.total,
      todo: d.todo || 0,
      in_progress: d.in_progress || 0,
      review: d.review || 0,
      done: d.done || 0,
    }));
  }, [performance?.project_distribution]);

  // Points history for line chart
  const pointsHistoryData = useMemo(() => {
    if (!performance?.points_history) return [];
    return performance.points_history.map(d => ({
      day: d.day,
      points: d.points,
    }));
  }, [performance?.points_history]);

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
        <h1 className="text-2xl font-bold text-gray-900">
          Hello {user?.first_name || user?.username}
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="My Tasks"
          value={myTasks.length}
          color="bg-blue-100"
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label="Active Tasks"
          value={activeTasks}
          color="bg-orange-100"
          icon={
            <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Completed"
          value={doneTasks}
          color="bg-green-100"
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          subtext={`${performance?.summary?.on_time_completions || 0} on-time`}
        />
        <StatCard
          label="Reward Points"
          value={performance?.summary?.total_reward_points || user?.reward_points || 0}
          color="bg-yellow-100"
          icon={
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          }
          subtext={performance?.summary?.late_completions > 0 ? `${performance.summary.late_completions} late` : 'All on time!'}
        />
      </div>

      {/* Performance Summary */}
      {performance && (
        <div className="bg-white rounded-2xl p-6 border border-purple-100/50 shadow-lilac mb-8">
          <h2 className="text-xl font-semibold mb-4">📊 Your Performance (Last 30 Days)</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-gray-500 text-sm">Completed</p>
              <p className="text-3xl font-bold">{performance.summary.completed_tasks}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">On-Time Rate</p>
              <p className="text-3xl font-bold">
                {performance.summary.completed_tasks > 0
                  ? Math.round((performance.summary.on_time_completions / performance.summary.completed_tasks) * 100)
                  : 0}%
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Active Projects</p>
              <p className="text-3xl font-bold">{Object.keys(performance.project_distribution || {}).length}</p>
            </div>
            <div>
              <p className="text-gray-500 text-sm">Total Points</p>
              <p className="text-3xl font-bold">{performance.summary.total_reward_points}</p>
            </div>
          </div>
        </div>
      )}

      {/* Today's Tasks */}
      {todayTasks.length > 0 && (
        <div className="bg-white rounded-2xl p-6 border border-purple-100/50 shadow-lilac mb-8">
          <h2 className="text-xl font-semibold mb-4">📅 Today's Schedule</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Morning Tasks */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Morning ({morningTasks.length})
              </h3>
              {morningTasks.length === 0 ? (
                <p className="text-gray-500 text-sm">No morning tasks</p>
              ) : (
                <div className="space-y-2">
                  {morningTasks.map(task => (
                    <Link
                      key={task.id}
                      to={`/projects/${task.project_id}/tasks/${task.id}`}
                      className="block bg-white rounded-lg p-2 border border-gray-100 hover:bg-purple-50 transition-colors"
                    >
                      <p className="text-sm font-medium truncate">{task.title}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Afternoon Tasks */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                Afternoon ({afternoonTasks.length})
              </h3>
              {afternoonTasks.length === 0 ? (
                <p className="text-gray-500 text-sm">No afternoon tasks</p>
              ) : (
                <div className="space-y-2">
                  {afternoonTasks.map(task => (
                    <Link
                      key={task.id}
                      to={`/projects/${task.project_id}/tasks/${task.id}`}
                      className="block bg-white rounded-lg p-2 border border-gray-100 hover:bg-purple-50 transition-colors"
                    >
                      <p className="text-sm font-medium truncate">{task.title}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 lg:auto-rows-[300px] gap-6 mb-8">
        <ChartCard
          title="Task Status"
          type={CHART_TYPES.PIE}
          data={statusData}
          dataKey="value"
          nameKey="name"
          colorMap={{
            done: KANBAN_STATUS_COLORS.done,
            in_progress: KANBAN_STATUS_COLORS.in_progress,
            review: KANBAN_STATUS_COLORS.review,
            todo: KANBAN_STATUS_COLORS.todo,
          }}
        />
        <ChartCard
          title="Projects"
          type={CHART_TYPES.BAR}
          data={projectData}
          nameKey="project"
          stacked={true}
          stackKeys={['todo', 'in_progress', 'review', 'done']}
          stackColors={[
            KANBAN_STATUS_COLORS.todo,
            KANBAN_STATUS_COLORS.in_progress,
            KANBAN_STATUS_COLORS.review,
            KANBAN_STATUS_COLORS.done
          ]}
        />
        <ChartCard
          title="Points History"
          type={CHART_TYPES.LINE}
          data={pointsHistoryData}
          dataKey="points"
          nameKey="day"
          color="#F59E0B"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* All My Tasks */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">My Tasks</h2>
            <span className="text-sm text-gray-500">{myTasks.length} total</span>
          </div>
          {myTasks.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              No tasks assigned to you
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {myTasks.slice(0, 10).map((task) => (
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
                    <p className={`text-xs mt-2 ${task.is_overdue ? 'text-rose-400' : 'text-gray-400'}`}>
                      {task.is_overdue ? 'Overdue: ' : 'Due: '}
                      {new Date(task.end_time).toLocaleString()}
                    </p>
                  )}
                  {task.points > 0 && (
                    <span className="mt-2 inline-block text-xs bg-violet-100 text-violet-600 rounded-full px-2.5 py-0.5">
                      {task.points} pts
                    </span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Due Times</h2>
            <span className="text-sm text-gray-500">{upcomingTasks.length} this week</span>
          </div>
          {upcomingTasks.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              No upcoming due times
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingTasks.map((task) => (
                <Link
                  key={task.id}
                  to={`/projects/${task.project_id}/tasks/${task.id}`}
                  className="block bg-white rounded-lg shadow-lilac border border-purple-100/30 p-4 card-hover group"
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
                  <p className="text-xs mt-2 text-gray-400">
                    Due: {new Date(task.end_time).toLocaleString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}





