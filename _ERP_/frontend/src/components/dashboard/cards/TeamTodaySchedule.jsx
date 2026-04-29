import { Link } from 'react-router-dom';

export default function TeamTodaySchedule({ todayTasks, morningTasks, afternoonTasks }) {
  if (todayTasks.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-6 border border-purple-100/50 shadow-lilac mb-8">
      <h2 className="text-xl font-semibold mb-4">📅 Today's Schedule</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {/* Morning Tasks */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            Morning ({morningTasks.length})
          </h3>
          {morningTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">No morning tasks</p>
          ) : (
            <div className="space-y-2">
              {morningTasks.map(task => (
                <Link
                  key={task.id}
                  to={`/projects/${task.project_id}/tasks/${task.id}`}
                  className="block bg-white rounded-lg p-2 border border-gray-100 hover:bg-purple-50 transition-colors"
                >
                  <p className="text-sm font-medium truncate">{task.title}</p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Afternoon Tasks */}
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            Afternoon ({afternoonTasks.length})
          </h3>
          {afternoonTasks.length === 0 ? (
            <p className="text-gray-500 text-sm">No afternoon tasks</p>
          ) : (
            <div className="space-y-2">
              {afternoonTasks.map(task => (
                <Link
                  key={task.id}
                  to={`/projects/${task.project_id}/tasks/${task.id}`}
                  className="block bg-white rounded-lg p-2 border border-gray-100 hover:bg-purple-50 transition-colors"
                >
                  <p className="text-sm font-medium truncate">{task.title}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}