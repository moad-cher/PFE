import { useEffect, useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Link, useParams } from 'react-router-dom';
import {
  formatDate,
  createSprint,
  getProject,
  getProjectStatuses,
  getSprints,
  getStories,
  updateSprint,
  updateStory,
  updateTask,
} from '../../api';
import Spinner from '../../components/ui/Spinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { isProjectManager } from '../../utils/permissions';
import TaskNew from './TaskNew';
import StoryNew from './StoryNew';

function SprintTreeItem({ sprint, expanded, active, onToggle, onSelect, storiesInSprint, tasksByStory }) {
  const badgeClass =
    sprint.status === 'active'
      ? 'bg-emerald-100 text-emerald-700'
      : sprint.status === 'completed'
      ? 'bg-slate-200 text-slate-600'
      : 'bg-blue-100 text-blue-700';

  return (
    <div className="mb-1.5">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-colors ${active ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-600 hover:bg-white/80'}`}
      >
        <span className={`text-[10px] transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
        <span
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          className="truncate text-sm font-medium"
        >
          {sprint.name}
        </span>
        <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full uppercase font-bold ${badgeClass}`}>
          {sprint.status}
        </span>
      </button>

      {expanded && (
        <div className="pl-8 mt-1.5 space-y-1">
          {storiesInSprint.length === 0 ? (
            <div className="text-[11px] text-slate-400 px-1 py-1">No stories</div>
          ) : (
            storiesInSprint.map((story) => (
              <div key={story.id} className="text-[12px] text-slate-500 flex items-center gap-2 px-1 py-1">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span className="truncate flex-1">{story.title}</span>
                <span className="text-[10px] text-slate-400">{(tasksByStory[story.id] || []).length}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function StoryCard({ story, taskCount, doneCount, onAddTask, dragHandleProps, isDragging }) {
  const progress = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0;
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-sm transition-all ${isDragging ? 'shadow-xl ring-2 ring-indigo-300 border-indigo-300' : 'border-slate-200 hover:border-slate-300'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-900 line-clamp-2">{story.title}</h4>
          <div className="mt-1 text-[11px] text-slate-500 font-medium">
            {story.points || 0} pts • {taskCount} tasks
          </div>
        </div>
        <button
          type="button"
          onClick={() => onAddTask(story.id)}
          className="text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
        >
          + Task
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 bg-slate-200 rounded-full overflow-hidden">
          <div className="h-full bg-indigo-500" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-[10px] font-bold text-slate-500">{progress}%</span>
      </div>

      <div {...dragHandleProps} className="mt-3 text-[10px] text-slate-400 font-bold uppercase tracking-widest cursor-grab active:cursor-grabbing">
        Drag Story
      </div>
    </div>
  );
}

export default function ScrumBoard2() {
  const { pk } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [stories, setStories] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('backlog');
  const [selectedSprintId, setSelectedSprintId] = useState(null);
  const [expandedSprintIds, setExpandedSprintIds] = useState(new Set());
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [sprintForm, setSprintForm] = useState({ name: '', start_date: '', end_date: '', goal: '' });
  const [minStartDate, setMinStartDate] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalStoryId, setTaskModalStoryId] = useState('');
  const [showStoryModal, setShowStoryModal] = useState(false);

  const canManage = isProjectManager(user, project);

  const fetchData = () => {
    Promise.all([getProject(pk), getProjectStatuses(pk), getSprints(pk), getStories(pk)])
      .then(([projectRes, statusesRes, sprintsRes, storiesRes]) => {
        const sortedSprints = [...sprintsRes.data].sort((left, right) => {
          const leftDate = left.start_date ? new Date(left.start_date).getTime() : 0;
          const rightDate = right.start_date ? new Date(right.start_date).getTime() : 0;
          return leftDate - rightDate;
        });

        setProject(projectRes.data);
        setStatuses(statusesRes.data);
        setSprints(sortedSprints);
        setStories(storiesRes.data);

        if (sortedSprints.length > 0) {
          setExpandedSprintIds((prev) => {
            const next = new Set(prev);
            sortedSprints.forEach((s) => next.add(s.id));
            return next;
          });
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [pk]);

  useEffect(() => {
    if (view !== 'sprint') return;
    const selectedExists = sprints.some((s) => s.id === selectedSprintId);
    if (selectedExists) return;

    const active = sprints.find((s) => s.status === 'active');
    if (active) {
      setSelectedSprintId(active.id);
      return;
    }
    if (sprints[0]) {
      setSelectedSprintId(sprints[0].id);
      return;
    }
    setView('backlog');
  }, [sprints, view, selectedSprintId]);

  const openTaskModal = (storyId = '') => {
    setTaskModalStoryId(storyId);
    setShowTaskModal(true);
  };

  const openStoryModal = () => {
    setShowStoryModal(true);
  };

  const openSprintModal = () => {
    let defaultStart = new Date().toISOString().split('T')[0];
    if (sprints.length > 0) {
      const lastSprint = sprints[sprints.length - 1];
      const d = new Date(lastSprint.end_date);
      d.setDate(d.getDate() + 1);
      defaultStart = d.toISOString().split('T')[0];
    }

    let defaultEnd = '';
    if (project?.config?.sprint_duration_days) {
      const d = new Date(defaultStart);
      d.setDate(d.getDate() + project.config.sprint_duration_days);
      defaultEnd = d.toISOString().split('T')[0];
    }

    setMinStartDate(defaultStart);
    setSprintForm({
      name: `Sprint ${sprints.length + 1}`,
      start_date: defaultStart,
      end_date: defaultEnd,
      goal: '',
    });
    setShowSprintModal(true);
  };

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    try {
      const res = await createSprint(pk, sprintForm);
      const next = [...sprints, res.data].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
      setSprints(next);
      setExpandedSprintIds((prev) => new Set(prev).add(res.data.id));
      setShowSprintModal(false);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create sprint');
    }
  };

  const handleUpdateSprintStatus = async (sprintId, newStatus) => {
    try {
      const res = await updateSprint(pk, sprintId, { status: newStatus });
      setSprints((prev) => prev.map((s) => (s.id === sprintId ? res.data : s)));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update sprint');
    }
  };

  const handleCompleteSprint = async (sprintId) => {
    try {
      await updateSprint(pk, sprintId, { status: 'completed' });

      const idx = sprints.findIndex((s) => s.id === sprintId);
      const nextSprint = sprints[idx + 1];
      const destSprintId = nextSprint ? nextSprint.id : null;

      const incompleteStories = stories.filter((s) => s.sprint_id === sprintId && s.status !== 'done');
      if (incompleteStories.length > 0) {
        await Promise.all(incompleteStories.map((s) => updateStory(pk, s.id, { sprint_id: destSprintId })));
      }

      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to complete sprint');
      fetchData();
    }
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    if (type === 'story') {
      const storyId = parseInt(draggableId.replace('story-', ''));
      const destSprintId = destination.droppableId === 'backlog-stories'
        ? null
        : parseInt(destination.droppableId.replace('sprint-', ''));

      const updatedStories = stories.map((s) => (s.id === storyId ? { ...s, sprint_id: destSprintId } : s));
      setStories(updatedStories);

      try {
        await updateStory(pk, storyId, { sprint_id: destSprintId });
      } catch (err) {
        alert(err.response?.data?.detail || 'Failed to move story');
        fetchData();
      }
      return;
    }

    if (type === 'task') {
      const taskId = parseInt(draggableId.replace('task-', ''));
      const nextStatus = destination.droppableId.replace('task-status-', '');

      setProject((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          tasks: (prev.tasks || []).map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t)),
        };
      });

      try {
        await updateTask(pk, taskId, { status: nextStatus });
      } catch (err) {
        alert(err.response?.data?.detail || 'Failed to move task');
        fetchData();
      }
    }
  };

  const allMembers = useMemo(() => {
    if (!project) return [];
    return [project.manager, ...(project.members || [])]
      .filter(Boolean)
      .filter((value, index, items) => items.findIndex((candidate) => candidate.id === value.id) === index);
  }, [project]);

  const allTasks = project?.tasks || [];

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      if (filterStatus && task.status !== filterStatus) return false;
      if (filterAssignee && !task.assigned_to?.some((assignee) => assignee.id === Number(filterAssignee))) {
        return false;
      }
      return true;
    });
  }, [allTasks, filterStatus, filterAssignee]);

  const tasksByStory = useMemo(() => {
    const byStory = {};
    filteredTasks.forEach((task) => {
      if (!task.story_id) return;
      if (!byStory[task.story_id]) byStory[task.story_id] = [];
      byStory[task.story_id].push(task);
    });
    return byStory;
  }, [filteredTasks]);

  const allTasksByStory = useMemo(() => {
    const byStory = {};
    allTasks.forEach((task) => {
      if (!task.story_id) return;
      if (!byStory[task.story_id]) byStory[task.story_id] = [];
      byStory[task.story_id].push(task);
    });
    return byStory;
  }, [allTasks]);

  const storiesBySprint = useMemo(() => {
    const bySprint = {};
    sprints.forEach((sprint) => {
      bySprint[sprint.id] = [];
    });
    stories.forEach((story) => {
      if (story.sprint_id && bySprint[story.sprint_id]) {
        bySprint[story.sprint_id].push(story);
      }
    });
    return bySprint;
  }, [stories, sprints]);

  const backlogStories = useMemo(() => stories.filter((story) => !story.sprint_id), [stories]);

  const backlogTasksNoStory = useMemo(() => {
    return filteredTasks.filter((task) => !task.story_id);
  }, [filteredTasks]);

  const selectedSprint = useMemo(
    () => sprints.find((s) => s.id === selectedSprintId) || null,
    [sprints, selectedSprintId]
  );

  const selectedSprintStories = useMemo(() => {
    if (!selectedSprint) return [];
    return storiesBySprint[selectedSprint.id] || [];
  }, [selectedSprint, storiesBySprint]);

  const selectedSprintStoryIds = useMemo(() => {
    return new Set(selectedSprintStories.map((story) => story.id));
  }, [selectedSprintStories]);

  const selectedSprintTasks = useMemo(() => {
    return filteredTasks.filter((task) => task.story_id && selectedSprintStoryIds.has(task.story_id));
  }, [filteredTasks, selectedSprintStoryIds]);

  const sprintTaskColumns = useMemo(() => {
    return {
      todo: selectedSprintTasks.filter((task) => task.status === 'todo'),
      'in-progress': selectedSprintTasks.filter((task) => task.status === 'in-progress'),
      done: selectedSprintTasks.filter((task) => task.status === 'done'),
    };
  }, [selectedSprintTasks]);

  const lastSprint = sprints[sprints.length - 1];
  const isLastSprintDraft = lastSprint?.status === 'draft';

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center"><Spinner size="lg" /></div>;
  }

  const sidebarTitle = project?.name || 'Project';
  const contentTitle = view === 'backlog' ? 'Backlog Planning Board' : selectedSprint?.name || 'Sprint';
  const contentSubtitle = view === 'backlog'
    ? `${backlogStories.length} stories • ${backlogTasksNoStory.length} standalone tasks`
    : selectedSprint
    ? `${formatDate(selectedSprint.start_date)} — ${formatDate(selectedSprint.end_date)}`
    : '';

  const selectedSprintTotalTasks = selectedSprintTasks.length;
  const selectedSprintDoneTasks = sprintTaskColumns.done.length;
  const selectedSprintProgress = selectedSprintTotalTasks > 0
    ? Math.round((selectedSprintDoneTasks / selectedSprintTotalTasks) * 100)
    : 0;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="px-4 py-6">
        <div className="mx-auto max-w-[1280px] rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden min-h-[760px]">
          <div className="grid lg:grid-cols-[280px_1fr] min-h-[760px]">
            <aside className="border-r border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-center justify-between px-2 py-1 mb-2">
                <div className="flex flex-col">
                  <Link to={`/projects/${pk}`} className="text-sm font-semibold text-slate-800 hover:text-indigo-700 truncate">
                    {sidebarTitle}
                  </Link>
                  <Link to={`/projects/${pk}/scrum3`} className="text-[10px] text-pink-500 font-bold hover:underline">
                    Switch to v3 ✨
                  </Link>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={openSprintModal}
                    className="text-slate-500 hover:text-slate-900 text-lg leading-none"
                    title="Plan sprint"
                  >
                    +
                  </button>
                )}
              </div>

              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-1">Sprints</div>
              <div className="mb-3">
                {sprints.map((sprint) => (
                  <SprintTreeItem
                    key={sprint.id}
                    sprint={sprint}
                    expanded={expandedSprintIds.has(sprint.id)}
                    active={view === 'sprint' && selectedSprintId === sprint.id}
                    storiesInSprint={storiesBySprint[sprint.id] || []}
                    tasksByStory={tasksByStory}
                    onToggle={() => {
                      setExpandedSprintIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(sprint.id)) next.delete(sprint.id);
                        else next.add(sprint.id);
                        return next;
                      });
                    }}
                    onSelect={() => {
                      setView('sprint');
                      setSelectedSprintId(sprint.id);
                    }}
                  />
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setView('backlog')}
                  className={`w-full rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors ${view === 'backlog' ? 'bg-white border border-slate-200 text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white/80'}`}
                >
                  <span className="mr-2">📋</span>
                  Backlog
                  <span className="ml-2 text-[11px] text-slate-400">{backlogStories.length}</span>
                </button>
              </div>
            </aside>

            <main className="flex flex-col">
              <div className="border-b border-slate-200 px-5 py-4 flex flex-wrap items-center gap-3">
                <div>
                  <h1 className="text-base font-bold text-slate-900">{contentTitle}</h1>
                  <p className="text-xs text-slate-500 mt-0.5">{contentSubtitle}</p>
                </div>

                <div className="ml-auto flex flex-wrap gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
                  >
                    <option value="">All statuses</option>
                    {statuses.map((status) => (
                      <option key={status.id} value={status.slug}>{status.name}</option>
                    ))}
                  </select>

                  <select
                    value={filterAssignee}
                    onChange={(e) => setFilterAssignee(e.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm"
                  >
                    <option value="">All members</option>
                    {allMembers.map((member) => (
                      <option key={member.id} value={member.id}>{member.username}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={openStoryModal}
                    className="rounded-lg border border-indigo-200 text-indigo-700 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-indigo-50"
                  >
                    + Story
                  </button>

                  <button
                    type="button"
                    onClick={() => openTaskModal()}
                    className="rounded-lg bg-indigo-600 text-white px-3 py-1.5 text-sm font-semibold hover:bg-indigo-700"
                  >
                    + Task
                  </button>

                  {canManage && !isLastSprintDraft && (
                    <button
                      type="button"
                      onClick={openSprintModal}
                      className="rounded-lg border border-slate-300 text-slate-700 bg-white px-3 py-1.5 text-sm font-semibold hover:bg-slate-50"
                    >
                      Plan Next Sprint
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto p-5 bg-slate-50/40">
                {view === 'backlog' ? (
                  <div className="space-y-6">
                    <div className="grid xl:grid-cols-3 gap-4">
                      <div className="xl:col-span-1 rounded-2xl border border-slate-200 bg-white">
                        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                          <h3 className="text-sm font-bold text-slate-800">Backlog Stories</h3>
                          <span className="text-[11px] text-slate-500">{backlogStories.length}</span>
                        </div>
                        <Droppable droppableId="backlog-stories" type="story">
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              className={`p-3 min-h-[220px] space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50/60' : ''}`}
                            >
                              {backlogStories.map((story, index) => {
                                const storyTasks = allTasksByStory[story.id] || [];
                                const doneCount = storyTasks.filter((t) => t.status === 'done').length;
                                return (
                                  <Draggable key={story.id} draggableId={`story-${story.id}`} index={index}>
                                    {(dragProvided, dragSnapshot) => (
                                      <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} style={dragProvided.draggableProps.style}>
                                        <StoryCard
                                          story={story}
                                          taskCount={storyTasks.length}
                                          doneCount={doneCount}
                                          onAddTask={openTaskModal}
                                          dragHandleProps={dragProvided.dragHandleProps}
                                          isDragging={dragSnapshot.isDragging}
                                        />
                                      </div>
                                    )}
                                  </Draggable>
                                );
                              })}
                              {provided.placeholder}
                              {backlogStories.length === 0 && (
                                <div className="text-center py-10 text-sm text-slate-400 italic">No backlog stories</div>
                              )}
                            </div>
                          )}
                        </Droppable>
                      </div>

                      <div className="xl:col-span-2 rounded-2xl border border-slate-200 bg-white">
                        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                          <h3 className="text-sm font-bold text-slate-800">Sprint Lanes</h3>
                          <span className="text-[11px] text-slate-500">Drag stories from backlog into sprint planning</span>
                        </div>

                        <div className="p-3 grid md:grid-cols-2 gap-3">
                          {sprints.map((sprint) => {
                            const sprintStories = storiesBySprint[sprint.id] || [];
                            const isCompleted = sprint.status === 'completed';
                            return (
                              <div key={sprint.id} className="rounded-xl border border-slate-200 bg-slate-50/50 overflow-hidden">
                                <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                                  <div>
                                    <div className="text-sm font-bold text-slate-800">{sprint.name}</div>
                                    <div className="text-[11px] text-slate-500">{formatDate(sprint.start_date)} — {formatDate(sprint.end_date)}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {canManage && sprint.status === 'draft' && (
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateSprintStatus(sprint.id, 'active')}
                                        className="text-[10px] font-bold px-2 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
                                      >
                                        Start
                                      </button>
                                    )}
                                    {canManage && sprint.status === 'active' && (
                                      <button
                                        type="button"
                                        onClick={() => handleCompleteSprint(sprint.id)}
                                        className="text-[10px] font-bold px-2 py-1 rounded-md bg-slate-800 text-white hover:bg-black"
                                      >
                                        Complete
                                      </button>
                                    )}
                                    <span className="text-[10px] uppercase font-bold text-slate-500">{sprint.status}</span>
                                  </div>
                                </div>

                                <Droppable droppableId={`sprint-${sprint.id}`} type="story" isDropDisabled={isCompleted}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                      className={`p-3 min-h-[170px] space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50/60' : ''}`}
                                    >
                                      {sprintStories.map((story, index) => {
                                        const storyTasks = allTasksByStory[story.id] || [];
                                        const doneCount = storyTasks.filter((t) => t.status === 'done').length;
                                        return (
                                          <Draggable
                                            key={story.id}
                                            draggableId={`story-${story.id}`}
                                            index={index}
                                            isDragDisabled={isCompleted}
                                          >
                                            {(dragProvided, dragSnapshot) => (
                                              <div ref={dragProvided.innerRef} {...dragProvided.draggableProps} style={dragProvided.draggableProps.style}>
                                                <StoryCard
                                                  story={story}
                                                  taskCount={storyTasks.length}
                                                  doneCount={doneCount}
                                                  onAddTask={openTaskModal}
                                                  dragHandleProps={dragProvided.dragHandleProps}
                                                  isDragging={dragSnapshot.isDragging}
                                                />
                                              </div>
                                            )}
                                          </Draggable>
                                        );
                                      })}
                                      {provided.placeholder}
                                      {sprintStories.length === 0 && (
                                        <div className="text-center py-8 text-xs text-slate-400 italic">No stories in this sprint</div>
                                      )}
                                    </div>
                                  )}
                                </Droppable>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-800">Standalone Backlog Tasks</h3>
                        <span className="text-[11px] text-slate-500">{backlogTasksNoStory.length}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                          <thead className="text-[10px] uppercase text-slate-500 bg-slate-50">
                            <tr>
                              <th className="px-4 py-2 font-bold">Task</th>
                              <th className="px-4 py-2 font-bold">Status</th>
                              <th className="px-4 py-2 font-bold">Assignees</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {backlogTasksNoStory.length === 0 ? (
                              <tr>
                                <td colSpan={3} className="px-4 py-5 text-center text-slate-400 italic">No standalone tasks</td>
                              </tr>
                            ) : (
                              backlogTasksNoStory.map((task) => (
                                <tr key={task.id} className="hover:bg-slate-50/70">
                                  <td className="px-4 py-2">
                                    <Link to={`/projects/${pk}/tasks/${task.id}`} className="font-medium text-slate-700 hover:text-indigo-700">
                                      {task.title}
                                    </Link>
                                  </td>
                                  <td className="px-4 py-2"><StatusBadge status={task.status} /></td>
                                  <td className="px-4 py-2 text-xs text-slate-500">
                                    {task.assigned_to?.length
                                      ? task.assigned_to.map((u) => u.username).join(', ')
                                      : 'Unassigned'}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedSprint ? (
                      <>
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <h2 className="text-lg font-bold text-slate-900">{selectedSprint.name}</h2>
                                <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                                  {selectedSprint.status}
                                </span>
                              </div>
                              {selectedSprint.goal && <p className="mt-1 text-sm text-slate-600">{selectedSprint.goal}</p>}
                            </div>

                            <div className="text-right min-w-[180px]">
                              <div className="text-xs text-slate-500">Progress</div>
                              <div className="mt-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500" style={{ width: `${selectedSprintProgress}%` }} />
                              </div>
                              <div className="mt-1 text-xs font-bold text-slate-700">
                                {selectedSprintDoneTasks}/{selectedSprintTotalTasks} done ({selectedSprintProgress}%)
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid lg:grid-cols-3 gap-4">
                          {['todo', 'in-progress', 'done'].map((columnKey) => {
                            const label = columnKey === 'todo' ? 'To Do' : columnKey === 'in-progress' ? 'In Progress' : 'Done';
                            const tasks = sprintTaskColumns[columnKey];
                            const isCompletedSprint = selectedSprint.status === 'completed';
                            return (
                              <div key={columnKey} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                                  <h3 className="text-sm font-bold text-slate-700">{label}</h3>
                                  <span className="text-[11px] text-slate-500">{tasks.length}</span>
                                </div>

                                <Droppable
                                  droppableId={`task-status-${columnKey}`}
                                  type="task"
                                  isDropDisabled={isCompletedSprint}
                                >
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.droppableProps}
                                      className={`p-3 min-h-[260px] space-y-2 transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50/60' : 'bg-slate-50/40'}`}
                                    >
                                      {tasks.map((task, index) => {
                                        const story = stories.find((s) => s.id === task.story_id);
                                        return (
                                          <Draggable
                                            key={task.id}
                                            draggableId={`task-${task.id}`}
                                            index={index}
                                            isDragDisabled={isCompletedSprint}
                                          >
                                            {(dragProvided, dragSnapshot) => (
                                              <div
                                                ref={dragProvided.innerRef}
                                                {...dragProvided.draggableProps}
                                                {...dragProvided.dragHandleProps}
                                                style={dragProvided.draggableProps.style}
                                                className={`rounded-xl border bg-white p-3 transition-all ${dragSnapshot.isDragging ? 'shadow-lg border-indigo-300 ring-1 ring-indigo-300' : 'border-slate-200 hover:border-slate-300'}`}
                                              >
                                                <Link to={`/projects/${pk}/tasks/${task.id}`} className="text-sm font-semibold text-slate-800 hover:text-indigo-700 line-clamp-2">
                                                  {task.title}
                                                </Link>
                                                <div className="mt-2 flex items-center justify-between gap-2">
                                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold uppercase">
                                                    {story?.title || 'No Story'}
                                                  </span>
                                                  <span className="text-[11px] text-slate-500">{task.points || 0} pts</span>
                                                </div>
                                              </div>
                                            )}
                                          </Draggable>
                                        );
                                      })}
                                      {provided.placeholder}
                                      {tasks.length === 0 && (
                                        <div className="text-center py-8 text-xs text-slate-400 italic">No tasks</div>
                                      )}
                                    </div>
                                  )}
                                </Droppable>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    ) : (
                      <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center text-slate-400">
                        Select a sprint from the left panel.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>

        <TaskNew
          isOpen={showTaskModal}
          onClose={() => setShowTaskModal(false)}
          pk={pk}
          initialStoryId={taskModalStoryId}
          onSuccess={fetchData}
        />

        <StoryNew
          isOpen={showStoryModal}
          onClose={() => setShowStoryModal(false)}
          pk={pk}
          onSuccess={fetchData}
        />

        {showSprintModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
              <h3 className="text-2xl font-black text-slate-900 mb-6 tracking-tight">Setup New Sprint</h3>
              <form onSubmit={handleCreateSprint} className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Sprint Identifier</label>
                  <input
                    required
                    type="text"
                    value={sprintForm.name}
                    onChange={(e) => setSprintForm({ ...sprintForm, name: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. Q2 - Performance Optimization"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Kickoff</label>
                    <input
                      required
                      type="date"
                      value={sprintForm.start_date}
                      min={minStartDate}
                      onChange={(e) => {
                        const start = e.target.value;
                        let end = sprintForm.end_date;
                        if (start && project?.config?.sprint_duration_days) {
                          const d = new Date(start);
                          d.setDate(d.getDate() + project.config.sprint_duration_days);
                          end = d.toISOString().split('T')[0];
                        }
                        setSprintForm({ ...sprintForm, start_date: start, end_date: end });
                      }}
                      className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">End Date</label>
                    <div className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm text-slate-700">
                      {sprintForm.end_date ? formatDate(sprintForm.end_date) : '—'}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Core Objective</label>
                  <textarea
                    rows="3"
                    value={sprintForm.goal}
                    onChange={(e) => setSprintForm({ ...sprintForm, goal: e.target.value })}
                    className="w-full bg-slate-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="What's the main goal?"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSprintModal(false)}
                    className="px-6 py-3 text-sm font-bold text-slate-500 hover:text-slate-900"
                  >
                    Dismiss
                  </button>
                  <button
                    type="submit"
                    className="px-8 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                  >
                    Initialize Sprint
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DragDropContext>
  );
}
