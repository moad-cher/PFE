import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getProject, getProjectStatuses, createProjectStatus, deleteProjectStatus, getProjectConfig, updateProjectConfig } from '../../api';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';

const COLOR_OPTS = ['#e74c3c','#f39c12','#3498db','#2ecc71','#9b59b6','#1abc9c','#e67e22','#34495e'];

export default function ProjectSettings() {
  const { pk } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [newStatus, setNewStatus] = useState({ name:'', slug:'', order:0, color:'#3498db' });

  useEffect(() => {
    Promise.all([getProject(pk), getProjectStatuses(pk), getProjectConfig(pk)])
      .then(([p, s, c]) => { setProject(p.data); setStatuses(s.data); setConfig(c.data); })
      .finally(() => setLoading(false));
  }, [pk]);

  const saveConfig = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await updateProjectConfig(pk, { 
        points_on_time: Number(config.points_on_time), 
        points_late: Number(config.points_late), 
        notify_deadline_days: Number(config.notify_deadline_days),
        sprint_duration_days: Number(config.sprint_duration_days)
      });
      setMsg('Settings saved.');
    } finally { setSaving(false); }
  };

  const addStatus = async (e) => {
    e.preventDefault();
    const essentialSlugs = ['todo', 'done'];
    if (essentialSlugs.includes(newStatus.slug.trim().toLowerCase())) {
      setMsg('Cannot use an essential slug (todo, done) for a new column.');
      return;
    }
    const res = await createProjectStatus(pk, newStatus);
    setStatuses(prev => [...prev, res.data]);
    setNewStatus({ name:'', slug:'', order: statuses.length, color:'#3498db' });
  };


  const removeStatus = async (id) => {
    if (!window.confirm('Delete this column? Tasks will move to the first column.')) return;
    try {
      await deleteProjectStatus(pk, id);
      setStatuses(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      alert(err.response?.data?.detail || 'Cannot delete this column');
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;
  const isManager = user?.role === 'admin' || user?.role === 'project_manager' || project?.manager?.id === user?.id;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to={`/projects/${pk}`} className="hover:text-blue-600">&larr; {project?.name}</Link>
        <span>/</span><span className="text-gray-700 font-medium">Settings</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Project Settings</h1>
      {msg && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 mb-4 text-sm">{msg}</div>}
      {config && isManager && (
        <div className="bg-white rounded-2xl shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Parameters</h2>
          <form onSubmit={saveConfig} className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[['points_on_time','On-time pts'],['points_late','Late pts'],['notify_deadline_days','Notify N days before'],['sprint_duration_days', 'Sprint Duration (days)']].map(([k,l]) => (
                <div key={k}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{l}</label>
                  <input type="number" min="0" value={config[k]} onChange={e => setConfig(c=>({...c,[k]:e.target.value}))}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
                </div>
              ))}
            </div>
            <button disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
          </form>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Kanban Columns</h2>
        <div className="space-y-2 mb-6">
          {statuses.map(s => (
            <div key={s.id} className="flex items-center justify-between border rounded-xl px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-4 h-4 rounded-full" style={{background: s.color}} />
                <span className="font-medium text-sm">{s.name}</span>
                <span className="text-xs text-gray-400">{s.slug} · order {s.order}</span>
              </div>
              {isManager && statuses.length > 1 && !['todo','done'].includes(s.slug) && (
                <button onClick={() => removeStatus(s.id)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded border border-red-200">Remove</button>
              )}
              {['todo','done'].includes(s.slug) && (
                <span className="text-xs text-gray-400 italic">
                  {/* Essential */}
                  </span>
              )}
            </div>
          ))}
        </div>
        {isManager && (
          <form onSubmit={addStatus} className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Add Column</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Name</label>
                <input value={newStatus.name} onChange={e=>setNewStatus(s=>({...s,name:e.target.value}))} required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Slug</label>
                <input value={newStatus.slug} onChange={e=>setNewStatus(s=>({...s,slug:e.target.value}))} required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap items-center">
              {COLOR_OPTS.map(c => (
                <button type="button" key={c} onClick={()=>setNewStatus(s=>({...s,color:c}))}
                  className={`w-7 h-7 rounded-full border-2 ${newStatus.color === c ? 'border-gray-800 scale-110' : 'border-transparent'} transition-all`}
                  style={{background:c}} />
              ))}
              <label 
                className="w-8 h-8 rounded-full cursor-pointer flex items-center justify-center hover:scale-110 transition-all overflow-hidden relative" 
                title="Pick custom color"
                style={{background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)'}}
              >
                <span className="w-7 h-7 rounded-full border-2 border-white shadow-sm" style={{background: newStatus.color}} />
                <input 
                  type="color" 
                  value={newStatus.color} 
                  onChange={e=>setNewStatus(s=>({...s,color:e.target.value}))}
                  className="absolute opacity-0 w-0 h-0"
                />
              </label>
            </div>
            <button className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">+ Add Column</button>
          </form>
        )}
      </div>
    </div>
  );
}
