export default function PMProjectOverviewSummary({ overview }) {
  if (!overview?.projects || overview.projects.length === 0) return null;

  return (
    <div className="mt-8 bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Project Overview Summary</h3>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {overview.projects.slice(0, 6).map((proj) => (
          <div key={proj.id} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
            <h4 className="font-medium text-gray-900 truncate">{proj.name}</h4>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-gray-500">{proj.completed_tasks}/{proj.total_tasks} tasks</span>
              <span className="text-purple-600 font-medium">{proj.completion_rate}%</span>
            </div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-purple-500 h-1.5 rounded-full"
                style={{ width: `${proj.completion_rate}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
