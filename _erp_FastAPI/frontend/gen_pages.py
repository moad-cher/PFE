"""Generate all missing React page files for the ERP frontend."""
import os

BASE = r'c:/Users/acer/Desktop/stage/_erp_FastAPI/frontend/src/pages'

files = {}

# ─── KanbanBoard ──────────────────────────────────────────────────────────────
files['projects/KanbanBoard.jsx'] = """\
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getKanban, moveTask, getProject } from '../../api';
import Spinner from '../../components/Spinner';
import PriorityBadge from '../../components/PriorityBadge';
import { useAuth } from '../../context/AuthContext';

function TaskCard({ task, columns, projectId, onMove }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-3 hover:shadow-md transition-shadow">
      <Link to={`/projects/${projectId}/tasks/${task.id}`} className="block">
        <p className="font-medium text-sm text-gray-900 hover:text-blue-600 line-clamp-2 mb-2">{task.title}</p>
      </Link>
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <PriorityBadge priority={task.priority} />
        {task.time_slot && <span className="text-xs text-gray-400">{task.time_slot}</span>}
      </div>
      {task.deadline && (
        <p className={`text-xs mb-2 ${task.is_overdue ? 'text-red-500 font-medium' : task.deadline_approaching ? 'text-orange-500' : 'text-gray-400'}`}>
          {task.is_overdue ? '⚠ Overdue: ' : task.deadline_approaching ? '⏰ Due soon: ' : 'Due: '}
          {new Date(task.deadline).toLocaleDateString()}
        </p>
      )}
      {task.assigned_to?.length > 0 && (
        <div className="flex -space-x-1 mb-2">
          {task.assigned_to.slice(0, 3).map(u => (
            <div key={u.id} title={u.username}
              className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] border-2 border-white">
              {u.username[0].toUpperCase()}
            </div>
          ))}
          {task.assigned_to.length > 3 && (
            <span className="text-xs text-gray-400 pl-2">+{task.assigned_to.length - 3}</span>
          )}
        </div>
      )}
      <div className="flex gap-1 flex-wrap pt-2 border-t">
        {columns.filter(c => c.status.slug !== task.status).map(col => (
          <button key={col.status.slug} onClick={() => onMove(task.id, col.status.slug)}
            className="text-[10px] border rounded px-1.5 py-0.5 hover:bg-gray-50 text-gray-500 hover:text-gray-700">
            → {col.status.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function KanbanBoard() {
  const { pk } = useParams();
  const { user } = useAuth();
  const [columns, setColumns] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getKanban(pk), getProject(pk)])
      .then(([k, p]) => { setColumns(k.data); setProject(p.data); })
      .finally(() => setLoading(false));
  }, [pk]);

  const handleMove = async (taskId, newStatus) => {
    await moveTask(pk, taskId, newStatus);
    setColumns(prev => {
      const moved = prev.flatMap(c => c.tasks).find(t => t.id === taskId);
      if (!moved) return prev;
      return prev.map(col => ({
        ...col,
        tasks: col.status.slug === newStatus
          ? [...col.tasks, { ...moved, status: newStatus }]
          : col.tasks.filter(t => t.id !== taskId),
      }));
    });
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;

  const isManager = user?.role === 'admin' || project?.manager?.id === user?.id;

  return (
    <div className="px-4 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link to={`/projects/${pk}`} className="hover:text-blue-600">← {project?.name}</Link>
            <span>/</span><span className="font-medium text-gray-700">Kanban</span>
          </div>
          <div className="flex gap-2">
            <Link to={`/projects/${pk}/scrum`} className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">Scrum</Link>
            {isManager && (
              <Link to={`/projects/${pk}/tasks/new`} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Task</Link>
            )}
          </div>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[70vh]">
          {columns.map(col => (
            <div key={col.status.id} className="flex-shrink-0 w-72">
              <div className="rounded-xl p-3" style={{ background: col.status.color + '22' }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ background: col.status.color }} />
                    <span className="font-semibold text-sm text-gray-800">{col.status.name}</span>
                  </div>
                  <span className="text-xs bg-white px-2 py-0.5 rounded-full text-gray-500 shadow-sm">{col.tasks.length}</span>
                </div>
                <div className="space-y-2">
                  {col.tasks.map(task => (
                    <TaskCard key={task.id} task={task} columns={columns} projectId={pk} onMove={handleMove} />
                  ))}
                  {col.tasks.length === 0 && (
                    <div className="text-xs text-gray-400 text-center py-6 border-2 border-dashed rounded-lg">Empty</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
"""

