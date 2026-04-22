import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  getTask, getProject, getTaskComments, createTaskComment,
  deleteTask, moveTask, suggestAssignee, reassignTask, getProjectStatuses, formatDateTime, relativeTime,
} from '../../api';
import { useRealTime } from '../../context/RealTimeContext';
import Spinner from '../../components/ui/Spinner';
import PriorityBadge from '../../components/ui/PriorityBadge';
import StatusBadge from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import Guard, { usePermissions } from '../../components/features/auth/Guard';

function AISuggestPanel({ pk, taskId, task, onAssigned }) {
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [result, setResult] = useState(null);
  const { subscribe } = useRealTime();

  useEffect(() => {
    if (task?.ai_suggestions) {
      try {
        const suggestions = JSON.parse(task.ai_suggestions);
        if (suggestions?.members?.length) {
          const sorted = [...suggestions.members].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
          setResult({ ...suggestions, members: sorted });
        }
      } catch (e) {
        console.error('Failed to parse cached suggestions:', e);
      }
    }
  }, [task?.ai_suggestions]);

  useEffect(() => {
    if (!loading) return;
    return subscribe((data) => {
      if (data.type === 'task_suggestion_complete' && data.task_id === parseInt(taskId)) {
        getTask(pk, taskId).then(r => {
            const suggestions = r.data.ai_suggestions ? JSON.parse(r.data.ai_suggestions) : null;
            if (suggestions?.members?.length) {
                const sorted = [...suggestions.members].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
                setResult({ ...suggestions, members: sorted });
            }
            setLoading(false);
        }).catch(err => {
            console.error('Failed to fetch suggestions:', err);
            setLoading(false);
        });
      }
    });
  }, [loading, subscribe, pk, taskId]);

  const run = async () => {
    setLoading(true);
    setResult(null);
    try {
      await suggestAssignee(pk, taskId);
      setTimeout(() => {
        setLoading(prev => prev ? false : prev);
      }, 30000);
    } catch (err) {
      console.error('Failed to start suggestion:', err);
      setLoading(false);
    }
  };

  const handleAssign = async (userId) => {
    setAssigning(userId);
    try {
      await reassignTask(pk, taskId, userId);
      onAssigned();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to assign');
    } finally {
      setAssigning(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-5 font-mono">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <span className="text-purple-500">✦</span> AI Suggestion
      </h3>
      {!result ? (
        <button onClick={run} disabled={loading}
          className="w-full py-2 bg-purple-50 text-purple-700 rounded-xl text-sm font-medium hover:bg-purple-100 disabled:opacity-60">
          {loading ? 'Analysing…' : 'Suggest Assignees'}
        </button>
      ) : (
        <div className="space-y-2">
          {result.members?.slice(0, 3).map((m, i) => (
            <div key={m.user_id} className="border rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">#{i + 1} {m.username}</span>
                <span className="text-xs bg-purple-100 text-purple-700 rounded-full px-2 py-0.5">
                  {Math.round((m.confidence || 0) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1.5">
                <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${(m.confidence || 0) * 100}%` }} />
              </div>
              <p className="text-xs text-gray-500 mb-2 line-clamp-2">{m.reason}</p>
              <button
                onClick={() => handleAssign(m.user_id)}
                disabled={assigning === m.user_id}
                className="w-full py-1.5 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 disabled:opacity-60 transition-colors"
              >
                {assigning === m.user_id ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          ))}
          <button onClick={run} className="text-xs text-purple-600 hover:underline mt-1">Re-run</button>
        </div>
      )}
    </div>
  );
}

export default function TaskDetail() {
  const { pk, taskId } = useParams();
  const { user } = useAuth();
  const { canEditTask, isProjectManager } = usePermissions();
  const navigate = useNavigate();
  const [task, setTask] = useState(null);
  const [project, setProject] = useState(null);
  const [comments, setComments] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTaskData();
  }, [pk, taskId]);

  const loadTaskData = () => {
    Promise.all([
      getTask(pk, taskId), getProject(pk),
      getTaskComments(pk, taskId), getProjectStatuses(pk),
    ])
      .then(([t, p, c, s]) => {
        setTask(t.data); setProject(p.data);
        setComments(c.data); setStatuses(s.data);
      })
      .finally(() => setLoading(false));
  };

  const submitComment = async e => {
    e.preventDefault(); setPosting(true);
    try {
      const res = await createTaskComment(pk, taskId, comment);
      setComments(prev => [...prev, res.data]);
      setComment('');
    } finally { setPosting(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    await deleteTask(pk, taskId);
    navigate(`/projects/${pk}/kanban`);
  };

  const handleMove = async slug => {
    await moveTask(pk, taskId, slug);
    setTask(t => ({ ...t, status: slug }));
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;
  if (!task) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to={`/projects/${pk}`} className="hover:text-blue-600">← {project?.name}</Link>
        <span>/</span>
        <Link to={`/projects/${pk}/kanban`} className="hover:text-blue-600">Kanban</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate max-w-xs">{task.title}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
              <Guard canEditTask task={task} project={project}>
                <div className="flex gap-2 flex-shrink-0">
                  <Link to={`/projects/${pk}/tasks/${taskId}/edit`}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">
                    Edit
                  </Link>
                  <Guard isProjectManager project={project}>
                    <button onClick={handleDelete}
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100">
                      Delete
                    </button>
                  </Guard>
                </div>
              </Guard>
            </div>
            {task.description && (
              <p className="text-gray-700 text-sm whitespace-pre-line mb-4 leading-relaxed">{task.description}</p>
            )}
            <Guard canEditTask task={task} project={project}>
              {statuses.filter(s => s.slug !== task.status).length > 0 && (
                <div className="flex gap-2 flex-wrap pt-3 border-t items-center">
                  <span className="text-xs text-gray-400">Move to:</span>
                  {statuses.filter(s => s.slug !== task.status).map(s => (
                    <button key={s.slug} onClick={() => handleMove(s.slug)}
                      style={{
                        color: s.color,
                        borderColor: s.color,
                        background: s.color + '11',
                      }}
                      className="text-xs border rounded-full px-3 py-1 hover:bg-gray-50 text-gray-600 hover:border-gray-400 transition-colors">
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
            </Guard>
          </div>

          <div className="bg-white rounded-2xl shadow p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Comments ({comments.length})</h2>
            <div className="space-y-4 mb-6">
              {comments.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No comments yet. Be the first!</p>
              )}
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs flex-shrink-0">
                    {c.author?.username?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-800">{c.author?.username}</span>
                      <span className="text-xs text-gray-400">{relativeTime(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={submitComment} className="flex gap-2">
              <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2}
                placeholder="Write a comment…" required
                className="flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              <button disabled={posting || !comment.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm hover:bg-blue-700 disabled:opacity-50 self-end">
                Post
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow p-5 text-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Status</span><StatusBadge status={task.status} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Priority</span><PriorityBadge priority={task.priority} />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Start</span>
              <span className="text-gray-700">{task.start_time ? formatDateTime(task.start_time) : '—'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">End</span>
              <span className={task.is_overdue ? 'text-red-500 font-semibold' : task.deadline_approaching ? 'text-orange-500' : 'text-gray-700'}>
                {task.end_time ? formatDateTime(task.end_time) : '—'}
              </span>
            </div>
            {task.points > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-gray-500">Points</span>
                <span className="bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5 text-xs">{task.points} pts</span>
              </div>
            )}
            {task.completed_at && (
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-gray-500">Completed</span>
                <span className="text-green-600 text-xs">{formatDateTime(task.completed_at)}</span>
              </div>
            )}
            {task.assigned_to?.length > 0 && (
              <div className="border-t pt-2">
                <p className="text-gray-500 mb-2">Assignees</p>
                <div className="flex flex-wrap gap-1.5">
                  {task.assigned_to.map(u => (
                    <span key={u.id} className="bg-blue-50 text-blue-700 rounded-full px-2 py-0.5 text-xs">{u.username}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <AISuggestPanel pk={pk} taskId={taskId} task={task} onAssigned={loadTaskData} />

          <Link to={`/projects/${pk}/tasks/${taskId}/chat`}
            className="flex items-center gap-2 bg-white rounded-2xl shadow p-4 hover:shadow-md transition-shadow text-green-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span className="text-sm font-medium">Task Chat</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
