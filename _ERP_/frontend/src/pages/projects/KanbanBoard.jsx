import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getKanban, moveTask, getProject, getTaskComments, relativeTime, createTaskComment, updateTask, formatDateTime } from '../../api';
import Spinner from '../../components/shared/ui/Spinner';
import PriorityBadge from '../../components/shared/ui/PriorityBadge';
import StatusBadge from '../../components/shared/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import Guard, { usePermissions } from '../../auth/Guard';
import TaskEdit from '../../components/features/projects/TaskEdit';

function TaskCard({ task, projectId, isDragging, isLocked, onEdit, isPM }) {
  const [showComments, setShowComments] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  
  const [isBlocked, setIsBlocked] = useState(task.is_blocked);
  const [blockerReason, setBlockerReason] = useState(task.blocker_reason || '');
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [updatingBlock, setUpdatingBlock] = useState(false);

  const toggleComments = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!showComments && comments.length === 0) {
      setLoadingComments(true);
      try {
        const res = await getTaskComments(projectId, task.id);
        setComments(res.data);
      } catch (err) {
        console.error('Failed to fetch comments:', err);
      } finally {
        setLoadingComments(false);
      }
    }
    setShowComments(!showComments);
    if (showDetails) setShowDetails(false);
    if (showBlockForm) setShowBlockForm(false);
  };

  const toggleDetails = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDetails(!showDetails);
    if (showComments) setShowComments(false);
    if (showBlockForm) setShowBlockForm(false);
  };

  const toggleBlockForm = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setShowBlockForm(!showBlockForm);
    if (showComments) setShowComments(false);
    if (showDetails) setShowDetails(false);
  };

  const handlePostComment = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!newComment.trim()) return;

    setPostingComment(true);
    try {
      const res = await createTaskComment(projectId, task.id, newComment);
      setComments(prev => [...prev, res.data]);
      setNewComment('');
    } catch (err) {
      alert('Failed to post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const handleBlockToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setUpdatingBlock(true);
    try {
      await updateTask(projectId, task.id, { 
        is_blocked: isBlocked,
        blocker_reason: isBlocked ? blockerReason : '' 
      });
      setShowBlockForm(false);
    } catch (err) {
      alert('Failed to update task status');
    } finally {
      setUpdatingBlock(false);
    }
  };

  return (
    <div className={`bg-white/95 rounded-2xl border ${isBlocked ? 'border-red-400 ring-2 ring-red-100' : 'border-purple-100/40'} shadow-lilac p-3 transition-all ${isDragging ? 'shadow-lg ring-2 ring-purple-400 rotate-2 scale-105 cursor-grabbing' : 'hover:shadow-md card-hover'} ${isLocked ? 'opacity-75 grayscale-[0.2]' : ''}`}>
      {isBlocked && (
        <div className="mb-2 flex items-center gap-1 bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tight w-fit">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
          </svg>
          Blocked
        </div>
      )}
      {isLocked && (
        <div className="absolute top-3 right-3 text-gray-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
      <div className="flex justify-between items-start gap-2">
        <div 
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(task); }} 
          className="block flex-1 cursor-pointer group/title"
        >
          <p className="font-medium text-sm text-gray-800 group-hover/title:text-purple-600 line-clamp-2 mb-2 transition-colors">{task.title}</p>
        </div>
        {isPM && (
          <button 
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(task); }}
            className="p-1 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Edit Task"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
        )}
      </div>
      
      {isBlocked && blockerReason && (
        <p className="text-[10px] text-red-600 bg-red-50 rounded-lg p-1.5 mb-2 italic line-clamp-2 border border-red-100">
          "{blockerReason}"
        </p>
      )}

      <div className="flex items-center gap-1.5 flex-wrap mb-2">
        <PriorityBadge priority={task.priority} />
      </div>

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-50">
        <div className="flex gap-1">
          <button 
            onClick={toggleDetails}
            className={`p-1.5 rounded-lg transition-colors ${showDetails ? 'bg-purple-100 text-purple-700' : 'text-gray-400 hover:bg-gray-100'}`}
            title="View Details"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button 
            onClick={toggleComments}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${showComments ? 'bg-purple-100 text-purple-700' : 'text-gray-400 hover:bg-gray-100'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {task.comments_count > 0 && <span>({task.comments_count})</span>}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!isLocked && (
            <button 
              onClick={toggleBlockForm}
              className={`p-1.5 rounded-lg transition-colors ${isBlocked ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-gray-400 hover:bg-gray-100'}`}
              title={isBlocked ? "Unblock Task" : "Flag as Blocked"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </button>
          )}

          {task.assigned_to?.length > 0 ? (
            <div className="flex -space-x-1">
              {task.assigned_to.slice(0, 3).map(u => (
                <div key={u.id} title={u.username}
                  className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-400 to-violet-500 flex items-center justify-center text-white text-[9px] border-2 border-white shadow-sm">
                  {u.username[0].toUpperCase()}
                </div>
              ))}
            </div>
          ) : <div className="w-5" />}
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-purple-50 space-y-3 text-[10px]" onClick={e => e.stopPropagation()}>
          {task.description && (
            <div className="bg-purple-50/30 rounded-lg p-2 border border-purple-100/50">
              <p className="text-gray-400 font-bold uppercase tracking-widest text-[8px] mb-1">Description</p>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{task.description}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex justify-between items-center bg-white p-1.5 rounded-md border border-purple-50/50">
              <span className="text-gray-500 font-medium">Start</span>
              <span className="text-gray-700 font-bold">{task.start_time ? formatDateTime(task.start_time) : '—'}</span>
            </div>
            <div className="flex justify-between items-center bg-white p-1.5 rounded-md border border-purple-50/50">
              <span className="text-gray-500 font-medium">End</span>
              <span className={task.is_overdue ? 'text-red-500 font-black' : task.deadline_approaching ? 'text-orange-500' : 'text-gray-700'}>
                {task.end_time ? formatDateTime(task.end_time) : '—'}
              </span>
            </div>
          </div>
          {task.completed_at && (
            <div className="flex justify-between bg-green-50 items-center p-1.5 rounded-md border border-green-100">
              <span className="text-green-600 font-medium">Completed</span>
              <span className="text-green-700 font-black">{formatDateTime(task.completed_at)}</span>
            </div>
          )}
          {task.points > 0 && (
            <div className="flex justify-between items-center bg-yellow-50/50 p-1.5 rounded-md border border-yellow-100/50">
              <span className="text-yellow-700 font-medium">Points</span>
              <span className="bg-yellow-200 text-yellow-900 rounded-full px-2 py-0.5 font-black">{task.points} pts</span>
            </div>
          )}
          {task.assigned_to?.length > 0 && (
            <div className="border-t border-purple-50/50 pt-2">
              <p className="text-gray-500 mb-1 font-bold uppercase text-[8px]">Assignees</p>
              <div className="flex flex-wrap gap-1">
                {task.assigned_to.map(u => (
                  <span key={u.id} className="bg-purple-50 text-purple-700 rounded-full px-2 py-0.5 font-bold border border-purple-100">{u.username}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {showBlockForm && !isLocked && (
        <div className="mt-3 pt-3 border-t border-red-50" onClick={e => e.stopPropagation()}>
          <div className="bg-red-50/50 border border-red-100 rounded-xl p-2 mb-2">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input 
                type="checkbox" 
                checked={isBlocked} 
                onChange={(e) => setIsBlocked(e.target.checked)}
                className="w-4 h-4 text-red-600 rounded focus:ring-red-500 border-red-300"
              />
              <span className="text-[10px] font-bold text-red-800">Flag as Blocked</span>
            </label>
            {isBlocked && (
              <textarea
                value={blockerReason}
                onChange={(e) => setBlockerReason(e.target.value)}
                placeholder="Reason for blocking..."
                rows={2}
                className="w-full text-[10px] p-2 border border-red-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400 bg-white"
              />
            )}
            <button
              onClick={handleBlockToggle}
              disabled={updatingBlock || (isBlocked && !blockerReason.trim())}
              className="mt-2 w-full py-1 bg-red-600 text-white rounded-lg text-[10px] font-bold hover:bg-red-700 disabled:opacity-50"
            >
              {updatingBlock ? 'Updating...' : 'Save Block Status'}
            </button>
          </div>
        </div>
      )}

      {showComments && (
        <div className="mt-3 pt-3 border-t border-purple-50" onClick={e => e.stopPropagation()}>
          <div className="max-h-32 overflow-y-auto pr-1 custom-scrollbar space-y-2 mb-3">
            {loadingComments ? (
              <div className="flex justify-center py-2"><Spinner size="sm" /></div>
            ) : comments.length === 0 ? (
              <p className="text-[10px] text-gray-400 text-center py-1 italic">No comments</p>
            ) : (
              comments.map(c => (
                <div key={c.id} className="bg-purple-50/50 rounded-lg p-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-purple-700">{c.author?.username}</span>
                    <span className="text-[9px] text-gray-400">{relativeTime(c.created_at)}</span>
                  </div>
                  <p className="text-[10px] text-gray-600 leading-tight">{c.content}</p>
                </div>
              ))
            )}
          </div>
          
          <form onSubmit={handlePostComment} className="flex gap-1.5" onClick={e => e.stopPropagation()}>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 text-[10px] px-2 py-1.5 border border-purple-100 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-400 bg-white"
            />
            <button
              type="submit"
              disabled={postingComment || !newComment.trim()}
              className="px-2 py-1 bg-purple-600 text-white rounded-lg text-[10px] font-bold hover:bg-purple-700 disabled:opacity-50"
            >
              Post
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default function KanbanBoard({ project: propProject, isTab, onRefresh }) {
  const { pk } = useParams();
  const { user } = useAuth();
  const { checkPM } = usePermissions();
  const [columns, setColumns] = useState([]);
  const [project, setProject] = useState(propProject || null);
  const [loading, setLoading] = useState(!propProject);
  const [editingTask, setEditingTask] = useState(null);
  const [showOnlyMyTasks, setShowOnlyMyTasks] = useState(false);

  const fetchData = () => {
    if (!propProject) setLoading(true);
    Promise.all([getKanban(pk), propProject ? Promise.resolve({ data: propProject }) : getProject(pk)])
      .then(([k, p]) => { 
        setColumns(k.data); 
        setProject(p.data); 
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
    const sourceColSlug = source.droppableId;
    const destColSlug = destination.droppableId;
    
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
      
      destCol.tasks.splice(destination.index, 0, updatedTask);
      
      newColumns[sourceColIndex] = sourceCol;
      if (sourceColSlug !== destColSlug) {
        newColumns[destColIndex] = destCol;
      }
      
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

  const activeSprint = project?.sprints?.find(s => s.status === 'active');
  const isPM = checkPM(project);

  return (
    <div className={`px-4 py-6 ${isTab ? '' : 'max-w-7xl mx-auto'}`}>
      {!isTab && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Link to={`/projects/${pk}`} className="hover:text-purple-600 transition-colors">← {project?.name}</Link>
            <span>/</span><span className="font-medium text-gray-700">Kanban</span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          {activeSprint ? (
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-900">{activeSprint.name}</h2>
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-tighter">Active Sprint</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-gray-400 italic">No Active Sprint</h2>
            </div>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <button 
            onClick={() => setShowOnlyMyTasks(!showOnlyMyTasks)}
            className={`px-3 py-1.5 text-sm rounded-xl transition-all border ${showOnlyMyTasks ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'}`}
          >
            {showOnlyMyTasks ? '👤 My Tasks' : '👥 All Tasks'}
          </button>
        </div>
      </div>

      <TaskEdit 
        isOpen={!!editingTask} 
        onClose={() => { setEditingTask(null); }} 
        pk={pk} 
        taskId={editingTask?.id}
        onSuccess={fetchData} 
      />

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4 min-h-[70vh]">
          {columns.map((col, colIndex) => {
            const displayedTasks = col.tasks.filter(task => !showOnlyMyTasks || task.assigned_to?.some(u => u.id === user?.id));
            
            return (
              <div key={col.status.id} className="flex-shrink-0 w-72">
                <div className={`${colIndex % 2 === 0 ? 'rounded-2xl' : 'rounded-xl'} p-3 backdrop-blur-sm`} style={{ background: col.status.color + '18' }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shadow-sm" style={{ background: col.status.color }} />
                      <span className="font-semibold text-sm text-gray-700">{col.status.name}</span>
                    </div>
                    <span className="text-xs bg-white/80 px-2 py-0.5 rounded-full text-gray-500 shadow-sm">{displayedTasks.length}</span>
                  </div>
                  <Droppable droppableId={col.status.slug}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`space-y-2 min-h-[100px] rounded-xl transition-colors ${snapshot.isDraggingOver ? 'bg-purple-50/50 ring-2 ring-purple-200 ring-dashed' : ''}`}
                      >
                        {displayedTasks.map((task, index) => {
                          const isAssignee = task.assigned_to?.some(u => u.id === user?.id);
                          const canDrag = isPM || isAssignee;
                          
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
                                    isPM={isPM}
                                    onEdit={(t) => setEditingTask(t)}
                                  />
                                </div>
                              )}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                        {displayedTasks.length === 0 && snapshot.isDraggingOver && (
                          <div className="text-xs text-gray-400 text-center py-6 border-2 border-dashed rounded-lg">
                            Drop tasks here
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}
