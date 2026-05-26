import { useState } from 'react';
import { getTaskComments, relativeTime, createTaskComment, updateTask, formatDateTime } from '../../../api';
import Spinner from '../../shared/ui/Spinner';
import PriorityBadge from '../../shared/ui/PriorityBadge';
import { useAuth } from '../../../context/AuthContext';

export default function TaskCard({ task, projectId, isDragging, isLocked, onEdit, isPM }) {
  const { user } = useAuth();
  const isAssignee = task.assigned_to?.some(a => a.id === user?.id || a === user?.id);
  const canEditTask = isPM || isAssignee;

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
    <div className={`bg-white/95 rounded-2xl border ${isBlocked ? 'border-red-400 ring-2 ring-red-100' : 'border-purple-100/40'} shadow-lilac p-3 transition-all ${isDragging ? 'shadow-lg ring-2 ring-purple-400 rotate-2 scale-105 cursor-grabbing z-50' : 'hover:shadow-md card-hover'} ${isLocked ? 'opacity-75 grayscale-[0.2]' : ''}`}>
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
          <p className="inline flex-1 font-medium text-sm text-gray-800 group-hover/title:text-purple-600 line-clamp-2 mb-2 transition-colors">{task.title}</p>
        {canEditTask && (
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
                  className="w-5 h-5 rounded-full bg-purple-200 flex items-center justify-center text-purple-700 text-[9px] border-2 border-white shadow-sm font-bold">
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
