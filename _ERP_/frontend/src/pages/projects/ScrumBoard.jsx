import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getProject, getProjectStatuses, getSprints, getStories, createSprint, updateSprint, updateStory, formatDate } from '../../api';
import Spinner from '../../components/shared/ui/Spinner';
import StatusBadge from '../../components/shared/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { isProjectManager } from '../../auth/permissions';
import TaskNew from './TaskNew';
import StoryNew from './StoryNew';

export default function ScrumBoard() {
  const { pk } = useParams();
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [stories, setStories] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [loading, setLoading] = useState(true);
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [sprintForm, setSprintForm] = useState({ name: '', start_date: '', end_date: '', goal: '' });
  const [minStartDate, setMinStartDate] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalStoryId, setTaskModalStoryId] = useState('');
  const [showStoryModal, setShowStoryModal] = useState(false);

  const fetchData = () => {
    Promise.all([getProject(pk), getProjectStatuses(pk), getSprints(pk), getStories(pk)])
      .then(([p, s, spr, sto]) => {
        setProject(p.data);
        setStatuses(s.data);
        setSprints(spr.data.sort((a, b) => new Date(a.start_date) - new Date(b.start_date)));
        setStories(sto.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [pk]);

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
      goal: ''
    });
    setShowSprintModal(true);
  };

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    try {
      const res = await createSprint(pk, sprintForm);
      setSprints([...sprints, res.data].sort((a, b) => new Date(a.start_date) - new Date(b.start_date)));
      setShowSprintModal(false);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create sprint');
    }
  };

  const handleUpdateSprintStatus = async (sprintId, newStatus) => {
    try {
      const res = await updateSprint(pk, sprintId, { status: newStatus });
      setSprints(sprints.map(s => s.id === sprintId ? res.data : s));
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update sprint');
    }
  };

  const handleCompleteSprint = async (sprintId) => {
    try {
      // 1. Mark sprint completed
      await updateSprint(pk, sprintId, { status: 'completed' });
      
      // 2. Determine destination (next sprint or backlog)
      const idx = sprints.findIndex(s => s.id === sprintId);
      const nextSprint = sprints[idx + 1];
      const destSprintId = nextSprint ? nextSprint.id : null;

      // 3. Find incomplete stories
      const incompleteStories = stories.filter(s => s.sprint_id === sprintId && s.status !== 'done');

      // 4. Move them
      if (incompleteStories.length > 0) {
        await Promise.all(
          incompleteStories.map(s => updateStory(pk, s.id, { sprint_id: destSprintId }))
        );
      }

      // 5. Refresh data to reflect moves
      fetchData();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to complete sprint');
      fetchData();
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
  
  const allMembers = project
    ? [project.manager, ...(project.members || [])]
        .filter(Boolean)
        .filter((v, i, a) => a.findIndex(x => x.id === v.id) === i)
    : [];

  const tasksByStory = {}; 
  const backlogTasksNoStory = [];

  project?.tasks?.forEach(t => {
    if (filterStatus && t.status !== filterStatus) return;
    if (filterAssignee && !t.assigned_to?.some(a => a.id === parseInt(filterAssignee))) return;

    if (t.story_id) {
      if (!tasksByStory[t.story_id]) tasksByStory[t.story_id] = [];
      tasksByStory[t.story_id].push(t);
    } else {
      backlogTasksNoStory.push(t);
    }
  });

  const storiesBySprint = {};
  sprints.forEach(s => storiesBySprint[s.id] = []);
  const backlogStories = [];
  stories.forEach(s => {
    if (s.sprint_id) {
      if (!storiesBySprint[s.sprint_id]) storiesBySprint[s.sprint_id] = [];
      storiesBySprint[s.sprint_id].push(s);
    } else {
      backlogStories.push(s);
    }
  });

  const renderTaskTable = (taskList) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-[10px] text-gray-400 uppercase bg-gray-50/30">
          <tr>
            <th className="px-4 py-1 font-bold">Task</th>
            <th className="px-4 py-1 font-bold">Status</th>
            <th className="px-4 py-1 font-bold text-center">Pts</th>
            <th className="px-4 py-1 font-bold">Assignees</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100/50">
          {taskList.length === 0 ? (
            <tr><td colSpan={4} className="px-4 py-3 text-center text-gray-400 italic text-xs">No tasks</td></tr>
          ) : (
            taskList.map(t => (
              <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-4 py-2">
                  <Link to={`/projects/${pk}/tasks/${t.id}`} className="font-medium text-gray-700 hover:text-blue-600 line-clamp-1">{t.title}</Link>
                </td>
                <td className="px-4 py-2"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-2 text-center text-gray-500 text-xs">{t.points}</td>
                <td className="px-4 py-2">
                  <div className="flex -space-x-1.5">
                    {t.assigned_to?.map(u => (
                      <div key={u.id} title={u.username} className="w-5 h-5 rounded-full bg-indigo-50 border border-white flex items-center justify-center text-[8px] font-bold text-indigo-600">
                        {u.username[0].toUpperCase()}
                      </div>
                    ))}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const renderStory = (story, index, isDragDisabled = false) => {
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
            className={`mb-4 bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all ${snapshot.isDragging ? 'shadow-xl ring-2 ring-indigo-500 z-50' : ''} ${isDragDisabled ? 'opacity-80' : ''}`}
            style={provided.draggableProps.style}
          >
            <div className="px-4 py-3 bg-gray-50/50 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800">{story.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{story.points} Story Pts</span>
                    <span className="text-[10px] text-gray-300">•</span>
                    <div className="flex items-center gap-1.5">
                       <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500" style={{ width: `${progress}%` }}></div>
                       </div>
                       <span className="text-[9px] font-bold text-gray-500">{progress}%</span>
                    </div>
                  </div>
                </div>
              </div>
              <button onClick={() => openTaskModal(story.id)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-tighter bg-indigo-50 px-2 py-1 rounded-md transition-colors">
                + Task
              </button>
            </div>
            <div className="p-1">
              {renderTaskTable(storyTasks)}
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
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-10">
          <div>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
              <Link to={`/projects/${pk}`} className="hover:text-blue-600">← {project?.name}</Link>
              <span>/</span><span className="font-medium text-gray-700">Scrum Roadmap</span>
              <Link to={`/projects/${pk}/scrum3`} className="ml-4 px-2 py-0.5 bg-pink-50 text-pink-600 text-[10px] font-black uppercase rounded border border-pink-100 hover:bg-pink-100 transition-colors">
                Try v3 ✨
              </Link>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Sprint Timeline</h1>
          </div>
          <div className="flex gap-3">
            <button onClick={() => openStoryModal()} className="px-4 py-2 bg-white border border-indigo-200 text-indigo-700 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition-all shadow-sm">
               New Story
            </button>
            <button onClick={() => openTaskModal()} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">
              + New Task
            </button>
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

        <div className="flex flex-wrap gap-4 mb-12 items-center bg-gray-50 p-4 rounded-2xl border border-gray-100">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider ml-1">Filters:</span>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border-none rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-400 bg-white shadow-sm">
            <option value="">All statuses</option>
            {statuses.map(s => <option key={s.id} value={s.slug}>{s.name}</option>)}
          </select>
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
            className="border-none rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-400 bg-white shadow-sm">
            <option value="">All members</option>
            {allMembers.map(m => <option key={m.id} value={m.id}>{m.username}</option>)}
          </select>
        </div>

        <div className="relative">
          <div className="absolute left-4 md:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-gray-200 to-transparent"></div>

          <div className="space-y-16">
            {(() => {
              const lastSprint = sprints[sprints.length - 1];
              const isLastSprintDraft = lastSprint?.status === 'draft';
              const renderedSprints = sprints.map((sprint, idx) => {
                const isActive = sprint.status === 'active';
                const isCompleted = sprint.status === 'completed';
                const sprintStories = storiesBySprint[sprint.id] || [];
                
                return (
                  <div key={sprint.id} className="relative pl-12 md:pl-20 transition-all">
                    <div className={`absolute left-4 md:left-8 -translate-x-1/2 w-4 h-4 rounded-full border-4 bg-white z-10 top-2 transition-all duration-500
                      ${isActive ? 'border-indigo-600 scale-125 ring-4 ring-indigo-50' : isCompleted ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}>
                    </div>

                    <div className={`bg-white rounded-2xl shadow-sm border transition-all overflow-hidden ${isActive ? 'border-indigo-500 border-2 ring-4 ring-indigo-50/50 shadow-indigo-100 shadow-xl' : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className={`px-6 py-4 flex flex-wrap items-center justify-between gap-4 ${isActive ? 'bg-indigo-50/30' : isCompleted ? 'bg-gray-50/50' : ''}`}>
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-bold text-gray-900">{sprint.name}</h3>
                            {isActive && <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-full uppercase tracking-tighter">Current</span>}
                            {isCompleted && <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-tighter">Completed</span>}
                          </div>
                          <p className="text-xs text-gray-500 font-medium">
                            {formatDate(sprint.start_date)} — {formatDate(sprint.end_date)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {canManage && sprint.status === 'draft' && (
                            <button onClick={() => handleUpdateSprintStatus(sprint.id, 'active')} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors">Start</button>
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

                      <Droppable droppableId={String(sprint.id)} isDropDisabled={isCompleted}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`p-4 bg-gray-50/30 min-h-[50px] transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''}`}
                          >
                            {sprintStories.map((story, sIdx) => renderStory(story, sIdx, isCompleted))}
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

              if (canManage && !isLastSprintDraft) {
                renderedSprints.push(
                  <div key="next-sprint-trigger" className="relative pl-12 md:pl-20 opacity-60 hover:opacity-100 transition-opacity">
                    <div className="absolute left-4 md:left-8 -translate-x-1/2 w-4 h-4 rounded-full border-4 border-dashed border-gray-300 bg-white z-10 top-2"></div>
                    <button 
                      onClick={openSprintModal}
                      className="w-full py-6 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-3 text-gray-500 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all shadow-sm"
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

          <div className="relative pl-12 md:pl-20 mt-16">
            <div className="absolute left-4 md:left-8 -translate-x-1/2 w-4 h-4 rounded-full border-4 border-dashed border-gray-300 bg-white z-10 top-2"></div>
            
            <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-300 overflow-hidden">
              <div className="px-6 py-4 border-b border-dashed border-gray-300 flex items-center justify-between bg-gray-100/50">
                <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold text-gray-600 italic">Project Backlog</h3>
                  <button onClick={() => openStoryModal()} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                    + Story
                  </button>
                  <button onClick={() => openTaskModal()} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                    + Task
                  </button>
                </div>
                <span className="text-xs font-bold text-gray-400 uppercase">{backlogStories.length} stories, {backlogTasksNoStory.length} standalone tasks</span>
              </div>
              
              <Droppable droppableId="backlog">
                {(provided, snapshot) => (
                  <div 
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`p-4 min-h-[100px] transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''}`}
                  >
                     {backlogStories.map((story, sIdx) => renderStory(story, sIdx))}
                     {backlogTasksNoStory.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Uncategorized Tasks</h4>
                          <div className="bg-white/80 border border-gray-200 rounded-xl overflow-hidden">
                            {renderTaskTable(backlogTasksNoStory)}
                          </div>
                        </div>
                     )}
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
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="e.g. Q2 - Performance Optimization" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Kickoff</label>
                    <input required type="date" value={sprintForm.start_date} min={minStartDate}
                      onChange={e => {
                        const start = e.target.value;
                        let end = sprintForm.end_date;
                        if (start && project?.config?.sprint_duration_days) {
                          const d = new Date(start);
                          d.setDate(d.getDate() + project.config.sprint_duration_days);
                          end = d.toISOString().split('T')[0];
                        }
                        setSprintForm({...sprintForm, start_date: start, end_date: end});
                      }}
                      className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">End Date</label>
                    <div className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm text-gray-700">
                      {sprintForm.end_date ? formatDate(sprintForm.end_date) : '—'}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Core Objective</label>
                  <textarea rows="3" value={sprintForm.goal} onChange={e => setSprintForm({...sprintForm, goal: e.target.value})}
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="What's the main goal?" />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button type="button" onClick={() => setShowSprintModal(false)} className="px-6 py-3 text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">Dismiss</button>
                  <button type="submit" className="px-8 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
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
