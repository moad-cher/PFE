export default function HRApplicationsStatus({ stats }) {
  if (!stats?.applications_by_status || Object.keys(stats.applications_by_status).length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6 mb-8">
      <h3 className="font-semibold text-gray-900 mb-4">Applications by Status</h3>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(stats.applications_by_status).map(([status, count]) => (
          <div key={status} className="text-center p-4 rounded-lg bg-gray-50">
            <p className="text-2xl font-bold text-gray-900">{count}</p>
            <p className="text-sm text-gray-600 capitalize">{status}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
