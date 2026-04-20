import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createTask, getProject } from '../../api';
import Spinner from '../../components/Spinner';

export default function TaskNew() {
  const { pk } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const fromDateTimeLocal = (value) => (value ? new Date(value).toISOString() : null);
  const [form, setForm] = useState({
    title: '', description: '', status: 'todo', priority: 'medium',
    start_time: '', end_time: '', points: 10, assigned_to_ids: [],
    sprint_id: '',
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
      const payload = { 
        ...form, 
        points: Number(form.points), 
        start_time: fromDateTimeLocal(form.start_time),
        end_time: fromDateTimeLocal(form.end_time),
        sprint_id: form.sprint_id ? Number(form.sprint_id) : null
      };
      const res = await createTask(pk, payload);
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
              <input type="number" min="0" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sprint</label>
            <select value={form.sprint_id} onChange={e => setForm(f => ({ ...f, sprint_id: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">Backlog (No Sprint)</option>
              {project.sprints?.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
              ))}
            </select>
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
