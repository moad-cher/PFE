import { useState, useEffect } from 'react';
import { createTask, getProject } from '../../api';
import Spinner from '../../components/shared/ui/Spinner';

export default function TaskNew({ isOpen, onClose, pk, initialStoryId, onSuccess }) {
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const fromDateTimeLocal = (value) => (value ? new Date(value).toISOString() : null);
  const [form, setForm] = useState({
    title: '', description: '', status: 'todo', priority: 'medium',
    start_time: '', end_time: '', points: 10, assigned_to_ids: [],
    story_id: initialStoryId || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && pk) {
      getProject(pk).then(r => {
        setProject(r.data);
        const all = [r.data.manager, ...(r.data.members || [])]
          .filter((v, i, a) => a.findIndex(x => x.id === v.id) === i);
        setMembers(all);
      });
      // Reset form or set initial values
      setForm(prev => ({
        ...prev,
        title: '', description: '', status: 'todo', priority: 'medium',
        start_time: '', end_time: '', points: 10, assigned_to_ids: [],
        story_id: initialStoryId || '',
      }));
      setError('');
      setSaving(false);
    }
  }, [isOpen, pk, initialStoryId]);

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
      };
      const res = await createTask(pk, payload);
      if (onSuccess) onSuccess(res.data);
      onClose();
    } catch (err) {
      setError(err.message || err.response?.data?.detail || 'Failed to create task');
      setSaving(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen) return null;

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 16);
  };

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 backdrop-blur-sm px-4 py-8 overflow-y-auto" 
      onClick={onClose}
      role="presentation"
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-auto mt-20 relative border border-gray-100" 
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md flex items-center justify-between p-6 border-b border-gray-100 rounded-t-3xl">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Create New Task</h1>
            {project && <p className="text-sm text-gray-500 mt-0.5">{project.name}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8">
          {!project ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : (
            <>
              {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title *</label>
                  <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required
                    placeholder="What needs to be done?"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                  <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                    placeholder="Add more details about this task..."
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Priority</label>
                    <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-white">
                      {['low', 'medium', 'high', 'urgent'].map(p => (
                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Points</label>
                    <input type="number" min="0" value={form.points} onChange={e => setForm(f => ({ ...f, points: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Time</label>
                    <input type="datetime-local" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-white" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Time</label>
                    <input type="datetime-local" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                      className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-white" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">User Story</label>
                  <select value={form.story_id} onChange={e => setForm(f => ({ ...f, story_id: e.target.value }))}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all bg-white">
                    <option value="">Standalone (No Story)</option>
                    {project.stories?.map(s => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2.5">Assignees</label>
                  <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-40 overflow-y-auto shadow-inner bg-gray-50/30">
                    {members.map(m => (
                      <label key={m.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-white cursor-pointer transition-colors group">
                        <input type="checkbox" checked={form.assigned_to_ids.includes(m.id)}
                          onChange={() => toggleAssignee(m.id)} className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4" />
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-[10px] font-bold border border-indigo-200 group-hover:scale-110 transition-transform">
                          {m.username[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{m.first_name} {m.last_name}</p>
                          <p className="text-[10px] text-gray-400 truncate tracking-wide uppercase">@{m.username}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 mt-8">
                  <button type="button" onClick={onClose}
                    className="px-6 py-2.5 text-sm font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-100 transition-all active:scale-95">
                    {saving ? 'Creating…' : 'Create Task'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