# ─── ScrumBoard ───────────────────────────────────────────────────────────────
files['projects/ScrumBoard.jsx'] = """\
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getScrum, getProject, getProjectStatuses } from '../../api';
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
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProject(pk), getProjectStatuses(pk)])
      .then(([p, s]) => { setProject(p.data); setStatuses(s.data); });
  }, [pk]);

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filterStatus) params.status = filterStatus;
    if (filterAssignee) params.assignee_id = filterAssignee;
    getScrum(pk, params).then(r => setTasks(r.data)).finally(() => setLoading(false));
  }, [pk, filterStatus, filterAssignee]);

  const isManager = user?.role === 'admin' || project?.manager?.id === user?.id;
  const allMembers = project
    ? [project.manager, ...(project.members || [])]
        .filter(Boolean)
        .filter((v, i, a) => a.findIndex(x => x.id === v.id) === i)
    : [];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to={`/projects/${pk}`} className="hover:text-blue-600">← {project?.name}</Link>
          <span>/</span><span className="font-medium text-gray-700">Scrum</span>
        </div>
        <div className="flex gap-2">
          <Link to={`/projects/${pk}/kanban`} className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">Kanban</Link>
          {isManager && (
            <Link to={`/projects/${pk}/tasks/new`} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Task</Link>
          )}
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
          <option value="">All statuses</option>
          {statuses.map(s => <option key={s.id} value={s.slug}>{s.name}</option>)}
        </select>
        <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
          <option value="">All members</option>
          {allMembers.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="bg-white rounded-2xl shadow overflow-hidden">
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
                <tr><td colSpan={7} className="text-center text-gray-400 py-10">No tasks found</td></tr>
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
                    {t.deadline ? new Date(t.deadline).toLocaleDateString() : '—'}
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
    </div>
  );
}
"""

# ─── TaskNew ──────────────────────────────────────────────────────────────────
files['projects/TaskNew.jsx'] = """\
import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createTask, getProject } from '../../api';
import Spinner from '../../components/Spinner';

export default function TaskNew() {
  const { pk } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', status: 'todo', priority: 'medium',
    time_slot: '', deadline: '', points: 10, assigned_to_ids: [],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getProject(pk).then(r => {
      setProject(r.data);
      const all = [r.data.manager, ...(r.data.members || [])]
        .filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);
      setMembers(all);
    });
  }, [pk]);

  const toggleAssignee = id =>
    setForm(f => ({
      ...f,
      assigned_to_ids: f.assigned_to_ids.includes(id)
        ? f.assigned_to_ids.filter(x => x !== id)
        : [...f.assigned_to_ids, id],
    }));

  const submit = async e => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const res = await createTask(pk, { ...form, points: Number(form.points), deadline: form.deadline || null });
      navigate(`/projects/${pk}/tasks/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create task');
      setSaving(false);
    }
  };

  if (!project) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to={`/projects/${pk}/kanban`} className="hover:text-blue-600">← {project.name} / Kanban</Link>
        <span>/</span><span className="text-gray-700 font-medium">New Task</span>
      </div>
      <div className="bg-white rounded-2xl shadow p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Create Task</h1>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {['low', 'medium', 'high', 'urgent'].map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Slot</label>
              <select value={form.time_slot} onChange={e => setForm(f => ({ ...f, time_slot: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">—</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
              <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
              <input type="number" min="0" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assignees</label>
            <div className="border rounded-xl divide-y max-h-48 overflow-y-auto">
              {members.map(m => (
                <label key={m.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" checked={form.assigned_to_ids.includes(m.id)}
                    onChange={() => toggleAssignee(m.id)} className="rounded text-blue-600" />
                  <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
                    {m.username[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{m.first_name} {m.last_name}</p>
                    <p className="text-xs text-gray-400">{m.username}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Task'}
            </button>
            <Link to={`/projects/${pk}/kanban`}
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
"""

# ─── TaskEdit ────────────────────────────────────────────────────────────────
files['projects/TaskEdit.jsx'] = """\
import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getTask, updateTask, getProject, getProjectStatuses } from '../../api';
import Spinner from '../../components/Spinner';

export default function TaskEdit() {
  const { pk, taskId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getTask(pk, taskId), getProject(pk), getProjectStatuses(pk)])
      .then(([t, p, s]) => {
        setProject(p.data);
        setStatuses(s.data);
        const d = t.data;
        setForm({
          title: d.title, description: d.description || '',
          status: d.status, priority: d.priority,
          time_slot: d.time_slot || '', deadline: d.deadline || '',
          points: d.points, assigned_to_ids: d.assigned_to?.map(u => u.id) || [],
        });
      });
  }, [pk, taskId]);

  const submit = async e => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await updateTask(pk, taskId, { ...form, points: Number(form.points), deadline: form.deadline || null });
      navigate(`/projects/${pk}/tasks/${taskId}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update task');
      setSaving(false);
    }
  };

  if (!form) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to={`/projects/${pk}/tasks/${taskId}`} className="hover:text-blue-600">← Back to Task</Link>
        <span>/</span><span className="text-gray-700 font-medium">Edit</span>
      </div>
      <div className="bg-white rounded-2xl shadow p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Edit Task</h1>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={4}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {statuses.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {['low', 'medium', 'high', 'urgent'].map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Slot</label>
              <select value={form.time_slot} onChange={e => setForm(f => ({ ...f, time_slot: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">—</option>
                <option value="morning">Morning</option>
                <option value="afternoon">Afternoon</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
              <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
              <input type="number" min="0" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <Link to={`/projects/${pk}/tasks/${taskId}`}
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
"""

