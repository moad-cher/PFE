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
