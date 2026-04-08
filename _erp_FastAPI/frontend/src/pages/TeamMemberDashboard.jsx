import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard } from '../api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-600">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function TeamMemberDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboard()
      .then((res) => setData(res.data))
      .catch(() => setError('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

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

  const myTasks = data?.my_tasks || [];
  const projects = data?.projects || [];
  
  // Filter today's tasks
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todayTasks = myTasks.filter(task => {
    if (!task.deadline || task.status === 'done') return false;
    const deadline = new Date(task.deadline);
    return deadline >= today && deadline < tomorrow;
  });
  
  const morningTasks = todayTasks.filter(t => t.time_slot === 'morning');
  const afternoonTasks = todayTasks.filter(t => t.time_slot === 'afternoon');
  
  // Upcoming deadlines (next 7 days)
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);
  
  const upcomingTasks = myTasks.filter(task => {
    if (!task.deadline || task.status === 'done') return false;
    const deadline = new Date(task.deadline);
    return deadline > today && deadline <= nextWeek;
  }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

  const doneTasks = myTasks.filter((t) => t.status === 'done').length;
  const activeTasks = myTasks.filter((t) => t.status !== 'done').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Hello, {user?.first_name || user?.username}! 👋
        </h1>
        <p className="text-gray-600 mt-1">Here's what's on your plate today</p>
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
        />
        <StatCard
          label="Reward Points"
          value={user?.reward_points || 0}
          color="bg-yellow-100"
          icon={
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          }
        />
      </div>

      {/* Today's Tasks */}
      {todayTasks.length > 0 && (
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl p-6 text-white mb-8">
          <h2 className="text-xl font-semibold mb-4">📅 Today's Schedule</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Morning Tasks */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                Morning ({morningTasks.length})
              </h3>
              {morningTasks.length === 0 ? (
                <p className="text-white/70 text-sm">No morning tasks</p>
              ) : (
                <div className="space-y-2">
                  {morningTasks.map(task => (
                    <Link
                      key={task.id}
                      to={`/projects/${task.project_id}/tasks/${task.id}`}
                      className="block bg-white/10 rounded-lg p-2 hover:bg-white/20 transition-colors"
                    >
                      <p className="text-sm font-medium truncate">{task.title}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Afternoon Tasks */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <h3 className="font-medium mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
                Afternoon ({afternoonTasks.length})
              </h3>
              {afternoonTasks.length === 0 ? (
                <p className="text-white/70 text-sm">No afternoon tasks</p>
              ) : (
                <div className="space-y-2">
                  {afternoonTasks.map(task => (
                    <Link
                      key={task.id}
                      to={`/projects/${task.project_id}/tasks/${task.id}`}
                      className="block bg-white/10 rounded-lg p-2 hover:bg-white/20 transition-colors"
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
                  {task.deadline && (
                    <p className={`text-xs mt-2 ${task.is_overdue ? 'text-rose-400' : 'text-gray-400'}`}>
                      {task.is_overdue ? 'Overdue: ' : 'Due: '}
                      {new Date(task.deadline).toLocaleDateString()}
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
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h2>
            <span className="text-sm text-gray-500">{upcomingTasks.length} this week</span>
          </div>
          {upcomingTasks.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              No upcoming deadlines
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
                    Due: {new Date(task.deadline).toLocaleDateString()}
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
