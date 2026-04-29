export default function SystemStatusCard({ stats }) {
  return (
    <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6 h-full">
      <h3 className="font-semibold text-gray-900 mb-4">System Status</h3>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 text-sm">Database</span>
          <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span> Connected
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600 text-sm">API Server</span>
          <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span> Online
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600 text-sm">Total Tasks</span>
          <span className="text-gray-900 text-sm font-medium">{stats?.total_tasks || 0}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600 text-sm">Completion Rate</span>
          <span className="text-purple-600 text-sm font-medium">
            {stats?.total_tasks ? Math.round((stats.completed_tasks / stats.total_tasks) * 100) : 0}%
          </span>
        </div>
        <div className="pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-600 text-sm">User Activity Rate</span>
            <span className="text-purple-600 text-sm font-medium">
              {stats?.total_users ? Math.round((stats.active_count / stats.total_users) * 100) : 0}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full"
              style={{ width: `${stats?.total_users ? (stats.active_count / stats.total_users) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
