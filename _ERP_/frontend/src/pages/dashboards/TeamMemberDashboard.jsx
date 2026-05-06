import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard, getTeamMemberPerformance } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/shared/ui/Spinner';
import StatusBadge from '../../components/shared/ui/StatusBadge';
import PriorityBadge from '../../components/shared/ui/PriorityBadge';
import Card from '../../components/shared/ui/Card';
import DashboardChartCard from '../../components/shared/cards/DashboardChartCard';
import StatCard from '../../components/shared/cards/StatCard';
import DashboardChart, { CHART_TYPES } from '../../components/shared/cards/DashboardChartRegistry';

const KANBAN_STATUS_COLORS = {
  todo: '#e74c3c',
  in_progress: '#f39c12',
  review: '#3498db',
  done: '#2ecc71',
};

export default function TeamMemberDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
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

    loadData();
  }, []);

  const myTasks = data?.my_tasks || [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const taskBuckets = myTasks.reduce(
    (acc, task) => {
      const isDone = task.status === 'done';
      if (isDone) acc.done += 1;
      else acc.active += 1;

      const scheduleRef = task.start_time || task.end_time;
      if (scheduleRef && !isDone) {
        const scheduledAt = new Date(scheduleRef);
        if (scheduledAt >= today && scheduledAt < tomorrow) {
          acc.today.push(task);
          if (scheduledAt.getHours() < 12) acc.morning.push(task);
          else acc.afternoon.push(task);
        }
      }

      if (task.end_time && !isDone) {
        const endTime = new Date(task.end_time);
        if (endTime > today && endTime <= nextWeek) acc.upcoming.push(task);
      }

      return acc;
    },
    { today: [], morning: [], afternoon: [], upcoming: [], done: 0, active: 0 }
  );

  const todayTasks = taskBuckets.today;
  const morningTasks = taskBuckets.morning;
  const afternoonTasks = taskBuckets.afternoon;
  const upcomingTasks = taskBuckets.upcoming.sort(
    (a, b) => new Date(a.end_time) - new Date(b.end_time)
  );
  const doneTasks = taskBuckets.done;
  const activeTasks = taskBuckets.active;

  const statusData = useMemo(() => {
    if (!performance?.status_distribution) return [];
    return Object.entries(performance.status_distribution).map(([name, value]) => ({
      name,
      value: Number(value) || 0,
      fill: KANBAN_STATUS_COLORS[name?.toLowerCase()] || undefined,
    }));
  }, [performance?.status_distribution]);

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

  const pointsHistoryData = useMemo(() => {
    if (!performance?.points_history) return [];
    return performance.points_history.map(d => ({
      day: d.day,
      points: d.points,
    }));
  }, [performance?.points_history]);

  const groupedTasks = useMemo(() => {
    if (!data?.projects || !data?.my_tasks) return {};

    const projectsById = Object.fromEntries(
      data.projects.map((project) => [project.id, project])
    );

    return data.my_tasks.reduce((groups, task) => {
      const projectId = task.project_id;
      const storyId = task.story_id;
      const project = projectsById[projectId];

      if (!groups[projectId]) {
        groups[projectId] = {
          id: projectId,
          name: project?.name || 'Unassigned Project',
          stories: {}
        };
      }

      if (!groups[projectId].stories[storyId]) {
        const story = project?.stories?.find(s => s.id === storyId);
        groups[projectId].stories[storyId] = {
          id: storyId,
          title: story?.title || 'Unassigned Story',
          tasks: []
        };
      }

      groups[projectId].stories[storyId].tasks.push(task);
      return groups;
    }, {});
  }, [data]);

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

      {/* Today's Tasks */}
      {todayTasks.length > 0 && (
        <Card variant="panelLg" className="p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">📅 Today's Schedule</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Morning ({morningTasks.length})
              </h3>
              <div className="space-y-2">
                {morningTasks.map(task => (
                  <div key={task.id} className="bg-white rounded-lg p-2 border border-gray-100">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                Afternoon ({afternoonTasks.length})
              </h3>
              <div className="space-y-2">
                {afternoonTasks.map(task => (
                  <div key={task.id} className="bg-white rounded-lg p-2 border border-gray-100">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 lg:auto-rows-[300px] gap-6 mb-8">
        <DashboardChartCard
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
        <DashboardChartCard
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
        <DashboardChartCard
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
          <div className="space-y-8 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
            {Object.values(groupedTasks).map((project) => (
              <div key={project.id} className="space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                  <h3 className="font-bold text-gray-800 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                    </svg>
                    <Link to={`/projects/${project.id}`} className="hover:text-indigo-600 transition-colors">
                      {project.name}
                    </Link>
                  </h3>
                  <Link 
                    to={`/projects/${project.id}/scrum`}
                    className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md uppercase font-bold hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100"
                  >
                    View Scrumboard
                  </Link>
                </div>
                
                <div className="pl-2 space-y-6">
                  {Object.values(project.stories).map((story) => (
                    <div key={story.id} className="space-y-3">
                      <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                        {story.title}
                      </h4>
                      <div className="grid gap-3">
                        {story.tasks.map((task) => (
                          <Card
                            key={task.id}
                            className={`shadow-mauve border p-4 hover:shadow-lilac group ${task.is_blocked ? 'border-amber-200 bg-amber-50/20' : 'border-pink-100/30'}`}
                            interactive
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-800 text-sm line-clamp-2 block mb-1">
                                  {task.title}
                                </h4>
                                <div className="flex items-center gap-2">
                                  <StatusBadge status={task.status} />
                                  {task.is_blocked && (
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase border border-amber-200">Blocked</span>
                                  )}
                                </div>
                              </div>
                              <PriorityBadge priority={task.priority} className="flex-shrink-0" />
                            </div>
                            
                            {task.end_time && (
                              <div className={`flex items-center gap-1.5 mt-3 text-[10px] ${task.is_overdue ? 'text-rose-500 font-bold' : 'text-gray-400'}`}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>
                                  {task.is_overdue ? 'Overdue: ' : 'Due: '}
                                  {new Date(task.end_time).toLocaleString(undefined, { 
                                    month: 'short', 
                                    day: 'numeric', 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {myTasks.length === 0 && (
              <div className="text-center py-16 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-400 font-medium">No tasks assigned to you yet.</p>
                <p className="text-xs text-gray-300 mt-1">Check back later or contact your manager.</p>
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Due Times</h2>
            <span className="text-sm text-gray-500">{upcomingTasks.length} this week</span>
          </div>
          <div className="space-y-3">
            {upcomingTasks.map((task) => (
              <Card
                key={task.id}
                className="rounded-lg border-purple-100/30 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-gray-800 text-sm line-clamp-2 flex-1">
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
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
