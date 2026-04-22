import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listJobs } from '../../api';
import Spinner from '../../components/ui/Spinner';
import Guard, { usePermissions } from '../../components/features/auth/Guard';
import CreateJobModal from '../../components/features/hiring/CreateJobModal';

const STATUS_STYLES = {
  published: 'bg-green-100 text-green-700',
  draft: 'bg-yellow-100 text-yellow-700',
  paused: 'bg-orange-100 text-orange-700',
  closed: 'bg-red-100 text-red-700',
};

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
  { label: 'Paused', value: 'paused' },
  { label: 'Closed', value: 'closed' },
];

export default function JobList() {
  const { canManageHiring } = usePermissions();
  const [jobs, setJobs] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [createJobOpen, setCreateJobOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    listJobs(filter || undefined).then(r => setJobs(r.data)).finally(() => setLoading(false));
  }, [filter]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Postings</h1>
        </div>
        <Guard canManageHiring>
          <button type="button" onClick={() => setCreateJobOpen(true)} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
            + New Job
          </button>
        </Guard>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {FILTERS.filter(f => canManageHiring || ['', 'published'].includes(f.value)).map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filter === f.value ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:border-blue-300'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner /></div>
      ) : jobs.length === 0 ? (
        <div className="text-center text-gray-400 py-16">No job postings found.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.map(job => (
            <Link key={job.id} to={`/hiring/jobs/${job.id}`}
              className="block bg-white rounded-xl shadow-sm border p-5 hover:shadow-md hover:border-blue-200 transition-all">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-gray-900 hover:text-blue-600 line-clamp-1">{job.title}</h3>
                <span className={`text-xs rounded-full px-2 py-0.5 flex-shrink-0 ${STATUS_STYLES[job.status] || 'bg-gray-100 text-gray-600'}`}>
                  {job.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-2">{job.contract_type} {job.location ? `· ${job.location}` : ''}</p>
              {job.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">{job.description}</p>
              )}
              <div className="flex items-center justify-between text-xs text-gray-400 border-t pt-2">
                <span>{job.application_count ?? 0} applications</span>
                <span>{new Date(job.created_at).toLocaleDateString()}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
      <CreateJobModal open={createJobOpen} onClose={() => setCreateJobOpen(false)} />
    </div>
  );
}