# ─── TaskDetail ───────────────────────────────────────────────────────────────
files['projects/TaskDetail.jsx'] = """\
import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getTask, getProject, getTaskComments, createTaskComment,
  deleteTask, moveTask, suggestAssignee, getProjectStatuses, formatDateTime,
} from '../../api';
import { relativeTime } from '../../api';
import Spinner from '../../components/Spinner';
import PriorityBadge from '../../components/PriorityBadge';
import StatusBadge from '../../components/StatusBadge';
import { useAuth } from '../../context/AuthContext';

function AISuggestPanel({ pk, taskId }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const run = async () => {
    setLoading(true);
    try {
      const r = await suggestAssignee(pk, taskId);
      setResult(r.data);
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <span className="text-purple-500">✦</span> AI Suggestion
      </h3>
      {!result ? (
        <button onClick={run} disabled={loading}
          className="w-full py-2 bg-purple-50 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-100 disabled:opacity-60">
          {loading ? 'Analysing…' : 'Suggest Assignees'}
        </button>
      ) : (
        <div className="space-y-2">
          {result.members?.slice(0, 3).map((m, i) => (
            <div key={m.user_id} className="border rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">#{i + 1} {m.username}</span>
                <span className="text-xs bg-purple-100 text-purple-700 rounded-full px-2 py-0.5">
                  {Math.round((m.confidence || 0) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5">
                <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${(m.confidence || 0) * 100}%` }} />
              </div>
              <p className="text-xs text-gray-500 line-clamp-2">{m.reason}</p>
            </div>
          ))}
          <button onClick={run} className="text-xs text-purple-600 hover:underline mt-1">Re-run</button>
        </div>
      )}
    </div>
  );
}

export default function TaskDetail() {
  const { pk, taskId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  const [comments, setComments] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getTask(pk, taskId), getProject(pk),
      getTaskComments(pk, taskId), getProjectStatuses(pk),
    ])
      .then(([t, p, c, s]) => {
        setTask(t.data); setProject(p.data);
        setComments(c.data); setStatuses(s.data);
      })
      .finally(() => setLoading(false));
  }, [pk, taskId]);

  const submitComment = async e => {
    e.preventDefault(); setPosting(true);
    try {
      const res = await createTaskComment(pk, taskId, comment);
      setComments(prev => [...prev, res.data]);
      setComment('');
    } finally { setPosting(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    await deleteTask(pk, taskId);
    navigate(`/projects/${pk}/kanban`);
  };

  const handleMove = async slug => {
    await moveTask(pk, taskId, slug);
    setTask(t => ({ ...t, status: slug }));
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;
  if (!task) return null;

  const isManager = user?.role === 'admin' || project?.manager?.id === user?.id;
  const isAssignee = task.assigned_to?.some(a => a.id === user?.id);
  const canEdit = isManager || isAssignee;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to={`/projects/${pk}`} className="hover:text-blue-600">← {project?.name}</Link>
        <span>/</span>
        <Link to={`/projects/${pk}/kanban`} className="hover:text-blue-600">Kanban</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate max-w-xs">{task.title}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task card */}
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
              {canEdit && (
                <div className="flex gap-2 flex-shrink-0">
                  <Link to={`/projects/${pk}/tasks/${taskId}/edit`}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                    Edit
                  </Link>
                  {isManager && (
                    <button onClick={handleDelete}
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100">
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
            {task.description && (
              <p className="text-gray-700 text-sm whitespace-pre-line mb-4 leading-relaxed">{task.description}</p>
            )}
            {canEdit && statuses.filter(s => s.slug !== task.status).length > 0 && (
              <div className="flex gap-2 flex-wrap pt-3 border-t items-center">
                <span className="text-xs text-gray-400">Move to:</span>
                {statuses.filter(s => s.slug !== task.status).map(s => (
                  <button key={s.slug} onClick={() => handleMove(s.slug)}
                    className="text-xs border rounded-full px-3 py-1 hover:bg-gray-50 text-gray-600 hover:border-gray-400 transition-colors">
                    {s.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Comments ({comments.length})</h2>
            <div className="space-y-4 mb-6">
              {comments.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No comments yet. Be the first!</p>
              )}
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs flex-shrink-0">
                    {c.author?.username?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-800">{c.author?.username}</span>
                      <span className="text-xs text-gray-400">{relativeTime(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={submitComment} className="flex gap-2">
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
                placeholder="Write a comment…" required
                className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              <button disabled={posting || !comment.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 self-end">
                Post
              </button>
            </form>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow p-5 text-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Status</span><StatusBadge status={task.status} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Priority</span><PriorityBadge priority={task.priority} />
            </div>
            {task.time_slot && (
              <div className="flex justify-between"><span className="text-gray-500">Time slot</span><span className="text-gray-700">{task.time_slot}</span></div>
            )}
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Deadline</span>
              <span className={task.is_overdue ? 'text-red-500 font-semibold' : task.deadline_approaching ? 'text-orange-500' : 'text-gray-700'}>
                {task.deadline ? new Date(task.deadline).toLocaleDateString() : '—'}
              </span>
            </div>
            {task.points > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Points</span>
                <span className="bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5 text-xs">{task.points} pts</span>
              </div>
            )}
            {task.completed_at && (
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-gray-500">Completed</span>
                <span className="text-green-600 text-xs">{formatDateTime(task.completed_at)}</span>
              </div>
            )}
            {task.assigned_to?.length > 0 && (
              <div className="border-t pt-2">
                <p className="text-gray-500 mb-2">Assignees</p>
                <div className="flex flex-wrap gap-1.5">
                  {task.assigned_to.map(u => (
                    <span key={u.id} className="bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 text-xs">{u.username}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <AISuggestPanel pk={pk} taskId={taskId} />

          <Link to={`/projects/${pk}/tasks/${taskId}/chat`}
            className="flex items-center gap-2 bg-white rounded-2xl shadow p-4 hover:shadow-md transition-shadow text-green-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-medium">Task Chat</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
"""

