import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getKanban, moveTask, getProject } from '../../api';
import Spinner from '../../components/ui/Spinner';
import PriorityBadge from '../../components/ui/PriorityBadge';
import { useAuth } from '../../context/AuthContext';
import Guard, { usePermissions } from '../../components/features/auth/Guard';
import TaskNew from './TaskNew';

function TaskCard({ task, projectId, isDragging, isLocked }) {
  return (
    <div className={`bg-white/95 rounded-2xl border border-purple-100/40 shadow-lilac p-3 transition-all ${isDragging ? 'shadow-lg ring-2 ring-purple-400 rotate-2 scale-105 cursor-grabbing' : 'hover:shadow-md card-hover'} ${isLocked ? 'opacity-75 grayscale-[0.2]' : ''}`}>
      {isLocked && (
        <div className="absolute top-3 right-3 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
      <Link to={`/projects/${projectId}/tasks/${task.id}`} className="block">
        <p className="font-medium text-sm text-gray-800 hover:text-purple-600 line-clamp-2 mb-2 transition-colors">{task.title}</p>
      </Link>
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <PriorityBadge priority={task.priority} />
      </div>
      {task.end_time && (
        <p className={`text-xs mb-2 ${task.is_overdue ? 'text-rose-400 font-medium' : task.deadline_approaching ? 'text-amber-500' : 'text-gray-400'}`}>
          {task.is_overdue ? '⚠ Overdue: ' : task.deadline_approaching ? '⏰ Due soon: ' : 'Ends: '}
          {new Date(task.end_time).toLocaleString()}
        </p>
      )}
      {task.assigned_to?.length > 0 && (
        <div className="flex -space-x-1">
          {task.assigned_to.slice(0, 3).map(u => (
            <div key={u.id} title={u.username}
              className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white text-[9px] border-2 border-white shadow-sm">
              {u.username[0].toUpperCase()}
            </div>
          ))}
          {task.assigned_to.length > 3 && (
            <span className="text-xs text-purple-300 pl-2">+{task.assigned_to.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function KanbanBoard() {
  const { pk } = useParams();
  const { user } = useAuth();
  const { checkPM } = usePermissions();
  const [columns, setColumns] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);

  const fetchData = () => {
    Promise.all([getKanban(pk), getProject(pk)])
      .then(([k, p]) => { setColumns(k.data); setProject(p.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, [pk]);

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    
    const taskId = parseInt(draggableId.replace('task-', ''));
    const sourceColSlug = source.droppableId;
    const destColSlug = destination.droppableId;
    
    setColumns(prev => {
      const newColumns = [...prev];
      const sourceCol = newColumns.find(c => c.status.slug === sourceColSlug);
      const destCol = newColumns.find(c => c.status.slug === destColSlug);
      if (!sourceCol || !destCol) return prev;
      const [movedTask] = sourceCol.tasks.splice(source.index, 1);
      movedTask.status = destColSlug;
      destCol.tasks.splice(destination.index, 0, movedTask);
      return newColumns;
    });
    
    if (sourceColSlug !== destColSlug) {
      try {
        await moveTask(pk, taskId, destColSlug);
      } catch (error) {
        const res = await getKanban(pk);
        setColumns(res.data);
      }
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;

  return (
    <div className="px-4 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link to={`/projects/${pk}`} className="hover:text-purple-600 transition-colors">← {project?.name}</Link>
            <span>/</span><span className="font-medium text-gray-700">Kanban</span>
          </div>
          <div className="flex gap-2">
            <Link to={`/projects/${pk}/scrum`} className="px-3 py-1.5 text-sm bg-violet-50 text-violet-600 rounded-xl hover:bg-violet-100 transition-colors">Scrum</Link>
            <Link to={`/projects/${pk}/scrum2`} className="px-3 py-1.5 text-sm bg-white text-slate-700 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors">ScrumBoard 2</Link>
            <Guard isProjectManager project={project}>
              <button onClick={() => setShowTaskModal(true)} className="px-3 py-1.5 text-sm bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-xl hover:from-purple-600 hover:to-violet-600 transition-all shadow-sm">+ Task</button>
            </Guard>
          </div>
        </div>

        <TaskNew 
          isOpen={showTaskModal} 
          onClose={() => setShowTaskModal(false)} 
          pk={pk} 
          onSuccess={fetchData} 
        />

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 min-h-[70vh]">
            {columns.map((col, colIndex) => (
              <div key={col.status.id} className="flex-shrink-0 w-72">
                <div className={`${colIndex % 2 === 0 ? 'rounded-2xl' : 'rounded-xl'} p-3 backdrop-blur-sm`} style={{ background: col.status.color + '18' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shadow-sm" style={{ background: col.status.color }} />
                      <span className="font-semibold text-sm text-gray-700">{col.status.name}</span>
                    </div>
                    <span className="text-xs bg-white/80 px-2 py-0.5 rounded-full text-gray-500 shadow-sm">{col.tasks.length}</span>
                  </div>
                  <Droppable droppableId={col.status.slug}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-2 min-h-[100px] rounded-xl transition-colors ${snapshot.isDraggingOver ? 'bg-purple-50/50 ring-2 ring-purple-200 ring-dashed' : ''}`}
                      >
                        {col.tasks.map((task, index) => {
                          const isAssignee = task.assigned_to?.some(u => u.id === user?.id);
                          const canDrag = checkPM(project) || isAssignee;
                          
                          return (
                            <Draggable 
                              key={task.id} 
                              draggableId={`task-${task.id}`} 
                              index={index}
                              isDragDisabled={!canDrag}
                            >
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={!canDrag ? 'cursor-not-allowed' : ''}
                                  title={!canDrag ? 'Only assignees can move this task' : ''}
                                  style={{
                                    ...provided.draggableProps.style,
                                    userSelect: 'none',
                                    position: 'relative',
                                    left: 0,
                                    top: 0
                                  }}
                                >
                                  <TaskCard 
                                    task={task} 
                                    projectId={pk} 
                                    isDragging={snapshot.isDragging} 
                                    isLocked={!canDrag}
                                  />
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                        {col.tasks.length === 0 && snapshot.isDraggingOver && (
                          <div className="text-xs text-gray-400 text-center py-6 border-2 border-dashed rounded-lg">
                            Drop tasks here
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
