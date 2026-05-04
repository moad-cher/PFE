import { useState } from 'react';
import { scheduleInterview } from '../../api';

export default function InterviewScheduleModal({ isOpen, onClose, applicationId, candidateName, onSuccess }) {
  const [form, setForm] = useState({ scheduled_at: '', location: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const submit = async e => {
    e.preventDefault(); 
    setSaving(true); 
    setError('');
    try {
      await scheduleInterview(applicationId, { ...form, scheduled_at: new Date(form.scheduled_at).toISOString() });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to schedule interview');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose} role="presentation">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-center justify-between border-b px-8 py-5 bg-gray-50/50">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Schedule Interview</h3>
            <p className="text-xs text-gray-500 mt-0.5">Candidate: {candidateName}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-8">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6 text-sm flex items-center gap-3">
             <span className="text-lg">⚠️</span> {error}
          </div>}
          
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Date & Time *</label>
              <input type="datetime-local" value={form.scheduled_at}
                onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} required
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500 transition-all shadow-inner" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Location / Link</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Office, Google Meet, Zoom..."
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500 transition-all shadow-inner" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Internal Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                placeholder="What should the interviewers know?"
                className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-blue-500 transition-all shadow-inner" />
            </div>
            
            <div className="flex gap-4 pt-4">
              <button type="button" onClick={onClose} className="flex-1 py-3.5 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-[2] py-3.5 bg-blue-600 text-white rounded-2xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg shadow-blue-100">
                {saving ? (
                  <div className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Scheduling...
                  </div>
                ) : 'Schedule Interview'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
