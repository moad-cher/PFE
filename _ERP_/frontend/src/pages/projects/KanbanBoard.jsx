import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getKanban, moveTask, getProject, getStories, updateTask } from '../../api';
import Spinner from '../../components/shared/ui/Spinner';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../auth/Guard';
import TaskEdit from '../../components/features/projects/TaskEdit';
import TaskCard from '../../components/features/projects/TaskCard';

export default function KanbanBoard({ project: propProject, isTab, onRefresh }) {
  const { pk } = useParams();
  const { user } = useAuth();
  const { checkPM } = usePermissions();
  const [columns, setColumns] = useState([]);
  const [project, setProject] = useState(propProject || null);
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(!propProject);
  const [editingTask, setEditingTask] = useState(null);
  const [showOnlyMyTasks, setShowOnlyMyTasks] = useState(false);
  const [groupBy, setGroupBy] = useState('none'); // none, story, assignee, priority

  const fetchData = () => {
    if (!propProject) setLoading(true);
    Promise.all([
      getKanban(pk), 
      propProject ? Promise.resolve({ data: propProject }) : getProject(pk),
      getStories(pk)
    ])
      .then(([k, p, s]) => { 
        setColumns(k.data); 
        setProject(p.data);
        setStories(s.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [pk, propProject]);

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    
    const taskId = parseInt(draggableId.replace('task-', ''));
    const [sourceColSlug, sourceLaneId] = source.droppableId.split('|');
    const [destColSlug, destLaneId] = destination.droppableId.split('|');
    
    setColumns(prev => {
      const sourceColIndex = prev.findIndex(c => c.status.slug === sourceColSlug);
      const destColIndex = prev.findIndex(c => c.status.slug === destColSlug);
      if (sourceColIndex === -1 || destColIndex === -1) return prev;
      
      const newColumns = [...prev];
      const sourceCol = { ...newColumns[sourceColIndex], tasks: [...newColumns[sourceColIndex].tasks] };
      const destCol = sourceColSlug === destColSlug 
        ? sourceCol 
        : { ...newColumns[destColIndex], tasks: [...newColumns[destColIndex].tasks] };
      
      const [movedTask] = sourceCol.tasks.splice(source.index, 1);
      const updatedTask = { ...movedTask, status: destColSlug };
      
      if (sourceLaneId !== destLaneId) {
        if (groupBy === 'story') {
          const newStoryId = destLaneId.replace('story-', '');
          updatedTask.story_id = newStoryId === 'none' ? null : parseInt(newStoryId);
        } else if (groupBy === 'priority') {
          const newPriority = destLaneId.replace('priority-', '');
          updatedTask.priority = newPriority === 'none' ? null : newPriority;
        } else if (groupBy === 'assignee') {
          const newUserId = destLaneId.replace('user-', '');
          updatedTask.assigned_to = newUserId === 'none' ? [] : [{id: parseInt(newUserId), username: 'Updating...'}];
        }
      }
      
      destCol.tasks.splice(destination.index, 0, updatedTask);
      newColumns[sourceColIndex] = sourceCol;
      if (sourceColSlug !== destColSlug) newColumns[destColIndex] = destCol;
      return newColumns;
    });
    
    try {
      const updates = {};
      let hasUpdates = false;
      if (sourceColSlug !== destColSlug) await moveTask(pk, taskId, destColSlug);
      if (sourceLaneId !== destLaneId) {
        if (groupBy === 'story') {
          const newStoryId = destLaneId.replace('story-', '');
          updates.story_id = newStoryId === 'none' ? null : parseInt(newStoryId);
          hasUpdates = true;
        } else if (groupBy === 'priority') {
          const newPriority = destLaneId.replace('priority-', '');
          updates.priority = newPriority === 'none' ? null : newPriority;
          hasUpdates = true;
        } else if (groupBy === 'assignee') {
          const newUserId = destLaneId.replace('user-', '');
          updates.assigned_to_ids = newUserId === 'none' ? [] : [parseInt(newUserId)];
          hasUpdates = true;
        }
      }
      if (hasUpdates) await updateTask(pk, taskId, updates);
    } catch (error) {
      console.error('Failed to move task:', error);
      fetchData();
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;

  const activeSprint = project?.sprints?.find(s => s.status === 'active');
  const isPM = checkPM(project);

  const lanes = (() => {
    if (groupBy === 'none') return [{ id: 'none', title: 'All Tasks', color: 'gray' }];
    if (groupBy === 'story') {
      return [
        ...stories.map(s => ({ id: `story-${s.id}`, title: s.title, subtitle: `${s.points} pts`, color: 'purple' })),
        { id: 'story-none', title: 'Unparented Tasks', color: 'gray' }
      ];
    }
    if (groupBy === 'assignee') {
      const members = [project?.manager, ...(project?.members || [])].filter(Boolean);
      const uniqueMembers = Array.from(new Map(members.map(m => [m.id, m])).values());
      return [
        ...uniqueMembers.map(m => ({ id: `user-${m.id}`, title: m.username, color: 'indigo' })),
        { id: 'user-none', title: 'Unassigned', color: 'gray' }
      ];
    }
    if (groupBy === 'priority') {
      return [
        { id: 'priority-urgent', title: 'Urgent', color: 'red' },
        { id: 'priority-high', title: 'High', color: 'orange' },
        { id: 'priority-medium', title: 'Medium', color: 'blue' },
        { id: 'priority-low', title: 'Low', color: 'slate' },
        { id: 'priority-none', title: 'No Priority', color: 'gray' }
      ];
    }
    return [];
  })();

  const filteredLanes = useMemo(() => {
    if (groupBy === 'none') return lanes;
    return lanes.filter(lane => {
      return columns.some(col => {
        return col.tasks.some(task => {
          if (showOnlyMyTasks && !task.assigned_to?.some(u => u.id === user?.id)) return false;
          
          if (groupBy === 'story') {
            const storyId = lane.id.replace('story-', '');
            return storyId === 'none' ? !task.story_id : task.story_id === parseInt(storyId);
          }
          if (groupBy === 'assignee') {
            const userId = lane.id.replace('user-', '');
            return userId === 'none' ? (!task.assigned_to || task.assigned_to.length === 0) : task.assigned_to?.some(u => u.id === parseInt(userId));
          }
          if (groupBy === 'priority') {
            const p = lane.id.replace('priority-', '');
            return p === 'none' ? !task.priority : task.priority === p;
          }
          return false;
        });
      });
    });
  }, [lanes, columns, groupBy, showOnlyMyTasks, user]);

  const colorMap = {
    purple: 'bg-purple-600',
    indigo: 'bg-indigo-600',
    red: 'bg-red-600',
    orange: 'bg-orange-600',
    blue: 'bg-blue-600',
    slate: 'bg-slate-600',
    gray: 'bg-gray-400'
  };

  const getTasksInLane = (col, lane) => {
    return col.tasks.filter(task => {
      if (showOnlyMyTasks && !task.assigned_to?.some(u => u.id === user?.id)) return false;
      if (groupBy === 'none') return true;
      if (groupBy === 'story') {
        const storyId = lane.id.replace('story-', '');
        return storyId === 'none' ? !task.story_id : task.story_id === parseInt(storyId);
      }
      if (groupBy === 'assignee') {
        const userId = lane.id.replace('user-', '');
        return userId === 'none' ? (!task.assigned_to || task.assigned_to.length === 0) : task.assigned_to?.some(u => u.id === parseInt(userId));
      }
      if (groupBy === 'priority') {
        const p = lane.id.replace('priority-', '');
        return p === 'none' ? !task.priority : task.priority === p;
      }
      return true;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-gray-50/50">
      {/* 1. Header & Controls */}
      <header className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 z-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {!isTab && (
              <Link to={`/projects/${pk}`} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
            )}
            <h2 className="text-xl font-bold text-gray-900 truncate">
              {activeSprint ? activeSprint.name : 'Project Kanban'}
              {activeSprint && (
                <span className="ml-3 px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase border border-green-200">Active</span>
              )}
            </h2>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
              {['none', 'story', 'assignee', 'priority'].map(id => (
                <button
                  key={id}
                  onClick={() => setGroupBy(id)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${groupBy === id ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {id.charAt(0).toUpperCase() + id.slice(1)}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setShowOnlyMyTasks(!showOnlyMyTasks)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all border ${showOnlyMyTasks ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
            >
              {showOnlyMyTasks ? '👤 My Tasks' : '👥 All Tasks'}
            </button>
          </div>
        </div>
      </header>

      <TaskEdit 
        isOpen={!!editingTask} 
        onClose={() => setEditingTask(null)} 
        pk={pk} 
        taskId={editingTask?.id}
        onSuccess={fetchData} 
      />

      {/* 2. Scrollable Board Content */}
      <div className="flex-1 overflow-auto custom-scrollbar px-6">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="inline-block min-w-full">
            
            {/* Column Headers - Sticky */}
            <div className="sticky top-0 z-30 flex gap-4 mb-4">
              {columns.map(col => (
                <div key={col.status.id} className="flex-shrink-0 w-72">
                <div className="backdrop-blur-sm p-3 border border-gray-200 shadow-sm flex items-center justify-between" style={{background: `${col.status.color}18` }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: col.status.color }} />
                      <span className="font-bold text-xs text-gray-700 uppercase tracking-wider">{col.status.name}</span>
                    </div>
                    <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      {col.tasks.filter(t => !showOnlyMyTasks || t.assigned_to?.some(u => u.id === user?.id)).length}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Board Lanes & Tasks */}
            <div className="flex flex-col gap-8">
              {filteredLanes.map((lane) => (
                <section key={lane.id} className="relative">
                  {groupBy !== 'none' && (
                    <div className="sticky left-0 top-[60px] z-20 w-fit mb-4">
                      <div className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm flex items-center gap-2">
                        <div className={`w-1 h-3 rounded-full ${colorMap[lane.color]}`} />
                        <h3 className="font-bold text-gray-800 text-xs uppercase tracking-tight">
                          {lane.title}
                          {lane.subtitle && <span className="ml-2 text-[10px] text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100">{lane.subtitle}</span>}
                        </h3>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    {columns.map((col) => {
                      const tasksInLane = getTasksInLane(col, lane);
                      return (
                        <div key={`${lane.id}-${col.status.id}`} className="flex-shrink-0 w-72">
                          <Droppable droppableId={`${col.status.slug}|${lane.id}`}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`min-h-[100px] p-2 rounded-xl transition-colors duration-200 ${snapshot.isDraggingOver ? 'bg-purple-50 border-2 border-dashed border-purple-200' : 'border-2 border-transparent'}`}
                                style={{ background: snapshot.isDraggingOver ? undefined : `${col.status.color}12` }}
                              >
                                <div className="flex flex-col gap-3">
                                  {tasksInLane.map((task, index) => {
                                    const isAssignee = task.assigned_to?.some(u => u.id === user?.id);
                                    const canDrag = isPM || isAssignee;
                                    return (
                                      <Draggable key={task.id} draggableId={`task-${task.id}`} index={index} isDragDisabled={!canDrag}>
                                        {(provided, snapshot) => (
                                          <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            {...provided.dragHandleProps}
                                            style={provided.draggableProps.style}
                                            className={snapshot.isDragging ? 'z-50' : ''}
                                          >
                                            <TaskCard 
                                              task={task} 
                                              projectId={pk} 
                                              isDragging={snapshot.isDragging} 
                                              isLocked={!canDrag}
                                              isPM={isPM}
                                              onEdit={setEditingTask}
                                            />
                                          </div>
                                        )}
                                      </Draggable>
                                    );
                                  })}
                                </div>
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
