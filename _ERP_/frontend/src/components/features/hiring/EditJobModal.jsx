import { useEffect, useState } from 'react';
import Spinner from '../../shared/ui/Spinner';
import { getJob, updateJob } from '../../../api';
import JobForm from './JobForm';
import Modal from '../../shared/ui/Modal';

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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Job Posting"
      size="lg"
    >
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
        />
      ) : (
        <div className="p-6 text-center text-red-600">Failed to load job data.</div>
      )}
    </Modal>
  );
}
