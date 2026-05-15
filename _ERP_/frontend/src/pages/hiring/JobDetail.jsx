import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getJob, getJobApplications, updateApplicationStatus, deleteJob } from '../../api';
import { useRealTime } from '../../context/RealTimeContext';
import Spinner from '../../components/shared/ui/Spinner';
import { useAuth } from '../../context/AuthContext';
import Guard, { usePermissions } from '../../auth/Guard';
import EditJobModal from '../../components/features/hiring/EditJobModal';
import ApplyModal from '../../components/features/hiring/ApplyModal';

const STATUS_OPTS = ['pending', 'reviewed', 'interview', 'accepted', 'rejected'];
const STATUS_STYLE = {
  pending: 'bg-gray-100 text-gray-600',
  reviewed: 'bg-purple-100 text-purple-700',
  interview: 'bg-purple-200 text-purple-800',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

function ScoreBar({ score }) {
  if (score == null) return <span className="text-xs text-gray-400">Not analyzed</span>;
  const color = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-yellow-500' : 'bg-red-500';
  const textColor = score >= 70 ? 'text-green-700' : score >= 40 ? 'text-yellow-700' : 'text-red-700';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-xs font-semibold ${textColor}`}>{Math.round(score)}%</span>
    </div>
  );
}

export default function JobDetail({ jobId, initialData, onDeleted }) {
  const { user } = useAuth();
  const { canManageHiring } = usePermissions();
  const { subscribe } = useRealTime();
  const [job, setJob] = useState(initialData || null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState(null);

  const [editOpen, setEditOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  const loadData = () => {
    if (!jobId) return;
    
    // Clear previous state to avoid showing stale data from another job
    setError(null);
    if (!initialData) {
      setJob(null);
      setApplications([]);
      setLoading(true);
    } else {
      setJob(initialData);
    }

    const p = [getJob(jobId)];
    if (canManageHiring) p.push(getJobApplications(jobId));

    Promise.all(p)
      .then(([j, a]) => {
        setJob(j.data);
        if (a) setApplications(a.data);
      })
      .catch(err => {
        console.error(`Error loading job ${jobId}:`, err);
        setError(err.response?.status === 404 ? 'Job not found' : 'Failed to load job details');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [jobId, canManageHiring]);

  // WebSocket for live AI updates
  useEffect(() => {
    if (!canManageHiring || !jobId) return;
    return subscribe((data) => {
      if (data.type === 'ai_complete' && data.job_id === parseInt(jobId)) {
        getJobApplications(jobId).then(r => setApplications(r.data)).catch(() => {});
      }
    });
  }, [jobId, canManageHiring, subscribe]);

  const navigate = useNavigate();

  const changeStatus = async (appId, status) => {
    try {
      await updateApplicationStatus(appId, status);
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
    } catch (err) {
      console.error('Failed to update application status', err);
    }
  };

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const handleDelete = async () => {
    try {
      await deleteJob(jobId);
      if (onDeleted) onDeleted(); // Refresh the list in the parent
      navigate('/hiring/jobs');
    } catch (err) {
      console.error('Failed to delete job', err);
      alert(err.response?.data?.detail || 'Failed to delete job. It might have been already removed.');
      setDeleteConfirm(false);
    }
  };

  if (!jobId) return (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20 bg-white rounded-2xl shadow-sm border border-dashed">
      <div className="text-4xl mb-4">📄</div>
      <p>Select a job to view details</p>
    </div>
  );

  if (error) return (
    <div className="p-8 text-center bg-white rounded-2xl shadow-sm border border-red-100">
      <div className="text-3xl mb-2">⚠️</div>
      <p className="text-red-600 font-medium">{error}</p>
      <Link to="/hiring/jobs" className="mt-4 inline-block text-purple-600 hover:underline text-sm font-medium">Back to List</Link>
    </div>
  );

  const displayJob = job || initialData;

  if (loading && !displayJob) return <div className="flex items-center justify-center min-h-[40vh] bg-white rounded-2xl shadow-sm"><Spinner size="lg" /></div>;
  if (!displayJob) return null;

  const skills = (displayJob.required_skills || '').split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Job card */}
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{displayJob.title}</h1>
              <Link to="/hiring/jobs" className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Close details">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Link>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-gray-500 text-sm">{displayJob.contract_type}{displayJob.location ? ` · ${displayJob.location}` : ''}</p>
              <span className={`text-xs rounded-full px-2 py-0.5 ${
                displayJob.status === 'published' ? 'bg-green-100 text-green-700' :
                displayJob.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                displayJob.status === 'paused' ? 'bg-orange-100 text-orange-700' :
                'bg-red-100 text-red-700'
              }`}>
                {displayJob.status}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 mb-4">
            <Guard canManageHiring>
                <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                    <button 
                      type="button" 
                      onClick={() => setEditOpen(true)} 
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                      title="Edit Job"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    
                    {deleteConfirm ? (
                      <div className="flex items-center gap-1 animate-in slide-in-from-left-2">
                        <button 
                          onClick={handleDelete} 
                          className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded-md hover:bg-red-700 transition-colors"
                        >
                          Confirm
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm(false)} 
                          className="p-1 text-gray-400 hover:text-gray-600 rounded-md"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setDeleteConfirm(true)} 
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete Job"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                </div>
            </Guard>
            
            {displayJob.status === 'published' ? (
              <button onClick={() => setApplyOpen(true)} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 shadow-sm transition-all hover:shadow-md">
                Apply Now
              </button>
            ) : (
              <div className="px-4 py-2 bg-gray-100 text-gray-400 rounded-xl text-sm font-medium cursor-not-allowed border" title={`Job is ${displayJob.status}`}>
                Not Open
              </div>
            )}
        </div>

        {displayJob.description && <p className="text-gray-700 text-sm whitespace-pre-line mb-4">{displayJob.description}</p>}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
            {skills.map(s => (
              <span key={s} className="bg-purple-50 text-purple-700 rounded-full px-2 py-0.5 text-xs">{s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Applications table - HR view */}
      <Guard canManageHiring>
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Applications <span className="text-gray-400 font-normal">({loading ? '...' : applications.length})</span>
          </h2>
          <div className="bg-white rounded-2xl shadow overflow-hidden">
            {loading ? (
               <div className="flex justify-center py-12"><Spinner /></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Candidate', 'AI Score', 'Status', 'Date', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {applications.length === 0 && (
                      <tr><td colSpan={5} className="text-center text-gray-400 py-8">No applications yet</td></tr>
                    )}
                    {applications.map(app => (
                      <tr key={app.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link to={`/hiring/applications/${app.id}`} className="font-medium text-gray-900 hover:text-purple-600">
                            {app.first_name} {app.last_name}
                          </Link>
                          <p className="text-xs text-gray-400">{app.email}</p>
                        </td>
                        <td className="px-4 py-3"><ScoreBar score={app.ai_score} /></td>
                        <td className="px-4 py-3">
                          <select value={app.status} onChange={e => changeStatus(app.id, e.target.value)}
                            className={`text-xs rounded-full px-2 py-0.5 border-0 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-400 ${STATUS_STYLE[app.status]}`}>
                            {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-400">{new Date(app.created_at).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <Link to={`/hiring/applications/${app.id}`} className="text-xs text-purple-600 hover:underline">View →</Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </Guard>
      <EditJobModal open={editOpen} onClose={() => setEditOpen(false)} jobId={jobId} onSaved={(updated) => setJob(updated)} />
      <ApplyModal open={applyOpen} onClose={() => setApplyOpen(false)} jobId={jobId} jobTitle={displayJob.title} />
    </div>
  );
}
