import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getScrum, getProject, getProjectStatuses, getSprints, createSprint, updateSprint, deleteSprint, formatDate } from '../../api';
import Spinner from '../../components/Spinner';
import PriorityBadge from '../../components/PriorityBadge';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';

export default function ScrumBoard() {
  const { pk } = useParams();
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState('active'); // 'active', 'backlog', or ID
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [sprintForm, setSprintForm] = useState({ name: '', start_date: '', end_date: '', goal: '' });

  useEffect(() => {
    Promise.all([getProject(pk), getProjectStatuses(pk), getSprints(pk)])
      .then(([p, s, spr]) => {
        setProject(p.data);
        setStatuses(s.data);
        setSprints(spr.data);
      });
  }, [pk]);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filterStatus) params.status = filterStatus;
    if (filterAssignee) params.assignee_id = filterAssignee;
    
    if (selectedSprintId === 'backlog') {
      params.sprint_id = 'null';
    } else if (selectedSprintId === 'active') {
      const active = sprints.find(s => s.status === 'active');
      if (active) params.sprint_id = active.id;
      else params.sprint_id = 'null'; // fallback to backlog if no active sprint
    } else {
      params.sprint_id = selectedSprintId;
    }

    getScrum(pk, params).then(r => setTasks(r.data)).finally(() => setLoading(false));
  }, [pk, filterStatus, filterAssignee, selectedSprintId, sprints]);

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    try {
      const res = await createSprint(pk, sprintForm);
      setSprints([...sprints, res.data]);
      setShowSprintModal(false);
      setSprintForm({ name: '', start_date: '', end_date: '', goal: '' });
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create sprint');
    }
  };

  const handleUpdateSprintStatus = async (sprintId, newStatus) => {
    try {
      const res = await updateSprint(pk, sprintId, { status: newStatus });
      setSprints(sprints.map(s => s.id === sprintId ? res.data : s));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update sprint');
    }
  };

  const isManager = user?.role === 'admin' || project?.manager?.id === user?.id || user?.role === 'project_manager';
  const allMembers = project
    ? [project.manager, ...(project.members || [])]
        .filter(Boolean)
        .filter((v, i, a) => a.findIndex(x => x.id === v.id) === i)
    : [];

  const activeSprint = sprints.find(s => s.status === 'active');
  const currentSprint = selectedSprintId === 'active' ? activeSprint : sprints.find(s => s.id === parseInt(selectedSprintId));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to={`/projects/${pk}`} className="hover:text-blue-600">← {project?.name}</Link>
          <span>/</span><span className="font-medium text-gray-700">Scrum</span>
        </div>
        <div className="flex gap-2">
          {isManager && (
            <button onClick={() => setShowSprintModal(true)} className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">New Sprint</button>
          )}
          <Link to={`/projects/${pk}/tasks/new`} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Task</Link>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="bg-white rounded-2xl shadow-sm border p-4 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setSelectedSprintId('active')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${selectedSprintId === 'active' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Active Sprint
            </button>
            <button
              onClick={() => setSelectedSprintId('backlog')}
              className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${selectedSprintId === 'backlog' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Backlog
            </button>
            <select
              value={['active', 'backlog'].includes(selectedSprintId) ? '' : selectedSprintId}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              className="bg-transparent px-2 py-1.5 text-sm font-medium text-gray-500 focus:outline-none"
            >
              <option value="" disabled>Other Sprints</option>
              {sprints.filter(s => s.status !== 'active').map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
              <option value="">All statuses</option>
              {statuses.map(s => <option key={s.id} value={s.slug}>{s.name}</option>)}
            </select>
            <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white">
              <option value="">All members</option>
              {allMembers.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
            </select>
          </div>
        </div>

        {currentSprint && (
          <div className="mt-4 pt-4 border-t flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900">{currentSprint.name}</h2>
              <p className="text-sm text-gray-500">{formatDate(currentSprint.start_date)} - {formatDate(currentSprint.end_date)}</p>
              {currentSprint.goal && <p className="text-xs text-gray-400 mt-1 italic">Goal: {currentSprint.goal}</p>}
            </div>
            {isManager && currentSprint.status === 'draft' && (
              <button onClick={() => handleUpdateSprintStatus(currentSprint.id, 'active')} className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 uppercase">Start Sprint</button>
            )}
            {isManager && currentSprint.status === 'active' && (
              <button onClick={() => handleUpdateSprintStatus(currentSprint.id, 'completed')} className="px-4 py-2 bg-gray-600 text-white text-xs font-bold rounded-lg hover:bg-gray-700 uppercase">Complete Sprint</button>
            )}
            {currentSprint.status === 'completed' && (
              <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-bold rounded-full uppercase">Completed</span>
            )}
          </div>
        )}
      </div>

      {/* Task List */}
      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                {['Task', 'Status', 'Priority', 'Slot', 'Assignees', 'Deadline', 'Points'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {tasks.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-400 py-10">No tasks found in this view</td></tr>
              )}
              {tasks.map(t => (
                <tr key={t.id} className={`hover:bg-gray-50 ${t.is_overdue ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3 max-w-xs">
                    <Link to={`/projects/${pk}/tasks/${t.id}`} className="font-medium text-gray-900 hover:text-blue-600 line-clamp-1">{t.title}</Link>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{t.time_slot || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {t.assigned_to?.map(u => (
                        <span key={u.id} className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5 text-xs">{u.username}</span>
                      ))}
                    </div>
                  </td>
                  <td className={`px-4 py-3 text-xs whitespace-nowrap ${t.is_overdue ? 'text-red-500 font-bold' : t.deadline_approaching ? 'text-orange-500' : 'text-gray-500'}`}>
                    {t.deadline ? formatDate(t.deadline) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {t.points > 0 && (
                      <span className="bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5 text-xs">{t.points} pts</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New Sprint Modal */}
      {showSprintModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Create New Sprint</h3>
            <form onSubmit={handleCreateSprint} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sprint Name</label>
                <input required type="text" value={sprintForm.name} onChange={e => setSprintForm({...sprintForm, name: e.target.value})}
                  className="w-full border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Sprint 1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input required type="date" value={sprintForm.start_date} onChange={e => setSprintForm({...sprintForm, start_date: e.target.value})}
                    className="w-full border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input required type="date" value={sprintForm.end_date} onChange={e => setSprintForm({...sprintForm, end_date: e.target.value})}
                    className="w-full border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sprint Goal</label>
                <textarea value={sprintForm.goal} onChange={e => setSprintForm({...sprintForm, goal: e.target.value})}
                  className="w-full border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="What are we aiming for?" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowSprintModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm shadow-indigo-200">Create Sprint</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
