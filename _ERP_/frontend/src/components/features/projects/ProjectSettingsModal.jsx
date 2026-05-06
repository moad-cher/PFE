import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  getProject,
  getProjectStatuses,
  createProjectStatus,
  deleteProjectStatus,
  getProjectConfig,
  updateProjectConfig,
  updateProjectStatusOrder,
} from '../../../api';
import Spinner from '../../shared/ui/Spinner';
import Guard from '../../../auth/Guard';

const COLOR_OPTS = ['#e74c3c','#f39c12','#3498db','#2ecc71','#9b59b6','#1abc9c','#e67e22','#34495e'];
const ESSENTIAL_SLUGS = ['todo', 'done'];
const TODO_ORDER = -1000;
const DONE_ORDER = 1000;

const getMovableStatuses = (list) => (
  list
    .filter((s) => !ESSENTIAL_SLUGS.includes(s.slug))
    .slice()
    .sort((a, b) => a.order - b.order)
);

export default function ProjectSettingsModal({ isOpen, onClose, pk, onSuccess }) {
  const [project, setProject] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [newStatus, setNewStatus] = useState({ name:'', slug:'', order: 0, color:'#3498db' });

  useEffect(() => {
    if (!isOpen || !pk) return;
    setLoading(true);
    Promise.all([getProject(pk), getProjectStatuses(pk), getProjectConfig(pk)])
      .then(([p, s, c]) => {
        setProject(p.data);
        setStatuses(s.data);
        setConfig(c.data);
      })
      .finally(() => setLoading(false));
  }, [pk, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const saveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProjectConfig(pk, {
        points_on_time: Number(config.points_on_time),
        points_late: Number(config.points_late),
        notify_deadline_days: Number(config.notify_deadline_days),
        sprint_duration_days: Number(config.sprint_duration_days),
      });
      setMsg('Settings saved.');
      if (onSuccess) onSuccess();
    } finally {
      setSaving(false);
    }
  };

  const addStatus = async (e) => {
    e.preventDefault();
    if (ESSENTIAL_SLUGS.includes(newStatus.slug.trim().toLowerCase())) {
      setMsg('Cannot use an essential slug (todo, done) for a new column.');
      return;
    }
    const slug = newStatus.slug.trim().toLowerCase();
    if (statuses.some((s) => s.slug === slug)) {
      setMsg('Slug already exists');
      return;
    }

    const movableStatuses = statuses.filter((s) => !ESSENTIAL_SLUGS.includes(s.slug));
    const maxOrder = movableStatuses.length > 0
      ? Math.max(...movableStatuses.map((s) => s.order))
      : 0;

    const statusToCreate = { ...newStatus, order: maxOrder + 1 };
    const res = await createProjectStatus(pk, statusToCreate);
    setStatuses((prev) => [...prev, res.data]);
    setNewStatus({ name:'', slug:'', order: 0, color:'#3498db' });
    setMsg('Column added.');
    if (onSuccess) onSuccess();
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const { source, destination } = result;
    if (source.index === destination.index) return;

    const movableStatuses = getMovableStatuses(statuses);
    const todoStatus = statuses.find((s) => s.slug === 'todo');
    const doneStatus = statuses.find((s) => s.slug === 'done');

    const newMovableStatuses = Array.from(movableStatuses);
    const [reordered] = newMovableStatuses.splice(source.index, 1);
    newMovableStatuses.splice(destination.index, 0, reordered);

    const updatedMovable = newMovableStatuses.map((s, i) => ({ ...s, order: i + 1 }));

    const newStatuses = [
      ...(todoStatus ? [{ ...todoStatus, order: TODO_ORDER }] : []),
      ...updatedMovable,
      ...(doneStatus ? [{ ...doneStatus, order: DONE_ORDER }] : []),
    ];

    setStatuses(newStatuses);

    const orderUpdate = { statuses: newStatuses.map((s) => ({ id: s.id, order: s.order })) };
    try {
      await updateProjectStatusOrder(pk, orderUpdate);
      setMsg('Column order updated.');
    } catch (err) {
      let errorMsg = 'Failed to update order';
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data.detail) {
          errorMsg = typeof data.detail === 'string' ? data.detail : 'Validation error';
        } else if (Array.isArray(data)) {
          errorMsg = data.map((e) => e.msg).join(', ').slice(0, 100);
        }
      }
      setMsg(errorMsg);
      setStatuses(statuses);
    }
  };

  const removeStatus = async (id) => {
    try {
      await deleteProjectStatus(pk, id);
      setStatuses((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      alert(err.response?.data?.detail || 'Cannot delete this column');
    }
  };

  if (!isOpen) return null;

  const modalBody = loading ? (
    <div className="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  ) : (
    <div className="space-y-6">
      {msg && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl p-3 text-sm">
          {msg}
        </div>
      )}

      <Guard isProjectManager project={project}>
        {config && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Project Parameters</h2>
            <form onSubmit={saveConfig} className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[['points_on_time','On-time pts'],['points_late','Late pts'],['notify_deadline_days','Notify N days before'],['sprint_duration_days', 'Sprint Duration (days)']].map(([k,l]) => (
                  <div key={k}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{l}</label>
                    <input
                      type="number"
                      min="0"
                      value={config[k]}
                      onChange={(e) => setConfig((c) => ({ ...c, [k]: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                ))}
              </div>
              <button
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </form>
          </div>
        )}
      </Guard>

      <div className="bg-white rounded-2xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Kanban Columns</h2>
        <div className="space-y-2 mb-6">
          {(() => {
            const s = statuses.find((status) => status.slug === 'todo');
            if (!s) return null;
            return (
              <div key={s.id} className="flex items-center justify-between border rounded-xl px-4 py-3 bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full" style={{ background: s.color }} />
                  <span className="font-medium text-sm">{s.name}</span>
                  <span className="text-xs text-gray-400">{s.slug}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">Fixed</span>
                </div>
              </div>
            );
          })()}
        </div>
        <Guard isProjectManager project={project}>
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="columns">
              {(provided) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className="space-y-2 mb-6"
                >
                  {getMovableStatuses(statuses).map((s, index) => (
                    <Draggable
                      key={s.id}
                      draggableId={String(s.id)}
                      index={index}
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`flex items-center justify-between border rounded-xl px-4 py-3 transition-all ${
                            snapshot.isDragging
                              ? 'shadow-lg bg-blue-50 border-blue-300'
                              : 'hover:shadow-md'
                          } cursor-grab active:cursor-grabbing`}
                          style={{ ...provided.draggableProps.style }}
                        >
                          <div className="flex items-center gap-3">
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                            <span className="w-4 h-4 rounded-full" style={{ background: s.color }} />
                            <span className="font-medium text-sm">{s.name}</span>
                            <span className="text-xs text-gray-400">{s.slug} · order {s.order}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Guard isProjectManager project={project}>
                              {statuses.length > 1 && (
                                <button
                                  onClick={() => removeStatus(s.id)}
                                  className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded border border-red-200"
                                >
                                  Remove
                                </button>
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
        <div className="space-y-2 mb-6">
          {(() => {
            const s = statuses.find((status) => status.slug === 'done');
            if (!s) return null;
            return (
              <div key={s.id} className="flex items-center justify-between border rounded-xl px-4 py-3 bg-gray-50">
                <div className="flex items-center gap-3">
                  <span className="w-4 h-4 rounded-full" style={{ background: s.color }} />
                  <span className="font-medium text-sm">{s.name}</span>
                  <span className="text-xs text-gray-400">{s.slug}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded ml-2">Fixed</span>
                </div>
              </div>
            );
          })()}
        </div>

        <Guard isProjectManager project={project}>
          <form onSubmit={addStatus} className="border-t pt-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Add Column</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Name</label>
                <input
                  value={newStatus.name}
                  onChange={(e) => setNewStatus((s) => ({ ...s, name: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Slug</label>
                <input
                  value={newStatus.slug}
                  onChange={(e) => setNewStatus((s) => ({ ...s, slug: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Color</label>
                <div className="flex gap-1 flex-wrap">
                  {COLOR_OPTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewStatus((s) => ({ ...s, color: c }))}
                      className={`w-6 h-6 rounded-full border-2 ${newStatus.color === c ? 'border-gray-800' : 'border-transparent'}`}
                      style={{ background: c }}
                      title={c}
                    />
                  ))}
                </div>
              </div>
            </div>
            <button className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-black">Add Column</button>
          </form>
        </Guard>
      </div>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 backdrop-blur-sm px-4 py-8"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-4xl my-auto mt-10 relative border border-gray-100 max-h-[calc(100vh-80px)] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md flex items-center justify-between p-6 border-b border-gray-100 rounded-t-[32px]">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Project Settings</h1>
            {project && (
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{project.name}</p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-8">
          {modalBody}
        </div>
      </div>
    </div>
  );
}
