export default function TeamPerformanceSummary({ performance }) {
  if (!performance) return null;

  return (
    <div className="bg-white rounded-2xl p-6 border border-purple-100/50 shadow-lilac mb-8">
      <h2 className="text-xl font-semibold mb-4">📊 Your Performance (Last 30 Days)</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <p className="text-gray-500 text-sm">Completed</p>
          <p className="text-3xl font-bold">{performance.summary.completed_tasks}</p>
        </div>
        <div>
          <p className="text-gray-500 text-sm">On-Time Rate</p>
          <p className="text-3xl font-bold">
            {performance.summary.completed_tasks > 0
              ? Math.round((performance.summary.on_time_completions / performance.summary.completed_tasks) * 100)
              : 0}%
          </p>
        </div>
        <div>
          <p className="text-gray-500 text-sm">Active Projects</p>
          <p className="text-3xl font-bold">{Object.keys(performance.project_distribution || {}).length}</p>
        </div>
        <div>
          <p className="text-gray-500 text-sm">Total Points</p>
          <p className="text-3xl font-bold">{performance.summary.total_reward_points}</p>
        </div>
      </div>
    </div>
  );
}