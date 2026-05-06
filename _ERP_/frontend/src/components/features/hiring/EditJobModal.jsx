import { useEffect, useState } from 'react';
import Spinner from '../../shared/ui/Spinner';
import { getJob, updateJob } from '../../../api';
import JobForm from './JobForm';

export default function EditJobModal({ open, onClose, jobId, onSaved }) {
  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoading(true);
    getJob(jobId)
      .then((r) => {
        if (!mounted) return;
        const d = r.data;
        setInitial({
          title: d.title || '',
          description: d.description || '',
          required_skills: d.required_skills || '',
          contract_type: d.contract_type || 'CDI',
          location: d.location || '',
          status: d.status || 'draft',
        });
      })
      .catch(() => {
        if (mounted) setInitial(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [open, jobId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose} role="presentation">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-purple-100/50" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="edit-job-title">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
        ) : initial ? (
          <JobForm
            initial={initial}
            onSubmit={(form) => updateJob(jobId, form)}
            onSuccess={(res) => {
              if (onSaved) onSaved(res.data);
              onClose();
            }}
            onCancel={onClose}
            submitLabel="Save Changes"
            title="Edit Job Posting"
          />
        ) : (
          <div className="p-6 text-center text-red-600">Failed to load job data.</div>
        )}
      </div>
    </div>
  );
}