# ─── BulkReassign ────────────────────────────────────────────────────────────
files['projects/BulkReassign.jsx'] = """\
import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getProject, listTasks, bulkReassign } from '../../api';
import Spinner from '../../components/Spinner';
import StatusBadge from '../../components/StatusBadge';

export default function BulkReassign() {
  const { pk } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [selected, setSelected] = useState([]);
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [action, setAction] = useState('replace');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getProject(pk), listTasks(pk)])
      .then(([p, t]) => { setProject(p.data); setTasks(t.data || []); })
      .finally(() => setLoading(false));
  }, [pk]);

  const toggleAll = e => setSelected(e.target.checked ? tasks.map(t => t.id) : []);
  const toggle = id => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const submit = async e => {
    e.preventDefault();
    if (!selected.length || !newAssigneeId) return;
    setSaving(true);
    try {
      await bulkReassign(pk, { task_ids: selected, new_assignee_id: Number(newAssigneeId), action });
      navigate(`/projects/${pk}`);
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;

  const allMembers = project
    ? [project.manager, ...(project.members || [])].filter((v, i, a) => a.findIndex(x => x.id === v.id) === i)
    : [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to={`/projects/${pk}`} className="hover:text-blue-600">← {project?.name}</Link>
        <span>/</span><span className="text-gray-700 font-medium">Bulk Reassign</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Bulk Reassignment</h1>
      <form onSubmit={submit}>
        <div className="bg-white rounded-2xl shadow p-6 mb-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to</label>
              <select value={newAssigneeId} onChange={e => setNewAssigneeId(e.target.value)} required
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Select member…</option>
                {allMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.username} — {m.first_name} {m.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
              <select value={action} onChange={e => setAction(e.target.value)}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="replace">Replace all assignees</option>
                <option value="add">Add to existing</option>
              </select>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={selected.length === tasks.length && tasks.length > 0}
                    onChange={toggleAll} className="rounded text-blue-600" />
                </th>
                {['Task', 'Status', 'Assignees', 'Deadline'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {tasks.map(t => (
                <tr key={t.id} className={`hover:bg-gray-50 ${selected.includes(t.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.includes(t.id)} onChange={() => toggle(t.id)} className="rounded text-blue-600" />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{t.title}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {t.assigned_to?.map(u => (
                        <span key={u.id} className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-xs">{u.username}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {t.deadline ? new Date(t.deadline).toLocaleDateString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-3">
          <button type="submit" disabled={saving || !selected.length || !newAssigneeId}
            className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Reassigning…' : `Reassign ${selected.length} task${selected.length !== 1 ? 's' : ''}`}
          </button>
          <Link to={`/projects/${pk}`} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
"""

# ─── Members ─────────────────────────────────────────────────────────────────
files['projects/Members.jsx'] = """\
import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProject, getProjectMembers, searchProjectMembers, addProjectMember, removeProjectMember } from '../../api';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';

function MemberCard({ member, isManager, onRemove }) {
  const u = member.user;
  const initials = [u.first_name, u.last_name].filter(Boolean).map(n => n[0]).join('').toUpperCase()
    || u.username[0].toUpperCase();
  return (
    <div className="bg-white rounded-xl shadow-sm border p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500 flex items-center justify-center text-white font-semibold text-sm">
            {initials}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{u.first_name} {u.last_name}</p>
            <p className="text-xs text-gray-400">{u.username} · {u.role?.replace(/_/g, ' ')}</p>
          </div>
        </div>
        {isManager && (
          <button onClick={() => onRemove(u.id)}
            className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded border border-red-200 hover:border-red-400 transition-colors">
            Remove
          </button>
        )}
      </div>
      {u.skills && (
        <div className="flex flex-wrap gap-1 mb-3">
          {u.skills.split(',').map(s => s.trim()).filter(Boolean).map(s => (
            <span key={s} className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-xs">{s}</span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-3 gap-2 text-center text-xs border-t pt-3">
        <div><p className="font-bold text-gray-900 text-sm">{member.tasks_count}</p><p className="text-gray-400">Tasks</p></div>
        <div><p className="font-bold text-green-600 text-sm">{member.done_count}</p><p className="text-gray-400">Done</p></div>
        <div><p className="font-bold text-yellow-600 text-sm">{u.reward_points || 0}</p><p className="text-gray-400">Points</p></div>
      </div>
      {member.active_tasks?.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-gray-500 mb-1">Active tasks:</p>
          {member.active_tasks.slice(0, 3).map(t => (
            <p key={t.id} className="text-xs text-blue-600 truncate">· {t.title}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Members() {
  const { pk } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadMembers = useCallback(() => {
    getProjectMembers(pk).then(r => setMembers(r.data));
  }, [pk]);

  useEffect(() => {
    Promise.all([getProject(pk), getProjectMembers(pk)])
      .then(([p, m]) => { setProject(p.data); setMembers(m.data); })
      .finally(() => setLoading(false));
  }, [pk]);

  useEffect(() => {
    if (searchQ.length < 1) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      searchProjectMembers(pk, searchQ).then(r => setSearchResults(r.data));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ, pk]);

  const addMember = async userId => {
    await addProjectMember(pk, userId);
    setSearchQ(''); setSearchResults([]);
    loadMembers();
  };

  const removeMember = async userId => {
    if (!window.confirm('Remove this member from the project?')) return;
    await removeProjectMember(pk, userId);
    loadMembers();
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;

  const isManager = user?.role === 'admin' || project?.manager?.id === user?.id;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to={`/projects/${pk}`} className="hover:text-blue-600">← {project?.name}</Link>
        <span>/</span><span className="text-gray-700 font-medium">Members</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Team Members <span className="text-gray-400 text-lg font-normal">({members.length})</span>
      </h1>

      {isManager && (
        <div className="bg-white rounded-2xl shadow p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Add Member</h2>
          <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
            placeholder="Search by username or name…"
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          {searchResults.length > 0 && (
            <div className="mt-2 border rounded-xl divide-y shadow-sm">
              {searchResults.map(u => (
                <div key={u.id} className="flex items-center justify-between px-4 py-2 hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                      {u.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.full_name || u.username}</p>
                      <p className="text-xs text-gray-400">{u.username}</p>
                    </div>
                  </div>
                  <button onClick={() => addMember(u.id)}
                    className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700">
                    + Add
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map(m => (
          <MemberCard key={m.user.id} member={m} isManager={isManager} onRemove={removeMember} />
        ))}
      </div>
    </div>
  );
}
"""

