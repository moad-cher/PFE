import { useState, useEffect, useMemo } from 'react';
import { updateSprint, deleteSprint } from '../../../api';
import Modal from '../../shared/ui/Modal';

export default function SprintEditModal({ isOpen, onClose, pk, sprint, project, sprints, onSuccess }) {
  const [form, setForm] = useState({
    name: '',
    goal: '',
    start_date: '',
    end_date: '',
    retrospective: '',
  });
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (sprint) {
      setForm({
        name: sprint.name || '',
        goal: sprint.goal || '',
        start_date: sprint.start_date || '',
        end_date: sprint.end_date || '',
        retrospective: sprint.retrospective || '',
      });
    }
  }, [sprint]);

  const limits = useMemo(() => {
    if (!sprint || !sprints) return { startMin: '', startMax: '', endMin: '', endMax: '' };
    
    const sorted = [...sprints].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
    const idx = sorted.findIndex(s => s.id === sprint.id);
    
    const prev = idx > 0 ? sorted[idx - 1] : null;
    const next = idx < sorted.length - 1 ? sorted[idx + 1] : null;

    return {
      startMin: prev ? prev.end_date : (project?.start_date || ''),
      startMax: form.end_date || (next ? next.start_date : (project?.deadline || '')),
      endMin: form.start_date || '',
      endMax: next ? next.start_date : (project?.deadline || '')
    };
  }, [sprint, sprints, project, form.start_date, form.end_date]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      await updateSprint(pk, sprint.id, form);
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update sprint');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this sprint? All stories in this sprint will be moved back to the backlog.')) {
      return;
    }
    setDeleting(true);
    try {
      await deleteSprint(pk, sprint.id);
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete sprint');
    } finally {
      setDeleting(false);
    }
  };

  const footer = (
    <div className="flex justify-between w-full">
      <button 
        type="button" 
        onClick={handleDelete}
        disabled={deleting || loading}
        className="px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50"
      >
        {deleting ? 'Deleting...' : 'Delete Sprint'}
      </button>
      <div className="flex gap-3">
        <button type="button" onClick={onClose} className="px-6 py-2 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">Cancel</button>
        <button 
          type="button" 
          onClick={handleSubmit}
          disabled={loading || deleting}
          className="px-8 py-2 bg-purple-600 text-white text-sm font-bold rounded-xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`Edit ${sprint?.name || 'Sprint'}`}
      footer={footer}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Sprint Name</label>
          <input 
            required 
            type="text" 
            value={form.name} 
            onChange={e => setForm({...form, name: e.target.value})}
            className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-purple-500" 
            placeholder="Sprint Name" 
          />
        </div>
        <div>
          <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Goal</label>
          <textarea 
            rows="3" 
            value={form.goal} 
            onChange={e => setForm({...form, goal: e.target.value})}
            className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-purple-500" 
            placeholder="What do we want to achieve?" 
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Start Date</label>
            <input 
              required 
              type="date" 
              value={form.start_date} 
              min={limits.startMin}
              max={limits.startMax}
              onChange={e => setForm({...form, start_date: e.target.value})}
              className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-purple-500" 
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">End Date</label>
            <input 
              required 
              type="date" 
              value={form.end_date} 
              min={limits.endMin}
              max={limits.endMax}
              onChange={e => setForm({...form, end_date: e.target.value})}
              className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-purple-500" 
            />
          </div>
        </div>
        {sprint?.status === 'active' && (
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Retrospective</label>
            <textarea 
              rows="4" 
              value={form.retrospective} 
              onChange={e => setForm({...form, retrospective: e.target.value})}
              className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-purple-500" 
              placeholder="What went well? What could be improved?" 
            />
          </div>
        )}
      </form>
    </Modal>
  );
}
