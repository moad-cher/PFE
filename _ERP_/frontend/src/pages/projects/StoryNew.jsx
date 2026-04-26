import { useState } from 'react';
import { createStory } from '../../api';

export default function StoryNew({ isOpen, onClose, pk, initialSprintId, onSuccess }) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    points: 0,
    sprint_id: initialSprintId || null,
  });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createStory(pk, { ...form, sprint_id: form.sprint_id || null });
      onSuccess();
      onClose();
      setForm({ title: '', description: '', points: 0, sprint_id: initialSprintId || null });
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create story');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 border border-white/20">
        <h3 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">New User Story</h3>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Title</label>
            <input 
              required 
              type="text" 
              value={form.title} 
              onChange={e => setForm({...form, title: e.target.value})}
              className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-indigo-500" 
              placeholder="As a user, I want to..." 
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Description</label>
            <textarea 
              rows="3" 
              value={form.description} 
              onChange={e => setForm({...form, description: e.target.value})}
              className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-indigo-500" 
              placeholder="Acceptance criteria..." 
            />
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Story Points</label>
            <input 
              type="number" 
              value={form.points} 
              onChange={e => setForm({...form, points: parseInt(e.target.value) || 0})}
              className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-indigo-500" 
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">Cancel</button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-8 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Story'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