# ─── Leaderboard ─────────────────────────────────────────────────────────────
files['projects/Leaderboard.jsx'] = """\
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getLeaderboard, getProject } from '../../api';
import Spinner from '../../components/Spinner';

export default function Leaderboard() {
  const { pk } = useParams();
  const [project, setProject] = useState(null);
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getLeaderboard(pk), getProject(pk)])
      .then(([b, p]) => { setBoard(b.data); setProject(p.data); })
      .finally(() => setLoading(false));
  }, [pk]);

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to={`/projects/${pk}`} className="hover:text-blue-600">← {project?.name}</Link>
        <span>/</span><span className="text-gray-700 font-medium">Leaderboard</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">🏆 Leaderboard</h1>
      <div className="bg-white rounded-2xl shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              {['#', 'Member', 'Points'].map(h => (
                <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {board.length === 0 && (
              <tr><td colSpan={3} className="text-center text-gray-400 py-10">No data yet</td></tr>
            )}
            {board.map(entry => (
              <tr key={entry.user_id} className={entry.rank === 1 ? 'bg-yellow-50' : 'hover:bg-gray-50'}>
                <td className="px-6 py-4">
                  <span className={`font-bold text-sm ${entry.rank === 1 ? 'text-yellow-600' : entry.rank === 2 ? 'text-gray-500' : 'text-gray-400'}`}>
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900 text-sm">{entry.full_name || entry.username}</p>
                  <p className="text-xs text-gray-400">@{entry.username}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="bg-yellow-100 text-yellow-800 rounded-full px-3 py-1 text-sm font-semibold">
                    {entry.reward_points} pts
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
"""

# ─── ProjectChat ──────────────────────────────────────────────────────────────
files['projects/ProjectChat.jsx'] = """\
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProject } from '../../api';
import ChatWindow from '../../components/ChatWindow';

export default function ProjectChat() {
  const { pk } = useParams();
  const [project, setProject] = useState(null);
  useEffect(() => { getProject(pk).then(r => setProject(r.data)); }, [pk]);
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to={`/projects/${pk}`} className="hover:text-blue-600">← {project?.name || 'Project'}</Link>
        <span>/</span><span className="text-gray-700 font-medium">Chat</span>
      </div>
      {project && (
        <div className="flex items-center gap-3 mb-4 bg-white rounded-xl border px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            {project.name[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{project.name}</p>
            <p className="text-xs text-gray-400">{project.members?.length || 0} members</p>
          </div>
        </div>
      )}
      <ChatWindow roomType="project" pk={pk} />
    </div>
  );
}
"""

# ─── TaskChat ─────────────────────────────────────────────────────────────────
files['projects/TaskChat.jsx'] = """\
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getTask, getProject } from '../../api';
import ChatWindow from '../../components/ChatWindow';

export default function TaskChat() {
  const { pk, taskId } = useParams();
  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  useEffect(() => {
    Promise.all([getTask(pk, taskId), getProject(pk)])
      .then(([t, p]) => { setTask(t.data); setProject(p.data); });
  }, [pk, taskId]);
  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
        <Link to={`/projects/${pk}`} className="hover:text-blue-600">← {project?.name}</Link>
        <span>/</span>
        <Link to={`/projects/${pk}/tasks/${taskId}`} className="hover:text-blue-600 truncate max-w-xs">{task?.title || 'Task'}</Link>
        <span>/</span><span className="text-gray-700 font-medium">Chat</span>
      </div>
      {task && (
        <div className="flex items-center gap-3 mb-4 bg-white rounded-xl border px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">#</div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">{task.title}</p>
            <p className="text-xs text-gray-400">Sub-group · {project?.name}</p>
          </div>
        </div>
      )}
      <ChatWindow roomType="task" pk={taskId} />
    </div>
  );
}
"""

