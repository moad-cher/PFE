import { createJob } from '../../../api';
import { useNavigate } from 'react-router-dom';
import JobForm from './JobForm';
import Modal from '../../shared/ui/Modal';

const initialForm = { title: '', description: '', required_skills: '', contract_type: 'cdi', location: '', status: 'draft' };

export default function CreateJobModal({ open, onClose }) {
  const navigate = useNavigate();

  const handleSubmit = async (form) => {
    return await createJob(form);
  };

  const handleSuccess = (res) => {
    onClose();
    navigate(`/hiring/jobs/${res.data.id}`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Job Posting"
      description="Post a new job opportunity"
      size="lg"
    >
      <JobForm initial={initialForm} onSubmit={handleSubmit} onSuccess={handleSuccess} onCancel={onClose} submitLabel="Create Job" />
    </Modal>
  );
}
