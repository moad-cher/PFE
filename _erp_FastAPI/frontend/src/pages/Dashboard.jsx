import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getDashboard } from '../api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-5">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project }) {
  return (
    <Link
      to={`/projects/${project.id}`}
      className="block bg-white rounded-xl shadow-sm border p-5 hover:shadow-md hover:border-blue-200 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 truncate">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">{project.description}</p>
          )}
        </div>
        <StatusBadge status={project.status} className="flex-shrink-0" />
      </div>
      <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-gray-500">
        <span>{project.tasks_count ?? 0} tasks</span>
        <span>{project.members_count ?? 0} members</span>
      </div>
    </Link>
  );
}

function TaskCard({ task }) {
  return (
    <Link
      to={`/projects/${task.project_id}/tasks/${task.id}`}
      className="block bg-white rounded-xl shadow-sm border p-4 hover:shadow-md hover:border-blue-200 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-medium text-gray-900 group-hover:text-blue-600 text-sm line-clamp-2 flex-1">
          {task.title}
        </h4>
        <PriorityBadge priority={task.priority} className="flex-shrink-0" />
      </div>
      <div className="flex items-center gap-2 mt-2">
        <StatusBadge status={task.status} />
        {task.project_name && (
          <span className="text-xs text-gray-400">{task.project_name}</span>
        )}
      </div>
      {task.deadline && (
        <p className={`text-xs mt-2 ${task.is_overdue ? 'text-red-500' : 'text-gray-400'}`}>
          {task.is_overdue ? 'Overdue: ' : 'Due: '}
          {new Date(task.deadline).toLocaleDateString()}
        </p>
      )}
      {task.points > 0 && (
        <span className="mt-2 inline-block text-xs bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5">
          {task.points} pts
        </span>
      )}
    </Link>
  );
}

export default function Dashboard() {
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

  const projects = data?.projects || [];
  const myTasks = data?.my_tasks || [];
  const doneTasks = myTasks.filter((t) => t.status === 'done').length;
  const activeTasks = myTasks.filter((t) => t.status !== 'done').length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Hello, {user?.first_name || user?.username}!
          </h1>
          <p className="text-gray-500 mt-1">Here's what's happening today</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'project_manager') && (
          <Link
            to="/projects/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Active Projects"
          value={projects.length}
          color="bg-blue-100"
          icon={
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
          }
        />
        <StatCard
          label="My Tasks"
          value={myTasks.length}
          color="bg-indigo-100"
          icon={
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
        <StatCard
          label="Tasks Done"
          value={doneTasks}
          color="bg-green-100"
          icon={
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Active Tasks"
          value={activeTasks}
          color="bg-orange-100"
          icon={
            <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
      </div>

      {/* Points banner */}
      {user?.reward_points > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 flex items-center gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="font-semibold text-yellow-800">
              You have {user.reward_points} reward points!
            </p>
            <p className="text-sm text-yellow-600">Keep completing tasks to earn more.</p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* My Tasks */}
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
            <div className="space-y-3">
              {myTasks.slice(0, 8).map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>

        {/* Projects */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Projects</h2>
            <span className="text-sm text-gray-500">{projects.length} total</span>
          </div>
          {projects.length === 0 ? (
            <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
              No projects yet
            </div>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 6).map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