# ─── JobList ──────────────────────────────────────────────────────────────────
files['hiring/JobList.jsx'] = """\
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listJobs, listApplications } from '../../api';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';

const STATUS_STYLES = {
  published: 'bg-green-100 text-green-700',
  draft: 'bg-yellow-100 text-yellow-700',
  paused: 'bg-orange-100 text-orange-700',
  closed: 'bg-red-100 text-red-700',
};

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
  { label: 'Paused', value: 'paused' },
  { label: 'Closed', value: 'closed' },
];

export default function JobList() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    listJobs(filter || undefined).then(r => setJobs(r.data)).finally(() => setLoading(false));
  }, [filter]);

  const isHR = ['admin', 'hr_manager'].includes(user?.role);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Job Postings</h1>
        {isHR && (
          <Link to="/hiring/jobs/new" className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
            + New Job
          </Link>
        )}
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.value ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:border-blue-300'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : jobs.length === 0 ? (
        <div className="text-center text-gray-400 py-16">No job postings found.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map(job => (
            <Link key={job.id} to={`/hiring/jobs/${job.id}`}
              className="block bg-white rounded-xl shadow-sm border p-5 hover:shadow-md hover:border-blue-200 transition-all">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-1">{job.title}</h3>
                <span className={`text-xs rounded-full px-2 py-0.5 flex-shrink-0 ${STATUS_STYLES[job.status] || 'bg-gray-100 text-gray-600'}`}>
                  {job.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{job.contract_type} {job.location ? `· ${job.location}` : ''}</p>
              {job.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">{job.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-400 border-t pt-2">
                <span>{job.application_count ?? 0} applications</span>
                <span>{new Date(job.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
"""

# ─── JobNew ───────────────────────────────────────────────────────────────────
files['hiring/JobNew.jsx'] = """\
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createJob } from '../../api';

export default function JobNew() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', description: '', required_skills: '', contract_type: 'CDI', location: '', status: 'draft' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async e => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const res = await createJob(form);
      navigate(`/hiring/jobs/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create job');
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/hiring/jobs" className="hover:text-blue-600">← Job Postings</Link>
        <span>/</span><span className="text-gray-700 font-medium">New Job</span>
      </div>
      <div className="bg-white rounded-2xl shadow p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Create Job Posting</h1>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={5}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills (comma-separated)</label>
            <input value={form.required_skills} onChange={e => setForm(f => ({ ...f, required_skills: e.target.value }))}
              placeholder="e.g. Python, React, SQL"
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contract</label>
              <select value={form.contract_type} onChange={e => setForm(f => ({ ...f, contract_type: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {['CDI', 'CDD', 'Stage', 'Freelance'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {['draft', 'published', 'paused', 'closed'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Creating…' : 'Create Job'}
            </button>
            <Link to="/hiring/jobs" className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
"""

# ─── JobEdit ──────────────────────────────────────────────────────────────────
files['hiring/JobEdit.jsx'] = """\
import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getJob, updateJob } from '../../api';
import Spinner from '../../components/Spinner';

export default function JobEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getJob(id).then(r => {
      const d = r.data;
      setForm({ title: d.title || '', description: d.description || '', required_skills: d.required_skills || '',
        contract_type: d.contract_type || 'CDI', location: d.location || '', status: d.status || 'draft' });
    });
  }, [id]);

  const submit = async e => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await updateJob(id, form);
      navigate(`/hiring/jobs/${id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update job');
      setSaving(false);
    }
  };

  if (!form) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to={`/hiring/jobs/${id}`} className="hover:text-blue-600">← Job Detail</Link>
        <span>/</span><span className="text-gray-700 font-medium">Edit</span>
      </div>
      <div className="bg-white rounded-2xl shadow p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Edit Job Posting</h1>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={5}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills</label>
            <input value={form.required_skills} onChange={e => setForm(f => ({ ...f, required_skills: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contract</label>
              <select value={form.contract_type} onChange={e => setForm(f => ({ ...f, contract_type: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {['CDI', 'CDD', 'Stage', 'Freelance'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                {['draft', 'published', 'paused', 'closed'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <Link to={`/hiring/jobs/${id}`} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
"""

