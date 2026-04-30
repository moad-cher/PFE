import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  createTask,
  getProject,
  getProjectMembers,
  getProjectStatuses,
  getStories,
  getTask,
  updateTask,
} from '../../api';
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
});

const toDateTimeLocal = (value) => {
  if (!value) return '';
  const d = new Date(value);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const fromDateTimeLocal = (value) => (value ? new Date(value).toISOString() : null);

export default function TaskEdit({ isOpen, onClose, pk: propPk, initialStoryId, onSuccess }) {
  const { pk: routePk, taskId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(taskId);
  const isModal = typeof isOpen === 'boolean';
  const projectId = propPk || routePk;

  const [project, setProject] = useState(null);
  const [stories, setStories] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    if (isModal && !isOpen) return;

    setLoading(true);
    setError('');

    if (isEdit) {
      Promise.all([
        getTask(projectId, taskId),
        getProject(projectId),
        getProjectStatuses(projectId),
        getProjectMembers(projectId),
        getStories(projectId),
      ])
        .then(([taskRes, projectRes, statusesRes, membersRes, storiesRes]) => {
          setProject(projectRes.data);
          setStatuses(statusesRes.data);
          setStories(storiesRes.data);
          const users = membersRes.data.map((stat) => stat.user);
          setMembers(users);
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
          });
        })
        .catch((err) => {
          setError(err?.response?.data?.detail || err?.message || 'Failed to load task');
        })
        .finally(() => setLoading(false));
      return;
    }

    Promise.all([
      getProject(projectId),
      getProjectStatuses(projectId),
      getProjectMembers(projectId),
      getStories(projectId),
    ])
      .then(([projectRes, statusesRes, membersRes, storiesRes]) => {
        setProject(projectRes.data);
        setStatuses(statusesRes.data);
        setStories(storiesRes.data);
        const users = membersRes.data.map((stat) => stat.user);
        setMembers(users);
        setForm(buildDefaultForm(initialStoryId));
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || err?.message || 'Failed to load project');
      })
      .finally(() => setLoading(false));
  }, [projectId, taskId, isEdit, isModal, isOpen, initialStoryId]);

  useEffect(() => {
    if (!isModal) return undefined;
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isModal, isOpen]);

  const toggleAssignee = (userId) => {
    setForm((prev) => {
      const ids = prev.assigned_to_ids || [];
      if (ids.includes(userId)) {
        return { ...prev, assigned_to_ids: ids.filter((id) => id !== userId) };
      }
      return { ...prev, assigned_to_ids: [...ids, userId] };
    });
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
        navigate(`/projects/${projectId}/tasks/${taskId}`);
        return;
      }

      const res = await createTask(projectId, payload);
      if (onSuccess) onSuccess(res.data);
      if (onClose) onClose();
      setForm(buildDefaultForm(initialStoryId));
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Failed to save task');
      setSaving(false);
    }
  };

  const assigneeCount = useMemo(() => form?.assigned_to_ids?.length || 0, [form]);
  const showForm = !loading && form;

  if (isModal && !isOpen) return null;
  if (!isModal && !showForm) {
    if (error) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">{error}</div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

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
          rows={4}
          className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Assignees</label>
        <div className="border rounded-xl p-3 max-h-48 overflow-y-auto">
          {members.length === 0 ? (
            <p className="text-sm text-gray-500">No project members available</p>
          ) : (
            <div className="space-y-2">
              {members.map((member) => (
                <label key={member.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.assigned_to_ids?.includes(member.id) || false}
                    onChange={() => toggleAssignee(member.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-2">
                    {member.avatar ? (
                      <img
                        src={member.avatar.startsWith('http') ? member.avatar : `${window.location.protocol}//${window.location.hostname}:8001${member.avatar}`}
                        alt={member.username}
                        className="w-7 h-7 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium">
                        {member.username?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <span className="text-sm text-gray-800">
                      {member.first_name || member.username} {member.last_name || ''}
                    </span>
                    {member.role && <span className="text-xs text-gray-400">({member.role})</span>}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        {assigneeCount > 0 && <p className="text-xs text-gray-500 mt-1">{assigneeCount} member(s) selected</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">User Story</label>
          <select
            value={form.story_id}
            onChange={(e) => setForm((prev) => ({ ...prev, story_id: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Standalone (No Story)</option>
            {stories.map((story) => (
              <option key={story.id} value={story.id}>
                {story.title}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {statuses.map((status) => (
              <option key={status.slug} value={status.slug}>
                {status.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select
            value={form.priority}
            onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {['low', 'medium', 'high', 'urgent'].map((priority) => (
              <option key={priority} value={priority}>
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
          <input
            type="datetime-local"
            value={form.start_time}
            onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
          <input
            type="datetime-local"
            value={form.end_time}
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
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? (isEdit ? 'Saving…' : 'Creating…') : isEdit ? 'Save Changes' : 'Create Task'}
        </button>
        {isModal ? (
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200"
          >
            Cancel
          </button>
        ) : (
          <Link
            to={`/projects/${projectId}/tasks/${taskId}`}
            className="px-5 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-200"
          >
            Cancel
          </Link>
        )}
      </div>
    </form>
  ) : (
    <div className="flex justify-center py-12">
      <Spinner size="lg" />
    </div>
  );

  if (isModal) {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 backdrop-blur-sm px-4 py-8 overflow-y-auto"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-auto mt-20 relative border border-gray-100"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-md flex items-center justify-between p-6 border-b border-gray-100 rounded-t-3xl">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Task' : 'Create New Task'}</h1>
              {project && <p className="text-sm text-gray-500 mt-0.5">{project.name}</p>}
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-8">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
                {error}
              </div>
            )}
            {formContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to={`/projects/${projectId}/tasks/${taskId}`} className="hover:text-blue-600">
          ← Back to Task
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">Edit</span>
      </div>
      <div className="bg-white rounded-2xl shadow p-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Edit Task</h1>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 mb-4 text-sm">
            {error}
          </div>
        )}
        {formContent}
      </div>
    </div>
  );
}
