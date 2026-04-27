import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  formatDate,
  formatDateTime,
  getProject,
  getProjectStatuses,
  getSprints,
  getStories,
} from '../../api';
import Spinner from '../../components/ui/Spinner';
import StatusBadge from '../../components/ui/StatusBadge';
import PriorityBadge from '../../components/ui/PriorityBadge';

function TableSection({ title, subtitle, rows, pk, emptyLabel }) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead className="bg-white text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Sprint</th>
              <th className="px-4 py-3">Story</th>
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Points</th>
              <th className="px-4 py-3">Assignees</th>
              <th className="px-4 py-3">Deadline</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((row) => (
                <tr key={row.key} className="border-t border-slate-100">
                  <td className="px-4 py-3 text-sm text-slate-700">{row.sprint}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.story}</td>
                  <td className="px-4 py-3">
                    {row.taskId ? (
                      <Link to={`/projects/${pk}/tasks/${row.taskId}`} className="font-medium text-slate-900 hover:text-indigo-700">
                        {row.task}
                      </Link>
                    ) : (
                      <span className="font-medium text-slate-900">{row.task}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {row.status ? <StatusBadge status={row.status} /> : <span className="text-sm text-slate-400">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    {row.priority ? <PriorityBadge priority={row.priority} /> : <span className="text-sm text-slate-400">-</span>}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{row.points}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{row.assignees}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{row.deadline}</td>
                </tr>
              ))
            ) : (
              <tr className="border-t border-slate-100">
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                  {emptyLabel}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function ScrumBoard2() {
  const { pk } = useParams();
  const [project, setProject] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [stories, setStories] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getProject(pk), getProjectStatuses(pk), getSprints(pk), getStories(pk)])
      .then(([projectRes, statusesRes, sprintsRes, storiesRes]) => {
        setProject(projectRes.data);
        setStatuses(statusesRes.data);
        setSprints(
          [...sprintsRes.data].sort((left, right) => {
            const leftDate = left.start_date ? new Date(left.start_date).getTime() : 0;
            const rightDate = right.start_date ? new Date(right.start_date).getTime() : 0;
            return leftDate - rightDate;
          })
        );
        setStories(storiesRes.data);
      })
      .finally(() => setLoading(false));
  }, [pk]);

  const allMembers = useMemo(() => {
    if (!project) return [];
    return [project.manager, ...(project.members || [])]
      .filter(Boolean)
      .filter((value, index, items) => items.findIndex((candidate) => candidate.id === value.id) === index);
  }, [project]);

  const filteredTasks = useMemo(() => {
    const tasks = project?.tasks || [];
    return tasks.filter((task) => {
      if (filterStatus && task.status !== filterStatus) return false;
      if (filterAssignee && !task.assigned_to?.some((assignee) => assignee.id === Number(filterAssignee))) {
        return false;
      }
      return true;
    });
  }, [project, filterStatus, filterAssignee]);

  const storiesById = useMemo(() => {
    const map = new Map();
    stories.forEach((story) => map.set(story.id, story));
    return map;
  }, [stories]);

  const sprintsById = useMemo(() => {
    const map = new Map();
    sprints.forEach((sprint) => map.set(sprint.id, sprint));
    return map;
  }, [sprints]);

  const buildTaskRow = (task, story, sprint, scope) => ({
    key: `${scope}-${task.id}`,
    sprint: sprint ? `${sprint.name} (${sprint.status})` : 'Backlog',
    story: story?.title || 'No story',
    task: task.title,
    taskId: task.id,
    status: task.status,
    priority: task.priority,
    points: task.points || 0,
    assignees: task.assigned_to?.length ? task.assigned_to.map((user) => user.username).join(', ') : 'Unassigned',
    deadline: task.end_time ? formatDateTime(task.end_time) : 'No deadline',
  });

  const backlogRows = useMemo(() => {
    const rows = [];
    const backlogStories = stories.filter((story) => !story.sprint_id);
    const storyIds = new Set(backlogStories.map((story) => story.id));

    backlogStories.forEach((story) => {
      const storyTasks = filteredTasks.filter((task) => task.story_id === story.id);
      if (storyTasks.length) {
        storyTasks.forEach((task) => rows.push(buildTaskRow(task, story, null, 'backlog-story')));
      } else {
        rows.push({
          key: `backlog-story-${story.id}`,
          sprint: 'Backlog',
          story: story.title,
          task: 'No tasks',
          taskId: null,
          status: '',
          priority: '',
          points: story.points || 0,
          assignees: '-',
          deadline: '-',
        });
      }
    });

    filteredTasks
      .filter((task) => !task.story_id || !storyIds.has(task.story_id))
      .filter((task) => {
        const taskStory = task.story_id ? storiesById.get(task.story_id) : null;
        return !taskStory || !taskStory.sprint_id;
      })
      .forEach((task) => {
        const story = task.story_id ? storiesById.get(task.story_id) : null;
        rows.push(buildTaskRow(task, story, null, 'backlog-task'));
      });

    return rows;
  }, [filteredTasks, stories, storiesById]);

  const sprintRows = useMemo(() => {
    return sprints.flatMap((sprint) => {
      const sprintStories = stories.filter((story) => story.sprint_id === sprint.id);
      const rows = [];

      sprintStories.forEach((story) => {
        const storyTasks = filteredTasks.filter((task) => task.story_id === story.id);
        if (storyTasks.length) {
          storyTasks.forEach((task) => rows.push(buildTaskRow(task, story, sprint, 'sprint-task')));
        } else {
          rows.push({
            key: `sprint-story-${story.id}`,
            sprint: `${sprint.name} (${sprint.status})`,
            story: story.title,
            task: 'No tasks',
            taskId: null,
            status: '',
            priority: '',
            points: story.points || 0,
            assignees: '-',
            deadline: '-',
          });
        }
      });

      filteredTasks
        .filter((task) => task.story_id && !sprintStories.some((story) => story.id === task.story_id))
        .forEach(() => {});

      if (!rows.length) {
        rows.push({
          key: `sprint-empty-${sprint.id}`,
          sprint: `${sprint.name} (${sprint.status})`,
          story: '-',
          task: 'No stories or tasks',
          taskId: null,
          status: '',
          priority: '',
          points: '-',
          assignees: '-',
          deadline: '-',
        });
      }

      return rows;
    });
  }, [filteredTasks, sprints, stories]);

  const orphanTaskRows = useMemo(() => {
    return filteredTasks
      .filter((task) => task.story_id)
      .filter((task) => !storiesById.has(task.story_id))
      .map((task) => {
        const sprint = task.sprint_id ? sprintsById.get(task.sprint_id) : null;
        return buildTaskRow(task, null, sprint || null, 'orphan-task');
      });
  }, [filteredTasks, storiesById, sprintsById]);

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;
  }

  return (
    <div className="px-4 py-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Link to={`/projects/${pk}`} className="hover:text-indigo-700">{project?.name}</Link>
            <span>/</span>
            <Link to={`/projects/${pk}/scrum`} className="hover:text-indigo-700">Scrum Board</Link>
            <span>/</span>
            <span className="font-medium text-slate-700">ScrumBoard 2</span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/projects/${pk}/kanban`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Kanban
            </Link>
            <Link to={`/projects/${pk}/scrum`} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
              Scrum Board
            </Link>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[minmax(0,1fr)_220px_220px]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Project</p>
            <p className="mt-1 text-lg font-semibold text-slate-900">{project?.name}</p>
            <p className="text-sm text-slate-600">
              Table view for backlog items, sprints, stories, and tasks
            </p>
          </div>
          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Status filter
            </span>
            <select
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="">All statuses</option>
              {statuses.map((status) => (
                <option key={status.id} value={status.slug}>
                  {status.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Assignee filter
            </span>
            <select
              value={filterAssignee}
              onChange={(event) => setFilterAssignee(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              <option value="">All members</option>
              {allMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.username}
                </option>
              ))}
            </select>
          </label>
        </div>

        <TableSection
          title="Backlog Items"
          subtitle="Items not yet placed into a sprint."
          rows={backlogRows}
          pk={pk}
          emptyLabel="No backlog items match the current filters."
        />

        <TableSection
          title="Sprints"
          subtitle="Sprint contents displayed as story and task rows."
          rows={sprintRows}
          pk={pk}
          emptyLabel="No sprints available."
        />

        {orphanTaskRows.length > 0 && (
          <TableSection
            title="Orphan Tasks"
            subtitle="Tasks referencing missing stories."
            rows={orphanTaskRows}
            pk={pk}
            emptyLabel="No orphan tasks."
          />
        )}
      </div>
    </div>
  );
}
