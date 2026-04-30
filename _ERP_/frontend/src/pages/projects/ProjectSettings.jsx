import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getProject, getProjectStatuses, createProjectStatus, deleteProjectStatus, getProjectConfig, updateProjectConfig, updateProjectStatusOrder } from '../../api';
import Spinner from '../../components/shared/ui/Spinner';
import Guard from '../../auth/Guard';

const COLOR_OPTS = ['#e74c3c','#f39c12','#3498db','#2ecc71','#9b59b6','#1abc9c','#e67e22','#34495e'];
const ESSENTIAL_SLUGS = ['todo', 'done'];
const TODO_ORDER = -1000;  // Fixed order for todo (always first)
const DONE_ORDER = 1000;   // Fixed order for done (always last)

export default function ProjectSettings() {
  const { pk } = useParams();
  const [project, setProject] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [newStatus, setNewStatus] = useState({ name:'', slug:'', order: 0, color:'#3498db' });

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
    if (ESSENTIAL_SLUGS.includes(newStatus.slug.trim().toLowerCase())) {
      setMsg('Cannot use an essential slug (todo, done) for a new column.');
      return;
    }
    const slug = newStatus.slug.trim().toLowerCase();
    // Prevent duplicate slugs
    if (statuses.some(s => s.slug === slug)) {
      setMsg('Slug already exists');
      return;
    }
    // Calculate order: max movable order + 1
    const movableStatuses = statuses.filter(s => !ESSENTIAL_SLUGS.includes(s.slug));
    const maxOrder = movableStatuses.length > 0 
      ? Math.max(...movableStatuses.map(s => s.order)) 
      : 0;
    
    const statusToCreate = { ...newStatus, order: maxOrder + 1 };
    const res = await createProjectStatus(pk, statusToCreate);
    setStatuses(prev => {
      const updated = [...prev, res.data];
      // Re-sort by order
      return updated.sort((a, b) => {
        if (a.slug === 'todo') return -1;
        if (b.slug === 'todo') return 1;
        if (a.slug === 'done') return 1;
        if (b.slug === 'done') return -1;
        return a.order - b.order;
      });
    });
    setNewStatus({ name:'', slug:'', order: 0, color:'#3498db' });
    setMsg('Column added.');
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    
    const { source, destination } = result;
    if (source.index === destination.index) return;

    // Keep todo and done fixed with special order values
    const movableStatuses = statuses.filter(s => !ESSENTIAL_SLUGS.includes(s.slug));
    const todoStatus = statuses.find(s => s.slug === 'todo');
    const doneStatus = statuses.find(s => s.slug === 'done');

    // Adjust indices for movable items only (skip todo at index 0)
    const adjustedSourceIndex = source.index - 1;
    const adjustedDestIndex = destination.index - 1;

    // Don't allow dragging essential items
    if (source.index === 0 || source.index === statuses.length - 1) {
      setMsg('Cannot move essential columns (todo, done).');
      return;
    }

    // Prevent dragging outside valid range
    if (adjustedDestIndex < 0 || adjustedDestIndex >= movableStatuses.length) {
      setMsg('Invalid drop position.');
      return;
    }

    // Reorder movable items
    const newMovableStatuses = Array.from(movableStatuses);
    const [reordered] = newMovableStatuses.splice(adjustedSourceIndex, 1);
    newMovableStatuses.splice(adjustedDestIndex, 0, reordered);

    // Assign new orders to movable items (1-based, leaving room for todo=-1000, done=1000)
    const updatedMovable = newMovableStatuses.map((s, i) => ({ ...s, order: i + 1 }));

    // Rebuild full list with todo first, done last
    const newStatuses = [
      ...(todoStatus ? [{ ...todoStatus, order: TODO_ORDER }] : []),
      ...updatedMovable,
      ...(doneStatus ? [{ ...doneStatus, order: DONE_ORDER }] : [])
    ];

    setStatuses(newStatuses);

    // Update order on backend
    const orderUpdate = { statuses: newStatuses.map(s => ({ id: s.id, order: s.order })) };
    try {
      await updateProjectStatusOrder(pk, orderUpdate);
      setMsg('Column order updated.');
    } catch (err) {
      // Extract error message from various response formats
      let errorMsg = 'Failed to update order';
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data.detail) {
          errorMsg = typeof data.detail === 'string' ? data.detail : 'Validation error';
        } else if (Array.isArray(data)) {
          // FastAPI validation errors
          errorMsg = data.map(e => e.msg).join(', ').slice(0, 100);
        }
      }
      setMsg(errorMsg);
      // Revert on error
      setStatuses(statuses);
    }
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to={`/projects/${pk}`} className="hover:text-blue-600">&larr; {project?.name}</Link>
        <span>/</span><span className="text-gray-700 font-medium">Settings</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Project Settings</h1>
      {msg && <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 mb-4 text-sm">{msg}</div>}
      
      <Guard isProjectManager project={project}>
        {config && (
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
      </Guard>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Kanban Columns</h2>
        <Guard isProjectManager project={project}>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="columns">
              {(provided) => (
                <div 
                  {...provided.droppableProps} 
                  ref={provided.innerRef}
                  className="space-y-2 mb-6"
                >
                  {statuses.map((s, index) => (
                    <Draggable 
                      key={s.id} 
                      draggableId={String(s.id)} 
                      index={index}
                      isDragDisabled={ESSENTIAL_SLUGS.includes(s.slug)}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`flex items-center justify-between border rounded-xl px-4 py-3 transition-all ${
                            snapshot.isDragging 
                              ? 'shadow-lg scale-105 bg-blue-50 border-blue-300' 
                              : 'hover:shadow-md'
                          } ${ESSENTIAL_SLUGS.includes(s.slug) ? 'opacity-75 cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'}`}
                          style={{ ...provided.draggableProps.style }}
                        >
                          <div className="flex items-center gap-3">
                            {!ESSENTIAL_SLUGS.includes(s.slug) && (
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                              </svg>
                            )}
                            <span className="w-4 h-4 rounded-full" style={{background: s.color}} />
                            <span className="font-medium text-sm">{s.name}</span>
                            <span className="text-xs text-gray-400">{s.slug}{!ESSENTIAL_SLUGS.includes(s.slug) && ` · order ${s.order}`}</span>
                            {ESSENTIAL_SLUGS.includes(s.slug) && (
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">Fixed</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Guard isProjectManager project={project}>
                              {statuses.length > 1 && !ESSENTIAL_SLUGS.includes(s.slug) && (
                                <button onClick={() => removeStatus(s.id)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded border border-red-200">Remove</button>
                              )}
                            </Guard>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </Guard>
        
        <Guard isProjectManager project={project}>
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
        </Guard>
      </div>
    </div>
  );
}