# ─── JobDetail ────────────────────────────────────────────────────────────────
files['hiring/JobDetail.jsx'] = """\
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getJob, getJobApplications, updateApplicationStatus } from '../../api';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';

const STATUS_OPTS = ['pending', 'reviewed', 'interview', 'accepted', 'rejected'];
const STATUS_STYLE = {
  pending: 'bg-gray-100 text-gray-600',
  reviewed: 'bg-blue-100 text-blue-700',
  interview: 'bg-purple-100 text-purple-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

function ScoreBar({ score }) {
  if (score == null) return <span className="text-xs text-gray-400">Not analyzed</span>;
  const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  const textColor = score >= 70 ? 'text-green-700' : score >= 40 ? 'text-yellow-700' : 'text-red-700';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-semibold ${textColor}`}>{Math.round(score)}%</span>
    </div>
  );
}

export default function JobDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const isHR = ['admin', 'hr_manager'].includes(user?.role);

  useEffect(() => {
    const p = [getJob(id)];
    if (isHR) p.push(getJobApplications(id));
    Promise.all(p).then(([j, a]) => {
      setJob(j.data);
      if (a) setApplications(a.data);
    }).finally(() => setLoading(false));
  }, [id, isHR]);

  const changeStatus = async (appId, status) => {
    await updateApplicationStatus(appId, status);
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;
  if (!job) return null;

  const skills = (job.required_skills || '').split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/hiring/jobs" className="hover:text-blue-600">← Job Postings</Link>
        <span>/</span><span className="text-gray-700 font-medium truncate max-w-xs">{job.title}</span>
      </div>

      {/* Job card */}
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            <p className="text-gray-500 text-sm mt-1">{job.contract_type}{job.location ? ` · ${job.location}` : ''}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {isHR && (
              <Link to={`/hiring/jobs/${id}/edit`} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Edit</Link>
            )}
            {job.status === 'published' && (
              <Link to={`/hiring/jobs/${id}/apply`} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                Apply link ↗
              </Link>
            )}
          </div>
        </div>
        {job.description && <p className="text-gray-700 text-sm whitespace-pre-line mb-4">{job.description}</p>}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
            {skills.map(s => (
              <span key={s} className="bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 text-xs">{s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Applications table */}
      {isHR && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Applications <span className="text-gray-400 font-normal">({applications.length})</span>
          </h2>
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Candidate', 'AI Score', 'Status', 'Date', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {applications.length === 0 && (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-8">No applications yet</td></tr>
                )}
                {applications.map(app => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link to={`/hiring/applications/${app.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {app.first_name} {app.last_name}
                      </Link>
                      <p className="text-xs text-gray-400">{app.email}</p>
                    </td>
                    <td className="px-4 py-3"><ScoreBar score={app.ai_score} /></td>
                    <td className="px-4 py-3">
                      <select value={app.status} onChange={e => changeStatus(app.id, e.target.value)}
                        className={`text-xs rounded-full px-2 py-0.5 border-0 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${STATUS_STYLE[app.status]}`}>
                        {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(app.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Link to={`/hiring/applications/${app.id}`} className="text-xs text-blue-600 hover:underline">View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
"""

# ─── Apply ────────────────────────────────────────────────────────────────────
files['hiring/Apply.jsx'] = """\
import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getJob, applyToJob } from '../../api';
import Spinner from '../../components/Spinner';

export default function Apply() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', cover_letter: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getJob(id).then(r => setJob(r.data)).catch(() => setError('Job not found or no longer available.'));
  }, [id]);

  const submit = async e => {
    e.preventDefault();
    if (!file) { setError('Please attach your resume.'); return; }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('resume', file);
      await applyToJob(id, fd);
      navigate('/hiring/apply-success');
    } catch (err) {
      setError(err.response?.data?.detail || 'Submission failed. Please try again.');
      setSaving(false);
    }
  };

  if (!job && !error) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-12 px-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow p-8">
        {job && (
          <div className="mb-6 pb-6 border-b">
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            <p className="text-gray-500 text-sm mt-1">{job.contract_type}{job.location ? ` · ${job.location}` : ''}</p>
          </div>
        )}
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Submit Your Application</h2>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cover Letter</label>
            <textarea value={form.cover_letter} onChange={e => setForm(f => ({ ...f, cover_letter: e.target.value }))} rows={5}
              placeholder="Tell us about yourself and why you're a great fit…"
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resume / CV *</label>
            <input type="file" accept=".pdf,.docx,.doc,.txt" required
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full border rounded-xl px-3 py-2 text-sm file:mr-3 file:bg-blue-50 file:text-blue-700 file:border-0 file:rounded-lg file:px-3 file:py-1 file:text-xs file:cursor-pointer" />
            <p className="text-xs text-gray-400 mt-1">PDF, DOCX, DOC or TXT — max 10 MB</p>
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
            {saving ? 'Submitting…' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
"""

# ─── ApplySuccess ─────────────────────────────────────────────────────────────
files['hiring/ApplySuccess.jsx'] = """\
import { Link } from 'react-router-dom';

export default function ApplySuccess() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow p-12 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h1>
        <p className="text-gray-500 mb-6">
          Thank you for applying. Our team will review your application and get back to you soon.
        </p>
        <p className="text-sm text-gray-400 mb-8">You will receive a response by email.</p>
        <Link to="/hiring/jobs" className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
          See More Jobs
        </Link>
      </div>
    </div>
  );
}
"""

