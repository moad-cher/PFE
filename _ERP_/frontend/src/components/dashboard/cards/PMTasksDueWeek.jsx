import { Link } from 'react-router-dom';
import StatusBadge from '../../ui/StatusBadge';
import PriorityBadge from '../../ui/PriorityBadge';

export default function PMTasksDueWeek({ tasksDueThisWeek }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Due This Week</h2>
        <span className="text-sm text-gray-500">{tasksDueThisWeek.length} tasks</span>
      </div>

      {tasksDueThisWeek.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          No tasks due this week
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
          {tasksDueThisWeek.map((task) => (
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
                <p className="text-xs mt-2 text-gray-400">
                  Due: {new Date(task.end_time).toLocaleString()}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
