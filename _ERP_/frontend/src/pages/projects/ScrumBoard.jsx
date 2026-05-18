import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getProject, getProjectStatuses, getSprints, getStories, createSprint, updateSprint, updateStory, deleteStory, formatDate, deleteTask } from '../../api';
import Spinner from '../../components/shared/ui/Spinner';
import StatusBadge from '../../components/shared/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { isProjectManager } from '../../auth/permissions';
import TaskEdit from '../../components/features/projects/TaskEdit';
import StoryNew from '../../components/features/projects/StoryNew';
import SprintEditModal from '../../components/features/projects/SprintEditModal';

export default function ScrumBoard({ project: propProject, isTab, onRefresh }) {
  const { pk } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(propProject || null);
  const [statuses, setStatuses] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [stories, setStories] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [loading, setLoading] = useState(!propProject);
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [sprintForm, setSprintForm] = useState({ name: '', start_date: '', end_date: '', goal: '' });
  const [minStartDate, setMinStartDate] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalStoryId, setTaskModalStoryId] = useState('');
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showSprintEditModal, setShowSprintEditModal] = useState(false);
  const [editingSprint, setEditingSprint] = useState(null);

  const fetchData = () => {
    if (!propProject) setLoading(true);
    Promise.all([propProject ? Promise.resolve({ data: propProject }) : getProject(pk), getProjectStatuses(pk), getSprints(pk), getStories(pk)])
      .then(([p, s, spr, sto]) => {
        setProject(p.data);
        setStatuses(s.data);
        setSprints(spr.data.sort((a, b) => new Date(b.start_date) - new Date(a.start_date)));
        setStories(sto.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [pk, propProject]);

  const openTaskModal = (storyId = '', taskId = null) => {
    setTaskModalStoryId(storyId);
    setEditingTaskId(taskId);
    setShowTaskModal(true);
  };

  const openStoryModal = () => {
    setShowStoryModal(true);
  };

  const openSprintModal = () => {
    const today = new Date().toISOString().split('T')[0];
    let defaultStart = today;
    if (sprints.length > 0) {
      const lastSprint = sprints[0];
      const d = new Date(lastSprint.end_date);
      d.setDate(d.getDate() + 1);
      defaultStart = d.toISOString().split('T')[0];
    }

    const duration = project?.config?.sprint_duration_days || 14;
    const d = new Date(defaultStart);
    d.setDate(d.getDate() + duration);
    const defaultEnd = d.toISOString().split('T')[0];

    setMinStartDate(defaultStart);
    setSprintForm({
      name: `Sprint ${sprints.length + 1}`,
      start_date: defaultStart,
      end_date: defaultEnd,
      goal: ''
    });
    setShowSprintModal(true);
    };
  const handleCreateSprint = async (e) => {
    e.preventDefault();
    try {
      const res = await createSprint(pk, sprintForm);
      setSprints([res.data, ...sprints].sort((a, b) => new Date(b.start_date) - new Date(a.start_date)));
      setShowSprintModal(false);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : (typeof detail === 'object' ? JSON.stringify(detail) : 'Failed to create sprint');
      alert(message);
    }
  };

  const [updatingSprintId, setUpdatingSprintId] = useState(null);

  const handleUpdateSprintStatus = async (sprintId, newStatus) => {
    setUpdatingSprintId(sprintId);
    try {
      const res = await updateSprint(pk, sprintId, { status: newStatus });
      setSprints(sprints.map(s => s.id === sprintId ? res.data : s));
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : (typeof detail === 'object' ? JSON.stringify(detail) : 'Failed to update sprint');
      alert(message);
    } finally {
      setUpdatingSprintId(null);
    }
  };

  const handleCompleteSprint = async (sprintId) => {
    try {
      await updateSprint(pk, sprintId, { status: 'completed' });
      fetchData();
    } catch (err) {
      const detail = err.response?.data?.detail;
      const message = typeof detail === 'string' ? detail : (typeof detail === 'object' ? JSON.stringify(detail) : 'Failed to complete sprint');
      alert(message);
      fetchData();
    }
  };

  const handleUpdateStoryLocally = (storyId, field, value) => {
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, [field]: value } : s));
  };

  const handleSaveStoryField = async (storyId, field, value) => {
    try {
      await updateStory(pk, storyId, { [field]: value });
    } catch (err) {
      console.error('Failed to update story field', err);
      fetchData(); // Rollback on error
    }
  };

  const handleDeleteStory = async (storyId) => {
    if (!window.confirm('Delete this story and all its tasks?')) return;
    try {
      await deleteStory(pk, storyId);
      fetchData();
    } catch (err) {
      alert('Failed to delete story');
    }
  };

  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    const storyId = parseInt(draggableId.replace('story-', ''));
    const destSprintId = destination.droppableId === 'backlog' ? null : parseInt(destination.droppableId);

    const updatedStories = stories.map(s => 
      s.id === storyId ? { ...s, sprint_id: destSprintId } : s
    );
    setStories(updatedStories);

    try {
      await updateStory(pk, storyId, { sprint_id: destSprintId });
    } catch (err) {
      alert('Failed to move story');
      fetchData();
    }
  };
  
  const allMembers = useMemo(() => {
    if (!project) return [];
    const seen = new Set();
    return [project.manager, ...(project.members || [])]
      .filter(Boolean)
      .filter(member => {
        if (seen.has(member.id)) return false;
        seen.add(member.id);
        return true;
      });
  }, [project]);

  const tasksByStory = useMemo(() => {
    const mapping = {};
    project?.tasks?.forEach(t => {
      if (filterStatus && t.status !== filterStatus) return;
      if (filterAssignee && !t.assigned_to?.some(a => a.id === parseInt(filterAssignee))) return;

      if (t.story_id) {
        if (!mapping[t.story_id]) mapping[t.story_id] = [];
        mapping[t.story_id].push(t);
      }
    });
    return mapping;
  }, [project?.tasks, filterStatus, filterAssignee]);

  const { storiesBySprint, backlogStories } = useMemo(() => {
    const sprMapping = {};
    sprints.forEach(s => sprMapping[s.id] = []);
    const backlog = [];
    stories.forEach(s => {
      if (s.sprint_id) {
        if (!sprMapping[s.sprint_id]) sprMapping[s.sprint_id] = [];
        sprMapping[s.sprint_id].push(s);
      } else {
        backlog.push(s);
      }
    });
    return { storiesBySprint: sprMapping, backlogStories: backlog };
  }, [sprints, stories]);

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await deleteTask(pk, taskId);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete task');
    }
  };

  const renderTaskTable = (taskList, isReadOnly = false) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-[10px] text-gray-400 uppercase bg-gray-50/30">
          <tr>
            <th className="px-4 py-1 font-bold">Task</th>
            {!isReadOnly && <th className="px-4 py-1 font-bold">Status</th>}
            <th className="px-4 py-1 font-bold text-center">Pts</th>
            <th className="px-4 py-1 font-bold">Assignees</th>
            {canManage && !isReadOnly && <th className="px-4 py-1 font-bold text-right">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100/50">
          {taskList.length === 0 ? (
            <tr>
              <td colSpan={canManage && !isReadOnly ? 5 : isReadOnly ? 3 : 4} className="px-4 py-3 text-center text-gray-400 italic text-xs">No tasks</td>
            </tr>
          ) : (
            taskList.map(t => (
              <tr key={t.id} className={`hover:bg-gray-50/50 transition-colors group ${t.is_blocked ? 'bg-amber-50/30' : ''}`}>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    {t.is_blocked && (
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)] animate-pulse" title={`Blocked: ${t.blocker_reason}`}></span>
                    )}
                    <button 
                      onClick={() => openTaskModal(t.story_id, t.id)}
                      className={`font-medium text-left hover:text-purple-600 line-clamp-1 ${t.is_blocked ? 'text-amber-900' : 'text-gray-700'}`}
                    >
                      {t.title}
                    </button>
                  </div>
                </td>
                                {!isReadOnly && (
                  <td className="px-4 py-2">
                    {t.is_blocked ? (
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase tracking-tighter border border-amber-200">Blocked</span>
                    ) : (
                      <StatusBadge 
                        status={t.status} 
                        color={statuses.find(s => s.slug === t.status)?.color}
                      />
                    )}
                  </td>
                )}
                <td className="px-4 py-2 text-center text-gray-500 text-xs">{t.points}</td>
                <td className="px-4 py-2">
                  <div className="flex -space-x-1.5">
                    {t.assigned_to?.map(u => (
                      <div key={u.id} title={u.username} className="w-5 h-5 rounded-full bg-purple-50 border border-white flex items-center justify-center text-[8px] font-bold text-purple-600">
                        {u.username[0].toUpperCase()}
                      </div>
                    ))}
                  </div>
                </td>
                {canManage && !isReadOnly && (
                  <td className="px-4 py-2 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openTaskModal(t.story_id, t.id)}
                        className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Edit Task"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDeleteTask(t.id)}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Task"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderStory = (story, index, isDragDisabled = false, isReadOnly = false) => {
    const storyTasks = tasksByStory[story.id] || [];
    const totalTasks = storyTasks.length;
    const doneTasks = storyTasks.filter(t => t.status === 'done').length;
    const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    return (
      <Draggable key={story.id} draggableId={`story-${story.id}`} index={index} isDragDisabled={isDragDisabled}>
        {(provided, snapshot) => (
          <div 
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            className={`mb-4 bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all ${snapshot.isDragging ? 'shadow-xl ring-2 ring-purple-500 z-50' : ''} ${isDragDisabled ? 'opacity-80' : ''}`}
            style={provided.draggableProps.style}
          >
            <div className="px-4 py-3 bg-gray-50/50 flex items-center justify-between border-b border-gray-100 group/story">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <input 
                    className={`text-sm font-bold bg-transparent border-none rounded px-1 py-0.5 w-full outline-none transition-all ${canManage && !isReadOnly ? 'hover:bg-white/80 focus:bg-white focus:ring-1 focus:ring-purple-300' : 'cursor-default text-gray-800'}`}
                    value={story.title}
                    readOnly={!canManage || isReadOnly}
                    onChange={e => handleUpdateStoryLocally(story.id, 'title', e.target.value)}
                    onBlur={e => handleSaveStoryField(story.id, 'title', e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                    placeholder="Story Title"
                  />
                  <div className="flex items-center gap-2 mt-0.5 ml-1">
                    <div className="flex items-center gap-0.5">
                      <input 
                        type="number"
                        className={`text-[10px] font-bold bg-transparent border-none rounded px-1 py-0.5 w-10 outline-none transition-all ${canManage && !isReadOnly ? 'hover:bg-white/80 focus:bg-white focus:ring-1 focus:ring-purple-300' : 'cursor-default text-gray-400'}`}
                        value={story.points}
                        readOnly={!canManage || isReadOnly}
                        onChange={e => handleUpdateStoryLocally(story.id, 'points', parseInt(e.target.value) || 0)}
                        onBlur={e => handleSaveStoryField(story.id, 'points', parseInt(e.target.value) || 0)}
                        onKeyDown={e => e.key === 'Enter' && e.target.blur()}
                      />
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Story Pts</span>
                    </div>
                    <span className="text-[10px] text-gray-300">•</span>
                    <div className="flex items-center gap-1.5">
                       <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-purple-500" style={{ width: `${progress}%` }}></div>
                       </div>
                       <span className="text-[9px] font-bold text-gray-500">{progress}%</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 flex-shrink-0">
                {!isReadOnly && canManage && (
                  <div className="flex items-center gap-0.5 opacity-0 group-hover/story:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleDeleteStory(story.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      title="Delete Story"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                  </div>
                )}
                {!isReadOnly && canManage && (
                  <button
                    onClick={() => openTaskModal(story.id)}
                    className="text-[10px] font-bold text-purple-600 hover:text-purple-800 uppercase tracking-tighter bg-purple-50 px-2.5 py-1.5 rounded-lg transition-all hover:bg-purple-100"
                  >
                    + Task
                  </button>
                )}
              </div>
            </div>
            <div className="p-1">
              {renderTaskTable(storyTasks, isReadOnly)}
            </div>
          </div>
        )}
      </Draggable>
    );
  };

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;

  const canManage = isProjectManager(user, project);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className={`px-4 py-8 ${isTab ? '' : 'max-w-5xl mx-auto'}`}>
        {!isTab && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to={`/projects/${pk}`} className="hover:text-purple-600">← {project?.name}</Link>
            <span>/</span><span className="font-medium text-gray-700">Scrum Roadmap</span>
          </div>
        )}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sprint Timeline</h1>
          </div>
          <div className="flex gap-3">
            {canManage && (
                <button onClick={() => openStoryModal()} className="px-4 py-2 bg-white border border-purple-200 text-purple-700 rounded-xl text-sm font-semibold hover:bg-purple-50 transition-all shadow-sm">
                 New Story
              </button>
            )}
          </div>
        </div>

        <TaskEdit 
          isOpen={showTaskModal} 
          onClose={() => { setShowTaskModal(false); setEditingTaskId(null); }} 
          pk={pk} 
          taskId={editingTaskId}
          initialStoryId={taskModalStoryId}
          onSuccess={fetchData} 
        />

        <StoryNew
          isOpen={showStoryModal}
          onClose={() => setShowStoryModal(false)}
          pk={pk}
          onSuccess={fetchData}
        />

        <div className="flex flex-wrap gap-4 mb-12 items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Filters:</span>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border-none rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-400 bg-white shadow-sm">
            <option value="">All statuses</option>
            {statuses.map(s => <option key={s.id} value={s.slug}>{s.name}</option>)}
          </select>
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
            className="border-none rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-400 bg-white shadow-sm">
            <option value="">All members</option>
            {allMembers.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
          </select>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-8">
          <div className="relative">
            <div className="absolute left-4 md:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 via-gray-200 to-transparent"></div>

            <div className="space-y-16">
            {(() => {
              const latestSprint = sprints[0];
              const isLatestSprintDraft = latestSprint?.status === 'draft';
              const renderedSprints = sprints.map((sprint, idx) => {
                const isActive = sprint.status === 'active';
                const isCompleted = sprint.status === 'completed';
                const sprintStories = storiesBySprint[sprint.id] || [];
                
                return (
                  <div key={sprint.id} className="relative pl-12 md:pl-20 transition-all">
                    <div className={`absolute left-4 md:left-8 -translate-x-1/2 w-4 h-4 rounded-full border-4 bg-white z-10 top-2 transition-all duration-500
                      ${isActive ? 'border-purple-600 scale-125 ring-4 ring-purple-50' : isCompleted ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                    </div>

                    <div className={`bg-white rounded-2xl shadow-sm border transition-all overflow-hidden ${isActive ? 'border-purple-500 border-2 ring-4 ring-purple-50/50 shadow-purple-100 shadow-xl' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className={`px-6 py-4 flex flex-wrap items-center justify-between gap-4 ${isActive ? 'bg-purple-50/30' : isCompleted ? 'bg-gray-50/50' : ''}`}>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-bold text-gray-900">{sprint.name}</h3>
                            {isActive && <span className="px-2 py-0.5 bg-purple-600 text-white text-[10px] font-bold rounded-full uppercase tracking-tighter">Current</span>}
                            {canManage && !isCompleted && (
                              <button 
                                onClick={() => { setEditingSprint(sprint); setShowSprintEditModal(true); }}
                                className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Edit Sprint"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 font-medium">
                            {formatDate(sprint.start_date)} — {formatDate(sprint.end_date)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {canManage && sprint.status === 'draft' && (
                            <button 
                              onClick={() => handleUpdateSprintStatus(sprint.id, 'active')} 
                              disabled={updatingSprintId === sprint.id}
                              className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
                            >
                              {updatingSprintId === sprint.id ? 'Starting...' : 'Start'}
                            </button>
                          )}
                          {canManage && sprint.status === 'active' && (
                            <button onClick={() => handleCompleteSprint(sprint.id)} className="px-3 py-1.5 bg-gray-800 text-white text-xs font-bold rounded-lg hover:bg-black transition-colors">Complete</button>
                          )}
                          <div className="h-8 w-px bg-gray-200 mx-2 hidden sm:block"></div>
                          <div className="text-right hidden sm:block">
                            <div className="text-xs font-bold text-gray-900">{sprintStories.length} Stories</div>
                            <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                               {sprintStories.reduce((acc, s) => acc + s.points, 0)} Story Pts
                            </div>
                          </div>
                        </div>
                      </div>

                      {sprint.goal && (
                        <div className="px-6 py-2 bg-amber-50/30 border-y border-amber-100/50">
                          <p className="text-xs text-amber-800 italic leading-relaxed"><span className="font-bold mr-1">Goal:</span>{sprint.goal}</p>
                        </div>
                      )}

                      {sprint.retrospective && (
                        <div className="px-6 py-2 bg-green-50/30 border-y border-green-100/50">
                          <p className="text-xs text-green-800 italic leading-relaxed"><span className="font-bold mr-1">Retrospective:</span>{sprint.retrospective}</p>
                        </div>
                      )}

                      <Droppable droppableId={String(sprint.id)} isDropDisabled={isCompleted}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`p-4 bg-gray-50/30 min-h-[50px] transition-colors ${snapshot.isDraggingOver ? 'bg-purple-50/50' : ''}`}
                          >
                            {sprintStories.map((story, sIdx) => renderStory(story, sIdx, isCompleted, isCompleted))}
                            {sprintStories.length === 0 && !snapshot.isDraggingOver && (
                               <div className="py-12 text-center text-gray-400 italic text-sm">No stories in this sprint</div>
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                    
                  </div>
                );
              });

              if (canManage && !isLatestSprintDraft) {
                renderedSprints.unshift(
                  <div key="next-sprint-trigger" className="relative pl-12 md:pl-20 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="absolute left-4 md:left-8 -translate-x-1/2 w-4 h-4 rounded-full border-4 border-dashed border-gray-300 bg-white z-10 top-2"></div>
                    <button 
                      onClick={openSprintModal}
                      className="w-full py-6 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-3 text-gray-500 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50/30 transition-all shadow-sm"
                    >
                      <span className="text-xl font-bold">+</span>
                      <span className="text-xs font-bold uppercase tracking-wider">{sprints.length === 0 ? 'Initialize First Sprint' : 'Plan Next Sprint'}</span>
                    </button>
                  </div>
                );
              }
              return renderedSprints;
            })()}
            </div>
          </div>

          <div className="relative">
            <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-300 overflow-hidden lg:sticky lg:top-20 flex flex-col max-h-[640px] lg:max-h-[calc(100vh-220px)]">
              <div className="px-6 py-4 border-b border-dashed border-gray-300 flex items-center justify-between bg-gray-100/50">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold text-gray-600 italic">Project Backlog</h3>
                  {canManage && (
                    <button onClick={() => openStoryModal()} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                      + Story
                    </button>
                  )}
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase">{backlogStories.length} stories</span>
              </div>

              <Droppable droppableId="backlog">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`p-4 min-h-[100px] flex-1 overflow-y-auto transition-colors ${snapshot.isDraggingOver ? 'bg-purple-50/50' : ''}`}
                  >
                    {backlogStories.map((story, sIdx) => renderStory(story, sIdx))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </div>

        {showSprintModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
              <h3 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">Setup New Sprint</h3>
              <form onSubmit={handleCreateSprint} className="space-y-5">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Sprint Identifier</label>
                  <input required type="text" value={sprintForm.name} onChange={e => setSprintForm({...sprintForm, name: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-purple-500" placeholder="e.g. Q2 - Performance Optimization" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Kickoff</label>
                    <input required type="date" value={sprintForm.start_date} min={minStartDate}
                      max={project?.deadline || ''}
                      onChange={e => {
                        const start = e.target.value;
                        const duration = project?.config?.sprint_duration_days || 14;
                        const d = new Date(start);
                        d.setDate(d.getDate() + duration);
                        const end = d.toISOString().split('T')[0];
                        setSprintForm({...sprintForm, start_date: start, end_date: end});
                      }}
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-purple-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">End Date</label>
                    <input 
                      required 
                      type="date" 
                      value={sprintForm.end_date} 
                      min={sprintForm.start_date || minStartDate}
                      max={project?.deadline || ''}
                      onChange={e => setSprintForm({...sprintForm, end_date: e.target.value})}
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-purple-500" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Core Objective</label>
                  <textarea rows="3" value={sprintForm.goal} onChange={e => setSprintForm({...sprintForm, goal: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-purple-500" placeholder="What's the main goal?" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowSprintModal(false)} className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">Dismiss</button>
                  <button type="submit" className="px-8 py-3 bg-purple-600 text-white text-sm font-bold rounded-2xl hover:bg-purple-700 transition-all shadow-lg shadow-purple-100">
                    Initialize Sprint
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <SprintEditModal
          isOpen={showSprintEditModal}
          onClose={() => { setShowSprintEditModal(false); setEditingSprint(null); }}
          pk={pk}
          sprint={editingSprint}
          project={project}
          sprints={sprints}
          onSuccess={fetchData}
        />
      </div>
    </DragDropContext>
  );
}
