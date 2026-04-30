import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProject, getProjectMembers, searchProjectMembers, addProjectMember, removeProjectMember, listDepartments } from '../../api';
import Spinner from '../../components/shared/ui/Spinner';
import Guard from '../../auth/Guard';

function MemberCard({ member, project, onRemove, onTransfer }) {
  const u = member.user;
  const isOwner = project.manager?.id === u.id;
  const canBeOwner = u.role === 'project_manager' || u.role === 'admin';
  const initials = [u.first_name, u.last_name].filter(Boolean).map(n => n[0]).join('').toUpperCase()
    || u.username[0].toUpperCase();
  return (
    <div className={`bg-white rounded-xl shadow-sm border p-5 ${isOwner ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-semibold text-sm ${isOwner ? 'bg-blue-600' : 'bg-blue-500'}`}>
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900 text-sm">{u.first_name} {u.last_name}</p>
              {isOwner && (
                <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Owner</span>
              )}
            </div>
            <p className="text-xs text-gray-400">{u.username} · {u.role?.replace(/_/g, ' ')}</p>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Guard isProjectManager project={project}>
            {!isOwner && (
              <button onClick={() => onRemove(u.id)}
                className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded border border-red-200 hover:border-red-400 transition-colors">
                Remove
              </button>
            )}
          </Guard>
          <Guard isProjectManager project={project}>
            {!isOwner && canBeOwner && (
              <button onClick={() => onTransfer(u.id)}
                className="text-blue-500 hover:text-blue-700 text-xs px-2 py-1 rounded border border-blue-200 hover:border-blue-400 transition-colors">
                Set as Owner
              </button>
            )}
          </Guard>
        </div>
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
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [searchQ, setSearchQ] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [departments, setDepartments] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(() => {
    Promise.all([getProject(pk), getProjectMembers(pk), listDepartments()])
      .then(([p, m, d]) => { 
        setProject(p.data); 
        setMembers(m.data); 
        setDepartments(d.data);
      })
      .finally(() => setLoading(false));
  }, [pk]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const loadMembers = useCallback(() => {
    getProjectMembers(pk).then(r => setMembers(r.data));
  }, [pk]);

  useEffect(() => {
    if (searchQ.length < 1 && !departmentFilter) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      searchProjectMembers(pk, searchQ, departmentFilter || undefined).then(r => setSearchResults(r.data));
    }, 300);
    return () => clearTimeout(t);
  }, [searchQ, departmentFilter, pk]);

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

  const transferOwnership = async userId => {
    if (!window.confirm('Transfer project ownership to this member? You will no longer be the primary owner.')) return;
    try {
      await updateProject(pk, { manager_id: userId });
      loadAll();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to transfer ownership');
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to={`/projects/${pk}`} className="hover:text-blue-600">← {project?.name}</Link>
        <span>/</span><span className="text-gray-700 font-medium">Members</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Team Members <span className="text-gray-400 text-lg font-normal">({members.length})</span>
      </h1>

      <Guard isProjectManager project={project}>
        <div className="bg-white rounded-2xl shadow p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Add Member</h2>
          <div className="flex flex-col md:flex-row gap-3">
            <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="Search by username or name…"
              className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            
            <select 
              value={departmentFilter} 
              onChange={e => setDepartmentFilter(e.target.value)}
              className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
            >
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {(searchResults.length > 0 || (searchQ.length >= 1 || departmentFilter)) && (
            <div className="mt-4 border rounded-xl divide-y shadow-sm max-h-60 overflow-y-auto">
              {searchResults.length > 0 ? (
                searchResults.map(u => (
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
                ))
              ) : (
                <div className="px-4 py-3 text-center text-sm text-gray-500">
                  {searchQ.length >= 1 || departmentFilter ? 'No users found' : 'Start typing to search…'}
                </div>
              )}
            </div>
          )}
        </div>
      </Guard>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map(m => (
          <MemberCard key={m.user.id} member={m} project={project} onRemove={removeMember} onTransfer={transferOwnership} />
        ))}
      </div>
    </div>
  );
}
