import { useState, useEffect } from 'react';
import { getProject, updateProject } from '../../../api';
import Spinner from '../../shared/ui/Spinner';

export default function ProjectEditModal({ isOpen, onClose, pk, onSuccess }) {
  const [form, setForm] = useState({ name: '', description: '', status: 'active' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getProject(pk)
      .then((res) => {
        const p = res.data;
        setForm({
          name: p.name || '',
          description: p.description || '',
          status: p.status || 'active',
        });
      })
      .catch(() => setError('Failed to load project'))
      .finally(() => setLoading(false));
  }, [pk, isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Project name is required');
      return;
    }
    setSaving(true);
    try {
      await updateProject(pk, form);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update project');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const content = loading ? (
    <div className="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Project name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={4}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
        <select
          name="status"
          value={form.status}
          onChange={handleChange}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center gap-2"
        >
          {saving && <Spinner size="sm" className="border-white border-t-transparent" />}
          Save Changes
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 backdrop-blur-sm px-4 py-8 overflow-y-auto"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl my-auto mt-10 relative border border-gray-100"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md flex items-center justify-between p-6 border-b border-gray-100 rounded-t-[32px]">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Edit Project</h1>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-8">
          {content}
        </div>
      </div>
    </div>
  );
}
