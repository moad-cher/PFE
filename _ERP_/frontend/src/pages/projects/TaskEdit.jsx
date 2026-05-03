import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  createTask,
  getProject,
  getProjectMembers,
  getProjectStatuses,
  getStories,
  getTask,
  updateTask,
  suggestAssignee,
} from '../../api';
import { useRealTime } from '../../context/RealTimeContext';
import Spinner from '../../components/shared/ui/Spinner';

const buildDefaultForm = (storyId) => ({
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  start_time: '',
  end_time: '',
  points: 10,
  assigned_to_ids: [],
  story_id: storyId || '',
  is_blocked: false,
  blocker_reason: '',
});

const toDateTimeLocal = (value) => {
  if (!value) return '';
  const d = new Date(value);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const fromDateTimeLocal = (value) => (value ? new Date(value).toISOString() : null);

function AISuggestPanel({ pk, taskId, task, onSelectCandidate }) {
  const [loading, setLoading] = useState(false);
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

  return (
    <div className="bg-purple-50/50 border border-purple-100 rounded-2xl p-4 font-sans mb-6">
      <h3 className="font-semibold text-purple-900 text-sm mb-3 flex items-center gap-2">
        <span className="text-purple-500">✦</span> AI Smart Suggestion
      </h3>
      {!result ? (
        <button type="button" onClick={run} disabled={loading}
          className="w-full py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 disabled:opacity-60 transition-all shadow-sm">
          {loading ? 'Analysing Task & Members…' : 'Find Best Candidates'}
        </button>
      ) : (
        <div className="space-y-2">
          {result.members?.slice(0, 3).map((m, i) => (
            <div key={`${m.user_id}-${i}`} className="bg-white border border-purple-100 rounded-xl p-3 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-xs text-gray-800">#{i + 1} {m.username}</span>
                <span className="text-[10px] bg-purple-100 text-purple-700 rounded-full px-2 py-0.5 font-bold">
                  {Math.round((m.confidence || 0) * 100)}% Match
                </span>
              </div>
              <p className="text-[10px] text-gray-500 mb-2 leading-tight italic">"{m.reason}"</p>
              <button
                type="button"
                onClick={() => onSelectCandidate(m.user_id)}
                className="w-full py-1.5 bg-purple-50 text-purple-700 rounded-lg text-[10px] font-bold hover:bg-purple-100 transition-colors border border-purple-200"
              >
                Select this Member
              </button>
            </div>
          ))}
          <button type="button" onClick={run} className="text-[10px] text-purple-600 hover:underline mt-1 font-medium">Re-run analysis</button>
        </div>
      )}
    </div>
  );
}

export default function TaskEdit({ isOpen, onClose, pk: propPk, taskId: propTaskId, initialStoryId, onSuccess }) {
  const { pk: routePk } = useParams();
  const taskId = propTaskId;
  const isEdit = Boolean(taskId);
  const projectId = propPk || routePk;

  const [project, setProject] = useState(null);
  const [stories, setStories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [members, setMembers] = useState([]);
  const [taskData, setTaskData] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !isOpen) return;

    setLoading(true);
    setError('');

    const promises = [
      getProject(projectId),
      getProjectStatuses(projectId),
      getProjectMembers(projectId),
      getStories(projectId),
    ];

    if (isEdit) {
      promises.push(getTask(projectId, taskId));
    }

    Promise.all(promises)
      .then(([projectRes, statusesRes, membersRes, storiesRes, taskRes]) => {
        setProject(projectRes.data);
        setStatuses(statusesRes.data);
        setStories(storiesRes.data);
        const users = membersRes.data.map((stat) => stat.user);
        setMembers(users);

        if (isEdit && taskRes) {
          setTaskData(taskRes.data);
          const d = taskRes.data;
          setForm({
            title: d.title,
            description: d.description || '',
            status: d.status,
            priority: d.priority,
            start_time: toDateTimeLocal(d.start_time),
            end_time: toDateTimeLocal(d.end_time),
            points: d.points,
            assigned_to_ids: d.assigned_to?.map((u) => u.id) || [],
            story_id: d.story_id || '',
            is_blocked: d.is_blocked || false,
            blocker_reason: d.blocker_reason || '',
          });
        } else {
          setForm(buildDefaultForm(initialStoryId));
        }
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || err?.message || 'Failed to load task context');
      })
      .finally(() => setLoading(false));
  }, [projectId, taskId, isEdit, isOpen, initialStoryId]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const toggleAssignee = (userId) => {
    setForm((prev) => {
      const ids = prev.assigned_to_ids || [];
      if (ids.includes(userId)) {
        return { ...prev, assigned_to_ids: ids.filter((id) => id !== userId) };
      }
      return { ...prev, assigned_to_ids: [...ids, userId] };
    });
  };

  const handleSelectCandidate = (userId) => {
    setForm(prev => ({
      ...prev,
      assigned_to_ids: [...new Set([...(prev.assigned_to_ids || []), userId])]
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload = {
        ...form,
        points: Number(form.points),
        start_time: fromDateTimeLocal(form.start_time),
        end_time: fromDateTimeLocal(form.end_time),
      };

      if (isEdit) {
        await updateTask(projectId, taskId, payload);
        if (onSuccess) onSuccess();
        onClose();
        return;
      }

      const res = await createTask(projectId, payload);
      if (onSuccess) onSuccess(res.data);
      onClose();
      setForm(buildDefaultForm(initialStoryId));
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to save task');
      setSaving(false);
    }
  };

  const assigneeCount = useMemo(() => form?.assigned_to_ids?.length || 0, [form]);
  const showForm = !loading && form;

  const sprintDates = useMemo(() => {
    if (!form?.story_id || !stories.length || !project?.sprints?.length) return null;
    const story = stories.find(s => String(s.id) === String(form.story_id));
    if (!story || !story.sprint_id) return null;
    const sprint = project.sprints.find(s => s.id === story.sprint_id);
    if (!sprint) return null;
    return {
      start: sprint.start_date.split('T')[0] + 'T00:00',
      end: sprint.end_date.split('T')[0] + 'T23:59'
    };
  }, [form?.story_id, stories, project]);

  const startMax = form?.end_time && sprintDates?.end 
    ? (form.end_time < sprintDates.end ? form.end_time : sprintDates.end) 
    : (form?.end_time || sprintDates?.end);

  const endMin = form?.start_time && sprintDates?.start 
    ? (form.start_time > sprintDates.start ? form.start_time : sprintDates.start) 
    : (form?.start_time || sprintDates?.start);

  if (!isOpen) return null;

  const formContent = showForm ? (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input
          value={form.title}
          onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
          required
          className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea
          value={form.description}
          onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
          rows={3}
          className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Assignees</label>
        <div className="border rounded-xl p-3 max-h-40 overflow-y-auto bg-gray-50/30">
          {members.length === 0 ? (
            <p className="text-sm text-gray-500">No project members available</p>
          ) : (
            <div className="space-y-1">
              {members.map((member) => (
                <label key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white hover:shadow-sm cursor-pointer transition-all text-sm">
                  <input
                    type="checkbox"
                    checked={form.assigned_to_ids?.includes(member.id) || false}
                    onChange={() => toggleAssignee(member.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span>{member.first_name || member.username} {member.last_name || ''}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        {assigneeCount > 0 && <p className="text-[10px] text-gray-400 mt-1 font-bold uppercase ml-1">{assigneeCount} selected</p>}
      </div>

      {isEdit && (
        <AISuggestPanel 
          pk={projectId} 
          taskId={taskId} 
          task={taskData} 
          onSelectCandidate={handleSelectCandidate} 
        />
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">User Story *</label>
          <select
            value={form.story_id}
            onChange={(e) => setForm((prev) => ({ ...prev, story_id: e.target.value }))}
            required
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            <option value="" disabled>Select a Story</option>
            {stories.map((story) => (
              <option key={story.id} value={story.id}>{story.title}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            {statuses.map((status) => (
              <option key={status.slug} value={status.slug}>{status.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            value={form.priority}
            onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          >
            {['low', 'medium', 'high', 'urgent'].map((p) => (
              <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
          <input
            type="datetime-local"
            value={form.start_time}
            min={sprintDates?.start}
            max={startMax}
            onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
          <input
            type="datetime-local"
            value={form.end_time}
            min={endMin}
            max={sprintDates?.end}
            onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Points</label>
          <input
            type="number"
            min="0"
            value={form.points}
            onChange={(e) => setForm((prev) => ({ ...prev, points: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <label className="flex items-center gap-3 p-3 bg-amber-50/50 border border-amber-100 rounded-xl cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_blocked}
            onChange={(e) => setForm((prev) => ({ ...prev, is_blocked: e.target.checked }))}
            className="w-5 h-5 text-amber-600 rounded-lg focus:ring-amber-500 border-amber-300"
          />
          <div>
            <span className="text-sm font-bold text-amber-900 block">Flag as Blocked</span>
            <span className="text-[10px] text-amber-700 italic leading-tight">{form.is_blocked ? 'Provide a reason below' : 'Surface issues to manager'}</span>
          </div>
        </label>
        
        {form.is_blocked && (
          <textarea
            value={form.blocker_reason}
            onChange={(e) => setForm((prev) => ({ ...prev, blocker_reason: e.target.value }))}
            placeholder="Why is this task blocked?"
            rows={2}
            className="mt-2 w-full border border-amber-200 bg-white rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 text-amber-900"
          />
        )}
      </div>

      <div className="flex gap-3 pt-6 border-t border-gray-100">
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 shadow-md shadow-blue-100 transition-all"
        >
          {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Task'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all"
        >
          Cancel
        </button>
      </div>
    </form>
  ) : (
    <div className="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 backdrop-blur-sm px-4 py-8 overflow-y-auto"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl my-auto mt-10 relative border border-gray-100"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md flex items-center justify-between p-6 border-b border-gray-100 rounded-t-[32px]">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Task' : 'Create New Task'}</h1>
            {project && <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{project.name}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900 transition-colors p-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm font-medium">
              {error}
            </div>
          )}
          {formContent}
        </div>
      </div>
    </div>
  );
}
