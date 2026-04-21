import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getProject, deleteProject, getKanban } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';
import PriorityBadge from '../../components/PriorityBadge';
import TaskDistributionChart from '../../components/TaskDistributionChart';
import GanttChart from '../../components/GanttChart';
import TaskNew from './TaskNew';

function QuickCard({ to, icon, label, color }) {
  return (
    <Link
      to={to}
      className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-all group flex flex-col items-center gap-2 text-center`}
    >
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{label}</span>
    </Link>
  );
}

export default function ProjectDetail() {
  const { pk } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [kanbanData, setKanbanData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  const fetchProject = () => {
    getProject(pk)
      .then((projRes) => {
        setProject(projRes.data);
        
        // Fetch kanban data separately
        getKanban(pk)
          .then((kanbanRes) => {
            if (kanbanRes.data && Array.isArray(kanbanRes.data.columns)) {
              const chartData = kanbanRes.data.columns.map(col => ({
                name: col.status.name,
                value: col.tasks.length,
                fill: col.status.color
              }));
              setKanbanData(chartData);
            } else if (Array.isArray(kanbanRes.data)) {
              const chartData = kanbanRes.data.map(col => ({
                name: col.status.name,
                value: col.tasks.length,
                fill: col.status.color
              }));
              setKanbanData(chartData);
            }
          })
          .catch((err) => {
            console.warn('Failed to load kanban data for chart:', err);
          });
      })
      .catch((err) => {
        console.error('Failed to load project:', err);
        setError('Failed to load project');
      });
  };

  useEffect(() => {
    setLoading(true);
    fetchProject();
    // setLoading is handled by finally in original code, but since I extracted fetchProject, 
    // I should ensure it's handled. 
    // Actually, I'll just put the logic back or wrap it.
  }, [pk]);

  useEffect(() => {
    if (project) setLoading(false);
  }, [project]);

  const handleDelete = async () => {
    try {
      await deleteProject(pk);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to delete project');
      setDeleteConfirm(false);
    }
  };

  const canEdit = user?.role === 'admin' || user?.role === 'project_manager';

  const [taskModalSprintId, setTaskModalSprintId] = useState('');
  const openTaskModal = (sprintId = '') => {
    setTaskModalSprintId(sprintId);
    setShowTaskModal(true);
  };

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
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4">
          <Link to="/dashboard" className="text-gray-400 hover:text-gray-600 mt-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project?.name}</h1>
            {project?.description && (
              <p className="text-gray-500 mt-1 max-w-xl">{project.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {canEdit && (
            <>
              <Link
                to={`/projects/${pk}/settings`}
                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </Link>
              <Link
                to={`/projects/${pk}/edit`}
                className="px-3 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </Link>
              {deleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">Sure?</span>
                  <button
                    onClick={handleDelete}
                    className="px-3 py-2 bg-red-600 text-white rounded-xl text-sm hover:bg-red-700 transition-colors"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="px-3 py-2 border border-gray-300 text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="px-3 py-2 border border-red-200 text-red-600 rounded-xl text-sm hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              )}
            </>
          )}
          <button
            onClick={() => setShowTaskModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 flex items-center gap-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Task
          </button>
        </div>
      </div>

      <TaskNew 
        isOpen={showTaskModal} 
        onClose={() => setShowTaskModal(false)} 
        pk={pk} 
        initialSprintId={taskModalSprintId}
        onSuccess={fetchProject} 
      />

      {/* Task Distribution Chart */}
      <div className="mb-8 max-w-md">
        <TaskDistributionChart data={kanbanData} />
      </div>

      {/* Quick action cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <QuickCard
          to={`/projects/${pk}/kanban`}
          label="Kanban"
          color="bg-blue-100"
          icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>}
        />
        <QuickCard
          to={`/projects/${pk}/scrum`}
          label="Scrum"
          color="bg-indigo-100"
          icon={<svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
        />
        <QuickCard
          to={`/projects/${pk}/members`}
          label="Members"
          color="bg-green-100"
          icon={<svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
        />
        <QuickCard
          to={`/projects/${pk}/leaderboard`}
          label="Leaderboard"
          color="bg-yellow-100"
          icon={<svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        />
        <QuickCard
          to={`/projects/${pk}/chat`}
          label="Chat"
          color="bg-purple-100"
          icon={<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
        />
      </div>

      {/* Project Roadmap / Gantt */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Project Roadmap</h2>
          <Link
            to={`/projects/${pk}/kanban`}
            className="text-sm text-blue-600 hover:underline"
          >
            View Kanban
          </Link>
        </div>
        
        <GanttChart 
          tasks={project?.tasks || []} 
          sprints={project?.sprints || []} 
          statuses={project?.statuses || []}
          project_id={pk} 
          onAddTask={openTaskModal}
        />
      </div>
    </div>
  );
}
