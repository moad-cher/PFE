import { useState } from 'react';
import { applyToJob } from '../../../api';
import Spinner from '../../shared/ui/Spinner';
import Modal from '../../shared/ui/Modal';

export default function ApplyModal({ open, onClose, jobId, jobTitle }) {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', cover_letter: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submit = async e => {
    e?.preventDefault();
    if (!file) { setError('Please attach your resume.'); return; }
    
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('resume', file);
      
      await applyToJob(jobId, fd);
      setSubmitted(true);
    } catch (err) {
      console.error('Application submission error:', err);
      setError(err.response?.data?.detail || 'Submission failed. Please try again.');
      setSaving(false);
    }
  };

  const footer = submitted ? (
    <div className="flex justify-center">
      <button onClick={onClose} className="px-6 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700">
        Close
      </button>
    </div>
  ) : (
    <div className="flex gap-3">
      <button type="button" onClick={onClose} className="flex-1 py-3 border rounded-xl font-medium hover:bg-gray-50 transition-colors">
        Cancel
      </button>
      <button type="button" onClick={submit} disabled={saving}
        className="flex-[2] py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
        {saving ? 'Submitting…' : 'Submit Application'}
      </button>
    </div>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Apply for ${jobTitle}`}
      description={!submitted ? "Please fill in your details below." : undefined}
      footer={footer}
      size="lg"
    >
      {submitted ? (
        <div className="text-center py-8">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h1>
          <p className="text-gray-500">
            Thank you for applying. Our team will review your application and get back to you soon.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cover Letter</label>
            <textarea value={form.cover_letter} onChange={e => setForm(f => ({ ...f, cover_letter: e.target.value }))} rows={4}
              placeholder="Tell us about yourself..."
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resume / CV *</label>
            <input type="file" accept=".pdf,.docx,.doc,.txt" required
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full border rounded-xl px-3 py-2 text-sm file:mr-3 file:bg-purple-50 file:text-purple-700 file:border-0 file:rounded-lg file:px-3 file:py-1 file:text-xs file:cursor-pointer" />
            <p className="text-xs text-gray-400 mt-1">PDF, DOCX, DOC or TXT — max 10 MB</p>
          </div>
        </form>
      )}
    </Modal>
  );
}
