import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getJob, getJobApplications, updateApplicationStatus, deleteJob } from '../../api';
import { useRealTime } from '../../context/RealTimeContext';
import Spinner from '../../components/Spinner';
import { useAuth } from '../../context/AuthContext';
import EditJobModal from '../../components/EditJobModal';

const STATUS_OPTS = ['pending', 'reviewed', 'interview', 'accepted', 'rejected'];
const STATUS_STYLE = {
  pending: 'bg-gray-100 text-gray-600',
  reviewed: 'bg-blue-100 text-blue-700',
  interview: 'bg-purple-100 text-purple-700',
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

export default function JobDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { subscribe } = useRealTime();
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const isHR = user?.role === 'hr_manager' || user?.role === 'admin';
  const [editOpen, setEditOpen] = useState(false);

  const loadData = () => {
    const p = [getJob(id)];
    if (isHR) p.push(getJobApplications(id));
    return Promise.all(p).then(([j, a]) => {
      setJob(j.data);
      if (a) setApplications(a.data);
      return { job: j.data, applications: a?.data };
    });
  };

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [id, isHR]);

  // WebSocket for live AI updates
  useEffect(() => {
    if (!isHR) return;
    return subscribe((data) => {
      if (data.type === 'ai_complete' && data.job_id === parseInt(id)) {
        // Refresh the whole list or fetch the specific application
        getJobApplications(id).then(r => setApplications(r.data));
      }
    });
  }, [id, isHR, subscribe]);

  const navigate = useNavigate();

  const changeStatus = async (appId, status) => {
    await updateApplicationStatus(appId, status);
    setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
  };

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const handleDelete = async () => {
    try {
      await deleteJob(id);
      navigate('/hiring/jobs');
    } catch (err) {
      console.error('Failed to delete job', err);
      // Could show an error UI here
      setDeleteConfirm(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;
  if (!job) return null;

  const skills = (job.required_skills || '').split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Breadcrumb with optional login link */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Link to="/hiring/jobs" className="hover:text-blue-600">← Job Postings</Link>
          <span>/</span><span className="text-gray-700 font-medium truncate max-w-xs">{job.title}</span>
        </div>
        {!user && (
          <Link to="/login" className="text-sm text-blue-600 hover:underline">
            Sign in
          </Link>
        )}
      </div>

      {/* Job card */}
      <div className="bg-white rounded-2xl shadow p-6 mb-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-gray-500 text-sm">{job.contract_type}{job.location ? ` · ${job.location}` : ''}</p>
              <span className={`text-xs rounded-full px-2 py-0.5 ${
                job.status === 'published' ? 'bg-green-100 text-green-700' :
                job.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                job.status === 'paused' ? 'bg-orange-100 text-orange-700' :
                'bg-red-100 text-red-700'
              }`}>
                {job.status}
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {isHR && (
              <>
                <button type="button" onClick={() => setEditOpen(true)} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">Edit</button>
                {deleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-red-600">Sure?</span>
                    <button
                      onClick={handleDelete}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(false)}
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-sm hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </>
            )}
            {job.status === 'published' ? (
              <Link to={`/hiring/jobs/${id}/apply`} className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700">
                Apply Now
              </Link>
            ) : (
              <div className="px-4 py-2 bg-gray-300 text-gray-500 rounded-xl text-sm font-medium cursor-not-allowed" title={`Job is ${job.status}`}>
                Not Open
              </div>
            )}
          </div>
        </div>
        {job.description && <p className="text-gray-700 text-sm whitespace-pre-line mb-4">{job.description}</p>}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t">
            {skills.map(s => (
              <span key={s} className="bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 text-xs">{s}</span>
            ))}
          </div>
        )}
      </div>

      {/* Applications table */}
      {isHR && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Applications <span className="text-gray-400 font-normal">({applications.length})</span>
          </h2>
          <div className="bg-white rounded-2xl shadow overflow-hidden">
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
                      <Link to={`/hiring/applications/${app.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                        {app.first_name} {app.last_name}
                      </Link>
                      <p className="text-xs text-gray-400">{app.email}</p>
                    </td>
                    <td className="px-4 py-3"><ScoreBar score={app.ai_score} /></td>
                    <td className="px-4 py-3">
                      <select value={app.status} onChange={e => changeStatus(app.id, e.target.value)}
                        className={`text-xs rounded-full px-2 py-0.5 border-0 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${STATUS_STYLE[app.status]}`}>
                        {STATUS_OPTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{new Date(app.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Link to={`/hiring/applications/${app.id}`} className="text-xs text-blue-600 hover:underline">View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <EditJobModal open={editOpen} onClose={() => setEditOpen(false)} jobId={id} onSaved={(updated) => setJob(updated)} />
    </div>
  );
}
