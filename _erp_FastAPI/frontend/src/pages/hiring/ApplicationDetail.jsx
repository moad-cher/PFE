import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getApplication, updateApplicationStatus, analyzeApplication, formatDateTime, API_BASE } from '../../api';
import Spinner from '../../components/Spinner';
import PdfViewer from '../../components/PdfViewer';

const STATUS_OPTS = ['pending', 'reviewed', 'interview', 'accepted', 'rejected'];
const STATUS_STYLE = {
  pending: 'bg-gray-100 text-gray-600',
  reviewed: 'bg-blue-100 text-blue-700',
  interview: 'bg-purple-100 text-purple-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

function AIPanel({ app, onReanalyze }) {
  const [loading, setLoading] = useState(false);
  const ai = app.ai_data;

  const reanalyze = async () => {
    setLoading(true);
    try { await analyzeApplication(app.id); onReanalyze(); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span className="text-purple-500">✦</span> AI Analysis
      </h3>
      {!ai ? (
        <div className="text-center py-4">
          <p className="text-sm text-gray-400 mb-3">No AI analysis yet.</p>
          <button onClick={reanalyze} disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm hover:bg-purple-700 disabled:opacity-50">
            {loading ? 'Analysing…' : 'Analyze Resume'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Score */}
          {app.ai_score != null && (
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Score</span>
                <span className={`font-bold ${app.ai_score >= 70 ? 'text-green-600' : app.ai_score >= 40 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {Math.round(app.ai_score)}/100
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${app.ai_score >= 70 ? 'bg-green-500' : app.ai_score >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${app.ai_score}%` }}
                />
              </div>
            </div>
          )}
          {ai.analysis && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-600 leading-relaxed">{ai.analysis}</p>
            </div>
          )}
          {ai.strengths?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Strengths</p>
              <ul className="space-y-0.5">
                {ai.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-green-700 flex items-start gap-1">
                    <span className="mt-0.5 flex-shrink-0">✓</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ai.weaknesses?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-700 mb-1">Weaknesses</p>
              <ul className="space-y-0.5">
                {ai.weaknesses.map((w, i) => (
                  <li key={i} className="text-xs text-red-600 flex items-start gap-1">
                    <span className="mt-0.5 flex-shrink-0">✗</span>{w}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button onClick={reanalyze} disabled={loading}
            className="text-xs text-purple-600 hover:underline">
            {loading ? 'Re-analysing…' : 'Re-run analysis'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function ApplicationDetail() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => getApplication(id).then(r => setApp(r.data));

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [id]);

  const changeStatus = async status => {
    await updateApplicationStatus(id, status);
    setApp(a => ({ ...a, status }));
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;
  if (!app) return null;

  const resumeUrl = app.resume
    ? (app.resume.startsWith('http') ? app.resume : `${API_BASE}/${app.resume.replace(/\\/g, '/')}`)
    : null;
  const isPdf = resumeUrl?.toLowerCase().endsWith('.pdf');

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/hiring/jobs" className="hover:text-blue-600">← Jobs</Link>
        {app.job_id && (
          <><span>/</span><Link to={`/hiring/jobs/${app.job_id}`} className="hover:text-blue-600">Job Detail</Link></>
        )}
        <span>/</span><span className="text-gray-700 font-medium">{app.first_name} {app.last_name}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Candidate info */}
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-2xl font-bold text-gray-900">{app.first_name} {app.last_name}</h1>
              <select value={app.status} onChange={e => changeStatus(e.target.value)}
                className={`text-sm rounded-full px-3 py-1 border-0 font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${STATUS_STYLE[app.status]}`}>
                {STATUS_OPTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Email</span><span className="text-gray-900">{app.email}</span></div>
              {app.phone && <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Phone</span><span className="text-gray-900">{app.phone}</span></div>}
              <div className="flex justify-between border-b pb-2"><span className="text-gray-500">Applied</span><span className="text-gray-900">{formatDateTime(app.created_at)}</span></div>
            </div>
          </div>

          {/* Cover letter */}
          {app.cover_letter && (
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Cover Letter</h2>
              <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{app.cover_letter}</p>
            </div>
          )}

          {/* CV */}
          {resumeUrl && (
            <div className="bg-white rounded-2xl shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Resume / CV</h2>
                <a href={resumeUrl} download className="text-xs text-blue-600 hover:underline">Download ↓</a>
              </div>
              {isPdf ? (
                <PdfViewer url={resumeUrl} />
              ) : (
                <a href={resumeUrl} target="_blank" rel="noreferrer"
                  className="block text-center py-8 border-2 border-dashed rounded-xl text-blue-600 hover:bg-blue-50">
                  Open file ↗
                </a>
              )}
            </div>
          )}

          {/* Interviews */}
          {app.interviews?.length > 0 && (
            <div className="bg-white rounded-2xl shadow p-6">
              <h2 className="font-semibold text-gray-900 mb-3">Interviews</h2>
              <div className="space-y-3">
                {app.interviews.map(iv => (
                  <div key={iv.id} className="border rounded-xl p-3 text-sm">
                    <p className="font-medium text-gray-900">{formatDateTime(iv.scheduled_at)}</p>
                    {iv.location && <p className="text-gray-500">📍 {iv.location}</p>}
                    {iv.notes && <p className="text-gray-500 mt-1 text-xs">{iv.notes}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <AIPanel app={app} onReanalyze={load} />
          {!['accepted', 'rejected'].includes(app.status) && (
            <Link to={`/hiring/applications/${id}/interview`}
              className="block w-full text-center py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
              Schedule Interview
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
