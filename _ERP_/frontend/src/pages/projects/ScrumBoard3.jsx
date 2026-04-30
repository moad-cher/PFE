import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { 
  getProject, 
  getProjectStatuses, 
  getSprints, 
  getStories, 
  createSprint, 
  updateSprint, 
  updateStory, 
  updateTask,
  formatDate 
} from '../../api';
import Spinner from '../../components/shared/ui/Spinner';
import StatusBadge from '../../components/shared/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { isProjectManager } from '../../auth/permissions';
import TaskEdit from './TaskEdit';
import StoryNew from './StoryNew';

export default function ScrumBoard3() {
  const { pk } = useParams();
  const { user } = useAuth();
  
  // Data State
  const [project, setProject] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [sprints, setSprints] = useState([]);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [view, setView] = useState('backlog'); // 'backlog' or 'sprint'
  const [activeSprintId, setActiveSprintId] = useState(null);
  const [expandedSprints, setExpandedSprints] = useState(new Set());
  const [showSprintModal, setShowSprintModal] = useState(false);
  const [showStoryModal, setShowStoryModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskModalStoryId, setTaskModalStoryId] = useState('');
  
  const [sprintForm, setSprintForm] = useState({ name: '', start_date: '', end_date: '', goal: '' });

  const fetchData = () => {
    Promise.all([getProject(pk), getProjectStatuses(pk), getSprints(pk), getStories(pk)])
      .then(([p, s, spr, sto]) => {
        setProject(p.data);
        setStatuses(s.data.sort((a, b) => a.order - b.order));
        const sortedSprints = spr.data.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        setSprints(sortedSprints);
        setStories(sto.data);
        
        // Auto-select active sprint if none selected
        if (!activeSprintId && view === 'backlog') {
          const active = sortedSprints.find(s => s.status === 'active');
          if (active) {
            setActiveSprintId(active.id);
            setView('sprint');
            setExpandedSprints(new Set([active.id]));
          }
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [pk]);

  const canManage = isProjectManager(user, project);

  // Tree Logic
  const toggleSprintExpand = (id, e) => {
    e.stopPropagation();
    const next = new Set(expandedSprints);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedSprints(next);
  };

  const selectSprint = (id) => {
    setActiveSprintId(id);
    setView('sprint');
    const next = new Set(expandedSprints);
    next.add(id);
    setExpandedSprints(next);
  };

  const selectBacklog = () => {
    setView('backlog');
    setActiveSprintId(null);
  };

  // Drag & Drop Logic
  const onDragEnd = async (result) => {
    const { destination, source, draggableId, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === 'STORY') {
      const storyId = parseInt(draggableId.replace('story-', ''));
      const destSprintId = destination.droppableId === 'backlog-area' ? null : parseInt(destination.droppableId);
      
      // Optimistic Update
      setStories(stories.map(s => s.id === storyId ? { ...s, sprint_id: destSprintId } : s));
      
      try {
        await updateStory(pk, storyId, { sprint_id: destSprintId });
      } catch (err) {
        alert('Failed to move story');
        fetchData();
      }
    } else if (type === 'TASK') {
      const taskId = parseInt(draggableId.replace('task-', ''));
      const newStatus = destination.droppableId;
      
      // Optimistic Update
      const updatedTasks = project.tasks.map(t => t.id === taskId ? { ...t, status: newStatus } : t);
      setProject({ ...project, tasks: updatedTasks });

      try {
        await updateTask(pk, taskId, { status: newStatus });
      } catch (err) {
        alert('Failed to move task');
        fetchData();
      }
    }
  };

  // Helper: Get Tasks for active view
  const activeSprint = useMemo(() => sprints.find(s => s.id === activeSprintId), [sprints, activeSprintId]);
  
  const sprintTasks = useMemo(() => {
    if (view !== 'sprint' || !activeSprintId) return [];
    const sprintStoryIds = stories.filter(s => s.sprint_id === activeSprintId).map(s => s.id);
    return (project?.tasks || []).filter(t => t.story_id && sprintStoryIds.includes(t.story_id));
  }, [project, stories, view, activeSprintId]);

  const backlogStories = useMemo(() => stories.filter(s => !s.sprint_id), [stories]);
  const backlogTasksNoStory = useMemo(() => (project?.tasks || []).filter(t => !t.story_id), [project]);

  if (loading) return <div className="flex justify-center py-24"><Spinner /></div>;

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-6">
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex h-[calc(100vh-120px)] border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-xl">
          
          {/* Sidebar - Inspired by prototype */}
          <div className="w-72 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white">
              <span className="text-sm font-bold text-gray-700 truncate">{project?.name}</span>
              {canManage && (
                <button onClick={() => setShowSprintModal(true)} className="text-gray-400 hover:text-indigo-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              <div className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sprints</div>
              {sprints.map(s => (
                <div key={s.id}>
                  <div 
                    onClick={() => selectSprint(s.id)}
                    className={`flex items-center px-4 py-2 cursor-pointer group transition-colors ${activeSprintId === s.id && view === 'sprint' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-100 text-gray-600'}`}
                  >
                    <button 
                      onClick={(e) => toggleSprintExpand(s.id, e)}
                      className={`mr-2 transition-transform duration-200 ${expandedSprints.has(s.id) ? 'rotate-90' : ''}`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                    </button>
                    <span className="text-xs font-semibold flex-1 truncate">{s.name}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                      s.status === 'active' ? 'bg-green-100 text-green-700' : 
                      s.status === 'completed' ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {s.status}
                    </span>
                  </div>
                  
                  {expandedSprints.has(s.id) && (
                    <div className="ml-4 border-l border-gray-200">
                      {stories.filter(st => st.sprint_id === s.id).map(st => (
                        <div key={st.id} className="flex items-center px-4 py-1.5 text-[11px] text-gray-500 hover:text-indigo-600 cursor-default">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mr-2 flex-shrink-0"></span>
                          <span className="truncate">{st.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div 
                  onClick={selectBacklog}
                  className={`flex items-center px-4 py-3 cursor-pointer transition-colors ${view === 'backlog' ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                  <span className="mr-3 text-lg">📋</span>
                  <span className="text-xs font-bold flex-1">Backlog</span>
                  <span className="text-[10px] bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-black">
                    {backlogStories.length}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0 bg-gray-50/50">
            {/* Topbar */}
            <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">
                  {view === 'backlog' ? 'Product Backlog' : activeSprint?.name}
                </h2>
                <p className="text-[11px] text-gray-500 font-medium">
                  {view === 'backlog' ? `${backlogStories.length} stories in queue` : `${formatDate(activeSprint?.start_date)} - ${formatDate(activeSprint?.end_date)}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Link to={`/projects/${pk}/scrum`} className="px-3 py-1.5 text-gray-500 text-[10px] font-bold uppercase hover:text-indigo-600 transition-colors self-center mr-2">
                  Classic View
                </Link>
                {view === 'backlog' ? (
                  <>
                    <button onClick={() => setShowStoryModal(true)} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 shadow-sm transition-all">
                      + New Story
                    </button>
                    <button onClick={() => setShowSprintModal(true)} className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all">
                      Plan Sprint
                    </button>
                  </>
                ) : (
                  <>
                    {activeSprint?.status === 'active' && (
                      <button 
                        onClick={() => updateSprint(pk, activeSprint.id, { status: 'completed' }).then(fetchData)}
                        className="px-3 py-1.5 bg-gray-800 text-white text-xs font-bold rounded-lg hover:bg-black shadow-md shadow-gray-100 transition-all"
                      >
                        Complete Sprint
                      </button>
                    )}
                    {activeSprint?.status === 'draft' && (
                      <button 
                        onClick={() => updateSprint(pk, activeSprint.id, { status: 'active' }).then(fetchData)}
                        className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all"
                      >
                        Start Sprint
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {view === 'backlog' ? (
                /* Backlog View */
                <div className="max-w-4xl mx-auto">
                  <Droppable droppableId="backlog-area" type="STORY">
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.droppableProps}
                        className={`space-y-3 min-h-[400px] rounded-2xl transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50/50 ring-2 ring-indigo-200 ring-dashed' : ''}`}
                      >
                        {backlogStories.length === 0 ? (
                          <div className="py-20 text-center border-2 border-dashed border-gray-200 rounded-3xl text-gray-400">
                            <span className="text-3xl block mb-2">📥</span>
                            <p className="text-sm font-medium italic">Backlog is currently empty</p>
                          </div>
                        ) : (
                          backlogStories.map((story, index) => (
                            <Draggable key={story.id} draggableId={`story-${story.id}`} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-all flex items-center gap-4 ${snapshot.isDragging ? 'shadow-xl ring-2 ring-indigo-500 scale-[1.02]' : ''}`}
                                >
                                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                                  <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-bold text-gray-800 truncate">{story.title}</h4>
                                    <p className="text-[10px] text-gray-400 font-black uppercase mt-0.5">{story.points} Points</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                      story.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                                    }`}>
                                      {story.priority || 'medium'}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ) : (
                /* Sprint View - Task Kanban */
                <div className="h-full flex flex-col">
                  {/* Progress Header */}
                  {activeSprint && (
                    <div className="mb-6 flex items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Sprint Health</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all duration-500" 
                          style={{ width: `${Math.round((sprintTasks.filter(t => t.status === 'done').length / (sprintTasks.length || 1)) * 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-bold text-gray-600 italic">
                        {Math.round((sprintTasks.filter(t => t.status === 'done').length / (sprintTasks.length || 1)) * 100)}% Complete
                      </span>
                    </div>
                  )}

                  <div className="flex-1 grid grid-cols-3 gap-4 min-h-0">
                    {statuses.map(status => {
                      const tasks = sprintTasks.filter(t => t.status === status.slug);
                      return (
                        <div key={status.id} className="flex flex-col bg-gray-100/50 rounded-2xl border border-gray-200/50">
                          <div className="p-3 flex items-center justify-between border-b border-gray-200/50 bg-white/50 rounded-t-2xl">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{status.name}</span>
                            <span className="text-[10px] bg-white border border-gray-200 text-gray-400 px-1.5 py-0.5 rounded-md font-bold">{tasks.length}</span>
                          </div>
                          
                          <Droppable droppableId={status.slug} type="TASK">
                            {(provided, snapshot) => (
                              <div 
                                ref={provided.innerRef} 
                                {...provided.droppableProps}
                                className={`flex-1 p-3 overflow-y-auto space-y-3 transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''}`}
                              >
                                {tasks.map((task, index) => {
                                  const story = stories.find(s => s.id === task.story_id);
                                  return (
                                    <Draggable key={task.id} draggableId={`task-${task.id}`} index={index}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          className={`bg-white border border-gray-200 p-3 rounded-xl shadow-sm hover:border-indigo-300 transition-all ${snapshot.isDragging ? 'shadow-xl rotate-2 scale-105 ring-2 ring-indigo-500 z-50' : ''}`}
                                        >
                                          <div className="flex items-start justify-between gap-2 mb-2">
                                            <h5 className="text-xs font-bold text-gray-800 leading-snug">{task.title}</h5>
                                          </div>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {story && (
                                              <span className="text-[9px] font-black text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 truncate max-w-[120px]" title={story.title}>
                                                {story.title}
                                              </span>
                                            )}
                                            <div className="flex -space-x-1.5 ml-auto">
                                              {task.assigned_to?.map(u => (
                                                <div key={u.id} className="w-5 h-5 rounded-full bg-indigo-100 border border-white flex items-center justify-center text-[8px] font-bold text-indigo-600" title={u.username}>
                                                  {u.username[0].toUpperCase()}
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  );
                                })}
                                {provided.placeholder}
                                {tasks.length === 0 && !snapshot.isDraggingOver && (
                                  <div className="py-8 text-center text-[10px] text-gray-300 font-bold uppercase tracking-widest italic">No tasks</div>
                                )}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Droppable Areas (Bottom) */}
            {view === 'sprint' && activeSprint?.status !== 'completed' && (
              <div className="px-6 py-4 bg-white border-t border-gray-200">
                <div className="flex items-center gap-4">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex-shrink-0">Sprint Planning</div>
                  <Droppable droppableId={String(activeSprintId)} type="STORY">
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef} 
                        {...provided.droppableProps}
                        className={`flex-1 h-12 border-2 border-dashed rounded-xl flex items-center justify-center gap-2 transition-all ${
                          snapshot.isDraggingOver ? 'bg-indigo-50 border-indigo-500 ring-4 ring-indigo-100' : 'bg-gray-50 border-gray-200 text-gray-400'
                        }`}
                      >
                        <span className="text-sm">📥</span>
                        <span className="text-[11px] font-bold italic uppercase tracking-wider">Drag stories here to add to sprint</span>
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            )}
          </div>
        </div>
      </DragDropContext>

      {/* Modals */}
      <StoryNew 
        isOpen={showStoryModal} 
        onClose={() => setShowStoryModal(false)} 
        pk={pk} 
        onSuccess={fetchData} 
      />
      
      <TaskEdit 
        isOpen={showTaskModal} 
        onClose={() => setShowTaskModal(false)} 
        pk={pk} 
        initialStoryId={taskModalStoryId} 
        onSuccess={fetchData} 
      />

      {showSprintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
            <h3 className="text-2xl font-black text-gray-900 mb-6 tracking-tight">New Sprint Planning</h3>
            <form onSubmit={(e) => {
              e.preventDefault();
              createSprint(pk, sprintForm).then(() => {
                setShowSprintModal(false);
                fetchData();
              });
            }} className="space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Identifier</label>
                <input required type="text" value={sprintForm.name} onChange={e => setSprintForm({...sprintForm, name: e.target.value})}
                  className="w-full bg-gray-50 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="Sprint name..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Start</label>
                  <input required type="date" value={sprintForm.start_date}
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
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">End</label>
                  <div className="w-full bg-gray-100 rounded-2xl px-5 py-3 text-sm text-gray-500 font-bold">{sprintForm.end_date || 'Calculated'}</div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowSprintModal(false)} className="px-6 py-3 text-sm font-bold text-gray-500">Cancel</button>
                <button type="submit" className="px-8 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-100">
                  Plan Sprint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
