import { Link } from 'react-router-dom';
import PriorityBadge from '../../ui/PriorityBadge';
import StatusBadge from '../../ui/StatusBadge';

export default function TeamTasksList({ myTasks }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">My Tasks</h2>
        <span className="text-sm text-gray-500">{myTasks.length} total</span>
      </div>
      {myTasks.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          No tasks assigned to you
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {myTasks.slice(0, 10).map((task) => (
            <Link
              key={task.id}
              to={`/projects/${task.project_id}/tasks/${task.id}`}
              className="block bg-white rounded-lg shadow-mauve border border-pink-100/30 p-4 card-hover group"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium text-gray-800 group-hover:text-purple-600 text-sm line-clamp-2 flex-1 transition-colors">
                  {task.title}
                </h4>
                <PriorityBadge priority={task.priority} className="flex-shrink-0" />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={task.status} />
                {task.project_name && (
                  <span className="text-xs text-purple-300">{task.project_name}</span>
                )}
              </div>
              {task.end_time && (
                <p className={`text-xs mt-2 ${task.is_overdue ? 'text-rose-400' : 'text-gray-400'}`}>
                  {task.is_overdue ? 'Overdue: ' : 'Due: '}
                  {new Date(task.end_time).toLocaleString()}
                </p>
              )}
              {task.points > 0 && (
                <span className="mt-2 inline-block text-xs bg-violet-100 text-violet-600 rounded-full px-2.5 py-0.5">
                  {task.points} pts
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}