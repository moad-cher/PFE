import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getTask, updateTask, getProject, getProjectStatuses, getProjectMembers, getStories } from '../../api';
import Spinner from '../../components/ui/Spinner';

export default function TaskEdit() {
  const { pk, taskId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [stories, setStories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toDateTimeLocal = (value) => {
    if (!value) return '';
    const d = new Date(value);
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  };
  const fromDateTimeLocal = (value) => (value ? new Date(value).toISOString() : null);

  useEffect(() => {
    Promise.all([getTask(pk, taskId), getProject(pk), getProjectStatuses(pk), getProjectMembers(pk), getStories(pk)])
      .then(([t, p, s, m, st]) => {
        setProject(p.data);
        setStatuses(s.data);
        setStories(st.data);
        // Extract user objects from MemberStatsRead response
        const users = m.data.map(stat => stat.user);
        setMembers(users);
        const d = t.data;
        setForm({
          title: d.title, description: d.description || '',
          status: d.status, priority: d.priority,
          start_time: toDateTimeLocal(d.start_time), end_time: toDateTimeLocal(d.end_time),
          points: d.points, assigned_to_ids: d.assigned_to?.map(u => u.id) || [],
          story_id: d.story_id || '',
        });
      });
  }, [pk, taskId]);

  const toggleAssignee = (userId) => {
    setForm(f => {
      const ids = f.assigned_to_ids || [];
      if (ids.includes(userId)) {
        return { ...f, assigned_to_ids: ids.filter(id => id !== userId) };
      } else {
        return { ...f, assigned_to_ids: [...ids, userId] };
      }
    });
  };

  const submit = async e => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      const payload = { 
        ...form, 
        points: Number(form.points), 
        start_time: fromDateTimeLocal(form.start_time),
        end_time: fromDateTimeLocal(form.end_time),
      };
      await updateTask(pk, taskId, payload);
      navigate(`/projects/${pk}/tasks/${taskId}`);
    } catch (err) {
      setError(err.message || err.response?.data?.detail || 'Failed to update task');
      setSaving(false);
    }
  };

  if (!form) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;

  const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toISOString().slice(0, 16);
  };

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

          {/* Assignees Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assignees</label>
            <div className="border rounded-xl p-3 max-h-48 overflow-y-auto">
              {members.length === 0 ? (
                <p className="text-sm text-gray-500">No project members available</p>
              ) : (
                <div className="space-y-2">
                  {members.map(member => (
                    <label key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.assigned_to_ids?.includes(member.id) || false}
                        onChange={() => toggleAssignee(member.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div className="flex items-center gap-2">
                        {member.avatar ? (
                          <img src={member.avatar.startsWith('http') ? member.avatar : `${window.location.protocol}//${window.location.hostname}:8001${member.avatar}`}
                            alt={member.username} className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium">
                            {member.username?.[0]?.toUpperCase() || '?'}
                          </div>
                        )}
                        <span className="text-sm text-gray-800">{member.first_name || member.username} {member.last_name || ''}</span>
                        {member.role && <span className="text-xs text-gray-400">({member.role})</span>}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {form.assigned_to_ids?.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">{form.assigned_to_ids.length} member(s) selected</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">User Story</label>
              <select value={form.story_id} onChange={e => setForm(f => ({ ...f, story_id: e.target.value }))}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                <option value="">Standalone (No Story)</option>
                {stories.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
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
