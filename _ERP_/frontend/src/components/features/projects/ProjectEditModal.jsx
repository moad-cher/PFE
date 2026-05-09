import { useState, useEffect } from 'react';
import { getProject, updateProject } from '../../../api';
import Spinner from '../../shared/ui/Spinner';
import Modal from '../../shared/ui/Modal';

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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
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

  const footer = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving || loading}
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
  );

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Edit Project"
      footer={footer}
      size="lg"
    >
      {loading ? (
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
        </form>
      )}
    </Modal>
  );
}
