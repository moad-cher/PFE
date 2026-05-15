import { useState } from 'react';
import { scheduleInterview } from '../../../api';
import Modal from '../../shared/ui/Modal';

export default function InterviewScheduleModal({ isOpen, onClose, applicationId, candidateName, onSuccess }) {
  const [form, setForm] = useState({ scheduled_at: '', location: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async e => {
    e?.preventDefault(); 
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

  const footer = (
    <div className="flex gap-4">
      <button type="button" onClick={onClose} className="flex-1 py-3.5 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
        Cancel
      </button>
      <button type="button" onClick={submit} disabled={saving}
        className="flex-[2] py-3.5 bg-purple-600 text-white rounded-2xl text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-all shadow-lg shadow-purple-100">
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
  );

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Schedule Interview"
      description={`Candidate: ${candidateName}`}
      footer={footer}
      size="md"
    >
      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 mb-6 text-sm flex items-center gap-3">
         <span className="text-lg">⚠️</span> {error}
      </div>}
      
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Date & Time *</label>
          <input type="datetime-local" value={form.scheduled_at}
            onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} required
            className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-purple-500 transition-all shadow-inner" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Location / Link</label>
          <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            placeholder="Office, Google Meet, Zoom..."
            className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-purple-500 transition-all shadow-inner" />
        </div>
        <div>
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Internal Notes</label>
          <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
            placeholder="What should the interviewers know?"
            className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3.5 text-sm focus:ring-2 focus:ring-purple-500 transition-all shadow-inner" />
        </div>
      </form>
    </Modal>
  );
}
