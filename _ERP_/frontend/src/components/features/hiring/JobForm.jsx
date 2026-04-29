import { useEffect, useState } from 'react';
import Spinner from '../../shared/ui/Spinner';

const defaultInitial = { title: '', description: '', required_skills: '', contract_type: 'cdi', location: '', status: 'draft' };

export default function JobForm({ initial = defaultInitial, onSubmit, onSuccess, onCancel, submitLabel = 'Save', title }) {
  const [form, setForm] = useState(initial);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setForm(initial || defaultInitial);
    setError('');
    setSubmitting(false);
  }, [initial]);

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const res = await onSubmit(form);
      if (onSuccess) onSuccess(res);
    } catch (err) {
      let errorMessage = 'Failed to save job';
      if (err?.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail.map((e) => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join(', ');
        } else {
          errorMessage = err.response.data.detail;
        }
      }
      setError(errorMessage);
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-8">
      {title && <h1 className="text-xl font-bold text-gray-900 mb-6">{title}</h1>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input name="title" value={form.title} onChange={handleChange} required
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea name="description" value={form.description} onChange={handleChange} rows={5}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Required Skills (comma-separated)</label>
          <input name="required_skills" value={form.required_skills} onChange={handleChange}
            placeholder="e.g. Python, React, SQL"
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contract</label>
            <select name="contract_type" value={form.contract_type} onChange={handleChange}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="cdi">CDI</option>
              <option value="cdd">CDD</option>
              <option value="stage">Stage</option>
              <option value="freelance">Freelance</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <input name="location" value={form.location} onChange={handleChange}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select name="status" value={form.status} onChange={handleChange}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
              {['draft', 'published', 'paused', 'closed'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting}
            className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            {submitting ? (<><Spinner size="sm" className="border-white border-t-transparent" /> {submitLabel || 'Saving…'}</>) : (submitLabel || 'Save')}
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200">
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
