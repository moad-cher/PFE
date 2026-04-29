export default function RoleBreakdownCard({ stats }) {
  return (
    <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6 h-full">
      <h3 className="font-semibold text-gray-900 mb-4">Role Breakdown</h3>
      <div className="space-y-3">
        {Object.entries(stats?.users_per_role || {}).map(([role, count]) => {
          const percentage = stats?.total_users ? Math.round((count / stats.total_users) * 100) : 0;
          return (
            <div key={role}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-gray-700 capitalize text-sm">{role.replace('_', ' ')}</span>
                <span className="font-semibold text-purple-600 text-sm">{count}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-500 h-2 rounded-full"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