# ─── ApplicationDetail ────────────────────────────────────────────────────────
files['hiring/ApplicationDetail.jsx'] = """\
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getApplication, updateApplicationStatus, analyzeApplication, formatDateTime, API_BASE } from '../../api';
import Spinner from '../../components/Spinner';
import PdfViewer from '../../components/PdfViewer';

const STATUS_OPTS = ['pending', 'reviewed', 'interview', 'accepted', 'rejected'];
const STATUS_STYLE = {
  pending: 'bg-gray-100 text-gray-600',
  reviewed: 'bg-blue-100 text-blue-700',
  interview: 'bg-purple-100 text-purple-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

function AIPanel({ app, onReanalyze }) {
  const [loading, setLoading] = useState(false);
  const ai = app.ai_data;

  const reanalyze = async () => {
    setLoading(true);
    try { await analyzeApplication(app.id); onReanalyze(); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span className="text-purple-500">✦</span> AI Analysis
      </h3>
      {!ai ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-400 mb-3">No AI analysis yet.</p>
          <button onClick={reanalyze} disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm hover:bg-purple-700 disabled:opacity-50">
            {loading ? 'Analysing…' : 'Analyze Resume'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Score */}
          {app.ai_score != null && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Score</span>
                <span className={`font-bold ${app.ai_score >= 70 ? 'text-green-600' : app.ai_score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {Math.round(app.ai_score)}/100
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${app.ai_score >= 70 ? 'bg-green-500' : app.ai_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${app.ai_score}%` }}
                />
              </div>
            </div>
          )}
          {ai.analysis && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-600 leading-relaxed">{ai.analysis}</p>
            </div>
          )}
          {ai.strengths?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Strengths</p>
              <ul className="space-y-0.5">
                {ai.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-green-700 flex items-start gap-1">
                    <span className="mt-0.5 flex-shrink-0">✓</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ai.weaknesses?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Weaknesses</p>
              <ul className="space-y-0.5">
                {ai.weaknesses.map((w, i) => (
                  <li key={i} className="text-xs text-red-600 flex items-start gap-1">
                    <span className="mt-0.5 flex-shrink-0">✗</span>{w}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button onClick={reanalyze} disabled={loading}
            className="text-xs text-purple-600 hover:underline">
            {loading ? 'Re-analysing…' : 'Re-run analysis'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ApplicationDetail() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => getApplication(id).then(r => setApp(r.data));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [id]);

  const changeStatus = async status => {
    await updateApplicationStatus(id, status);
    setApp(a => ({ ...a, status }));
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;
  if (!app) return null;

  const resumeUrl = app.resume
    ? (app.resume.startsWith('http') ? app.resume : `${API_BASE}/${app.resume.replace(/\\\\/g, '/')}`)
    : null;
  const isPdf = resumeUrl?.toLowerCase().endsWith('.pdf');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/hiring/jobs" className="hover:text-blue-600">← Jobs</Link>
        {app.job_id && (
          <><span>/</span><Link to={`/hiring/jobs/${app.job_id}`} className="hover:text-blue-600">Job Detail</Link></>
        )}
        <span>/</span><span className="text-gray-700 font-medium">{app.first_name} {app.last_name}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Candidate info */}
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-2xl font-bold text-gray-900">{app.first_name} {app.last_name}</h1>
              <select value={app.status} onChange={e => changeStatus(e.target.value)}
                className={`text-sm rounded-full px-3 py-1 border-0 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${STATUS_STYLE[app.status]}`}>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Email</span><span className="text-gray-900">{app.email}</span></div>
              {app.phone && <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Phone</span><span className="text-gray-900">{app.phone}</span></div>}
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Applied</span><span className="text-gray-900">{formatDateTime(app.created_at)}</span></div>
            </div>
          </div>

          {/* Cover letter */}
          {app.cover_letter && (
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Cover Letter</h2>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{app.cover_letter}</p>
            </div>
          )}

          {/* CV */}
          {resumeUrl && (
            <div className="bg-white rounded-2xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Resume / CV</h2>
                <a href={resumeUrl} download className="text-xs text-blue-600 hover:underline">Download ↓</a>
              </div>
              {isPdf ? (
                <PdfViewer url={resumeUrl} />
              ) : (
                <a href={resumeUrl} target="_blank" rel="noreferrer"
                  className="block text-center py-8 border-2 border-dashed rounded-xl text-blue-600 hover:bg-blue-50">
                  Open file ↗
                </a>
              )}
            </div>
          )}

          {/* Interviews */}
          {app.interviews?.length > 0 && (
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Interviews</h2>
              <div className="space-y-3">
                {app.interviews.map(iv => (
                  <div key={iv.id} className="border rounded-xl p-3 text-sm">
                    <p className="font-medium text-gray-900">{formatDateTime(iv.scheduled_at)}</p>
                    {iv.location && <p className="text-gray-500">📍 {iv.location}</p>}
                    {iv.notes && <p className="text-gray-500 mt-1 text-xs">{iv.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <AIPanel app={app} onReanalyze={load} />
          {!['accepted', 'rejected'].includes(app.status) && (
            <Link to={`/hiring/applications/${id}/interview`}
              className="block w-full text-center py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
              Schedule Interview
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
"""

# ─── InterviewSchedule ────────────────────────────────────────────────────────
files['hiring/InterviewSchedule.jsx'] = """\
import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getApplication, scheduleInterview } from '../../api';
import Spinner from '../../components/Spinner';

export default function InterviewSchedule() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [app, setApp] = useState(null);
  const [form, setForm] = useState({ scheduled_at: '', location: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getApplication(id).then(r => setApp(r.data));
  }, [id]);

  const submit = async e => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await scheduleInterview(id, { ...form, scheduled_at: new Date(form.scheduled_at).toISOString() });
      navigate(`/hiring/applications/${id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to schedule interview');
      setSaving(false);
    }
  };

  if (!app) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to={`/hiring/applications/${id}`} className="hover:text-blue-600">
          ← {app.first_name} {app.last_name}
        </Link>
        <span>/</span><span className="text-gray-700 font-medium">Schedule Interview</span>
      </div>
      <div className="bg-white rounded-2xl shadow p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-1">Schedule Interview</h1>
        <p className="text-sm text-gray-500 mb-6">Candidate: {app.first_name} {app.last_name}</p>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time *</label>
            <input type="datetime-local" value={form.scheduled_at}
              onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} required
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
              placeholder="Office / Google Meet link / …"
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving}
              className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Scheduling…' : 'Schedule'}
            </button>
            <Link to={`/hiring/applications/${id}`}
              className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
"""

# ─── Write all files ──────────────────────────────────────────────────────────
for rel_path, content in files.items():
    full_path = os.path.join(BASE, rel_path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'wrote {rel_path}')

print('\nDone — all files written.')
