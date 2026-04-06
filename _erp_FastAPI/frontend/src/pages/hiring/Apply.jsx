import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getJob, applyToJob } from '../../api';
import Spinner from '../../components/Spinner';

export default function Apply() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', cover_letter: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getJob(id).then(r => setJob(r.data)).catch(() => setError('Job not found or no longer available.'));
  }, [id]);

  const submit = async e => {
    e.preventDefault();
    if (!file) { setError('Please attach your resume.'); return; }
    
    console.log('Submitting application...');
    console.log('File:', file);
    console.log('Form data:', form);
    
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('resume', file);
      
      console.log('FormData contents:');
      for (let [key, value] of fd.entries()) {
        console.log(key, ':', value);
      }
      
      const response = await applyToJob(id, fd);
      console.log('Application submitted successfully:', response.data);
      navigate('/hiring/apply-success');
    } catch (err) {
      console.error('Application submission error:', err);
      console.error('Error response:', err.response);
      setError(err.response?.data?.detail || 'Submission failed. Please try again.');
      setSaving(false);
    }
  };

  if (!job && !error) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 flex items-start justify-center py-12 px-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow p-8">
        {job && (
          <div className="mb-6 pb-6 border-b">
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            <p className="text-gray-500 text-sm mt-1">{job.contract_type}{job.location ? ` · ${job.location}` : ''}</p>
          </div>
        )}
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Submit Your Application</h2>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} required
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} required
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cover Letter</label>
            <textarea value={form.cover_letter} onChange={e => setForm(f => ({ ...f, cover_letter: e.target.value }))} rows={5}
              placeholder="Tell us about yourself and why you're a great fit…"
              className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resume / CV *</label>
            <input type="file" accept=".pdf,.docx,.doc,.txt" required
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="w-full border rounded-xl px-3 py-2 text-sm file:mr-3 file:bg-blue-50 file:text-blue-700 file:border-0 file:rounded-lg file:px-3 file:py-1 file:text-xs file:cursor-pointer" />
            <p className="text-xs text-gray-400 mt-1">PDF, DOCX, DOC or TXT — max 10 MB</p>
          </div>
          <button type="submit" disabled={saving}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
            {saving ? 'Submitting…' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
