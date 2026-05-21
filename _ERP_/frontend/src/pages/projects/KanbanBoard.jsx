import { useState, useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getKanban, moveTask, getProject, getTaskComments, relativeTime, createTaskComment, updateTask, formatDateTime, getStories } from './api';
import Spinner from './components/shared/ui/Spinner';
import PriorityBadge from './components/shared/ui/PriorityBadge';
import StatusBadge from './components/shared/ui/StatusBadge';
import { useAuth } from './context/AuthContext';
import Guard, { usePermissions } from './auth/Guard';
import TaskEdit from './components/features/projects/TaskEdit';

function TaskCard({ task, projectId, isDragging, isLocked, onEdit, isPM, isMyTask }) {
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
    <div className={`rounded-2xl border transition-all ${isMyTask ? 'bg-white border-purple-200 shadow-md ring-1 ring-purple-100' : 'bg-gray-50/90 border-gray-100 opacity-90'} ${isBlocked ? 'border-red-400 ring-2 ring-red-100' : ''} p-3 ${isDragging ? 'shadow-2xl ring-2 ring-purple-400 rotate-1 scale-105 cursor-grabbing z-50' : 'hover:shadow-lg card-hover'} ${isLocked ? 'opacity-75 grayscale-[0.2]' : ''}`}>
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
          <p className={`inline flex-1 font-bold text-sm group-hover/title:text-purple-600 line-clamp-2 mb-2 transition-colors ${isMyTask ? 'text-gray-900' : 'text-gray-600'}`}>{task.title}</p>
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

      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100/50">
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
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] border-2 border-white shadow-sm ${u.id === task.user_id ? 'bg-purple-600' : 'bg-gray-400'}`}>
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

  const colorMap = {
    purple: 'bg-purple-600',
    indigo: 'bg-indigo-600',
    red: 'bg-red-600',
    orange: 'bg-orange-600',
    blue: 'bg-blue-600',
    slate: 'bg-slate-600',
    gray: 'bg-gray-400'
  };

  return (
    <div className={`flex flex-col h-[calc(100vh-64px)] overflow-hidden ${isTab ? '' : ''}`}>
      {/* 1. FIXED HEADER & FILTERS */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-4 z-40">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            {!isTab && (
              <Link to={`/projects/${pk}`} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
            )}
            <div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                {activeSprint ? activeSprint.name : 'Project Kanban'}
                {activeSprint && <span className="ml-3 px-2.5 py-0.5 bg-green-100 text-green-700 text-[10px] font-black rounded-full uppercase tracking-widest">Active</span>}
              </h2>
            </div>
          </div>
          
          <div className="flex gap-4 items-center">
            <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-200">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3">View</span>
              {[
                { id: 'none', label: 'Flat' },
                { id: 'story', label: 'Story' },
                { id: 'assignee', label: 'User' },
                { id: 'priority', label: 'Rank' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setGroupBy(opt.id)}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${groupBy === opt.id ? 'bg-white text-purple-600 shadow-sm ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setShowOnlyMyTasks(!showOnlyMyTasks)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border ${showOnlyMyTasks ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-100' : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300'}`}
            >
              {showOnlyMyTasks ? 'My Tasks' : 'All Tasks'}
            </button>
          </div>
        </div>

        {/* 2. STICKY COLUMN HEADERS */}
        <div className="flex gap-6 mt-2">
          {columns.map(col => (
            <div key={col.status.id} className="flex-shrink-0 w-80 px-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <span className="w-3 h-3 rounded-full shadow-sm" style={{ background: col.status.color }} />
                  <span className="font-black text-[11px] text-gray-600 uppercase tracking-widest">{col.status.name}</span>
                </div>
                <span className="text-[10px] font-black bg-gray-100 px-2 py-0.5 rounded-full text-gray-400">
                  {col.tasks.filter(t => !showOnlyMyTasks || t.assigned_to?.some(u => u.id === user?.id)).length}
                </span>
              </div>
              {/* Thick Color Bar for Header */}
              <div className="h-1 w-full rounded-full opacity-60" style={{ backgroundColor: col.status.color }}></div>
            </div>
          ))}
        </div>
      </div>

      <TaskEdit 
        isOpen={!!editingTask} 
        onClose={() => { setEditingTask(null); }} 
        pk={pk} 
        taskId={editingTask?.id}
        onSuccess={fetchData} 
      />

      {/* 3. SCROLLABLE CONTENT WITH STICKY SWIMLANES */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-white custom-scrollbar pb-20">
        <DragDropContext onDragEnd={handleDragEnd}>
          {lanes.map((lane, laneIdx) => (
            <div key={lane.id} className="relative group">
              {/* STICKY SWIMLANE HEADER */}
              {groupBy !== 'none' && (
                <div className="sticky top-0 z-30 flex items-center bg-white/95 backdrop-blur-sm border-y border-gray-100 px-6 py-2.5 shadow-sm group-hover:bg-white transition-colors">
                  <div className={`w-1.5 h-5 rounded-full ${colorMap[lane.color]} mr-3 shadow-sm`}></div>
                  <h3 className="font-black text-gray-800 text-xs uppercase tracking-widest flex items-center gap-2">
                    {lane.title}
                    {lane.subtitle && <span className="text-[9px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">{lane.subtitle}</span>}
                  </h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-gray-100 to-transparent ml-4"></div>
                </div>
              )}

              <div className="flex gap-6 px-6 py-0">
                {columns.map((col) => {
                  const tasksInLane = col.tasks.filter(task => {
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

                  return (
                    <div key={`${lane.id}-${col.status.id}`} className="flex-shrink-0 w-80 relative group/col">
                      {/* 1. CONTINUOUS COLUMN TRACK TINT - BOLDER */}
                      <div 
                        className="absolute inset-0 opacity-[0.06] pointer-events-none border-x border-gray-100" 
                        style={{ backgroundColor: col.status.color }}
                      ></div>
                      
                      <Droppable droppableId={`${col.status.slug}|${lane.id}`}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`min-h-[150px] p-3 transition-all ${snapshot.isDraggingOver ? 'bg-white shadow-inner ring-2 ring-inset ring-purple-200' : ''}`}
                          >
                            <div className="space-y-4">
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
                                        className={snapshot.isDragging ? 'z-50' : ''}
                                        style={provided.draggableProps.style}
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
                            </div>
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </DragDropContext>
      </div>
    </div>
  );
}

