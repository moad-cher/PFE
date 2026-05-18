import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createProject } from '../../../api';
import Spinner from '../../shared/ui/Spinner';
import Modal from '../../shared/ui/Modal';

export default function ProjectNewModal({ isOpen, onClose, onSuccess }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    description: '',
    status: 'active',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    setLoading(true);
    try {
      const res = await createProject(form);
      if (onSuccess) {
        onSuccess(res.data);
      } else {
        navigate(`/projects/${res.data.id}`);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  const footer = (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        className="px-6 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-60 transition-colors flex items-center gap-2"
      >
        {loading && <Spinner size="sm" className="border-white border-t-transparent" />}
        Create Project
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
      title="New Project"
      footer={footer}
      size="lg"
    >
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
            placeholder="e.g. Website Redesign"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Description
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            placeholder="Brief description of the project..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}
