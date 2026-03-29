import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getKanban, moveTask, getProject } from '../../api';
import Spinner from '../../components/Spinner';
import PriorityBadge from '../../components/PriorityBadge';
import { useAuth } from '../../context/AuthContext';

function TaskCard({ task, projectId, isDragging }) {
  return (
    <div className={`bg-white rounded-xl border shadow-sm p-3 transition-shadow ${isDragging ? 'shadow-lg ring-2 ring-blue-400 rotate-2' : 'hover:shadow-md'}`}>
      <Link to={`/projects/${projectId}/tasks/${task.id}`} className="block">
        <p className="font-medium text-sm text-gray-900 hover:text-blue-600 line-clamp-2 mb-2">{task.title}</p>
      </Link>
      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <PriorityBadge priority={task.priority} />
        {task.time_slot && <span className="text-xs text-gray-400">{task.time_slot}</span>}
      </div>
      {task.deadline && (
        <p className={`text-xs mb-2 ${task.is_overdue ? 'text-red-500 font-medium' : task.deadline_approaching ? 'text-orange-500' : 'text-gray-400'}`}>
          {task.is_overdue ? '⚠ Overdue: ' : task.deadline_approaching ? '⏰ Due soon: ' : 'Due: '}
          {new Date(task.deadline).toLocaleDateString()}
        </p>
      )}
      {task.assigned_to?.length > 0 && (
        <div className="flex -space-x-1">
          {task.assigned_to.slice(0, 3).map(u => (
            <div key={u.id} title={u.username}
              className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] border-2 border-white">
              {u.username[0].toUpperCase()}
            </div>
          ))}
          {task.assigned_to.length > 3 && (
            <span className="text-xs text-gray-400 pl-2">+{task.assigned_to.length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function KanbanBoard() {
  const { pk } = useParams();
  const { user } = useAuth();
  const [columns, setColumns] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getKanban(pk), getProject(pk)])
      .then(([k, p]) => { setColumns(k.data); setProject(p.data); })
      .finally(() => setLoading(false));
  }, [pk]);

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    
    // Dropped outside a droppable area
    if (!destination) return;
    
    // Dropped in the same position
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    
    const taskId = parseInt(draggableId.replace('task-', ''));
    const sourceColSlug = source.droppableId;
    const destColSlug = destination.droppableId;
    
    // Optimistically update UI
    setColumns(prev => {
      const newColumns = [...prev];
      const sourceCol = newColumns.find(c => c.status.slug === sourceColSlug);
      const destCol = newColumns.find(c => c.status.slug === destColSlug);
      
      if (!sourceCol || !destCol) return prev;
      
      // Remove from source
      const [movedTask] = sourceCol.tasks.splice(source.index, 1);
      movedTask.status = destColSlug;
      
      // Add to destination
      destCol.tasks.splice(destination.index, 0, movedTask);
      
      return newColumns;
    });
    
    // If moved to a different column, update the backend
    if (sourceColSlug !== destColSlug) {
      try {
        await moveTask(pk, taskId, destColSlug);
      } catch (error) {
        // Revert on error by refetching
        const res = await getKanban(pk);
        setColumns(res.data);
      }
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;

  const isManager = user?.role === 'admin' || project?.manager?.id === user?.id;

  return (
    <div className="px-4 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link to={`/projects/${pk}`} className="hover:text-blue-600">← {project?.name}</Link>
            <span>/</span><span className="font-medium text-gray-700">Kanban</span>
          </div>
          <div className="flex gap-2">
            <Link to={`/projects/${pk}/scrum`} className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100">Scrum</Link>
            {isManager && (
              <Link to={`/projects/${pk}/tasks/new`} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">+ Task</Link>
            )}
          </div>
        </div>
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-4 overflow-x-auto pb-4 min-h-[70vh]">
            {columns.map(col => (
              <div key={col.status.id} className="flex-shrink-0 w-72">
                <div className="rounded-xl p-3" style={{ background: col.status.color + '22' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ background: col.status.color }} />
                      <span className="font-semibold text-sm text-gray-800">{col.status.name}</span>
                    </div>
                    <span className="text-xs bg-white px-2 py-0.5 rounded-full text-gray-500 shadow-sm">{col.tasks.length}</span>
                  </div>
                  <Droppable droppableId={col.status.slug}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-2 min-h-[100px] rounded-lg transition-colors ${snapshot.isDraggingOver ? 'bg-blue-50/50 ring-2 ring-blue-200 ring-dashed' : ''}`}
                      >
                        {col.tasks.map((task, index) => (
                          <Draggable key={task.id} draggableId={`task-${task.id}`} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                              >
                                <TaskCard task={task} projectId={pk} isDragging={snapshot.isDragging} />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {col.tasks.length === 0 && !snapshot.isDraggingOver && (
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
