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
