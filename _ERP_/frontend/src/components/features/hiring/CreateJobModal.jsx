import { useEffect, useState } from 'react';
import Spinner from '../../ui/Spinner';
import { createJob } from '../../../api';
import { useNavigate } from 'react-router-dom';
import JobForm from './JobForm';

const initialForm = { title: '', description: '', required_skills: '', contract_type: 'cdi', location: '', status: 'draft' };

export default function CreateJobModal({ open, onClose }) {
  const navigate = useNavigate();

  if (!open) return null;

  const handleSubmit = async (form) => {
    return await createJob(form);
  };

  const handleSuccess = (res) => {
    onClose();
    navigate(`/hiring/jobs/${res.data.id}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={onClose} role="presentation">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-purple-100/50" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="create-job-title">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h3 id="create-job-title" className="text-lg font-semibold text-gray-900">Create Job Posting</h3>
            <p className="text-sm text-gray-600">Post a new job opportunity</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close create job modal">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5">
          <JobForm initial={initialForm} onSubmit={handleSubmit} onSuccess={handleSuccess} onCancel={onClose} submitLabel="Create Job" />
        </div>
      </div>
    </div>
  );
}
