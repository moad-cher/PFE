export default function StatCard({ icon, label, value, color, subtext, trend }) {
  return (
    <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6 flex flex-col h-full hover:shadow-md transition-all">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center flex-shrink-0 shadow-sm`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-1">
            <p className="text-3xl font-bold text-gray-900 tracking-tight truncate">{value}</p>
            {trend && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded flex items-center ${trend > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
          {subtext && <p className="text-xs text-gray-400 mt-1 truncate">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}
