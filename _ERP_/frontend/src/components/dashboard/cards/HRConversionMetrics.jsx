export default function HRConversionMetrics({ pipeline, stats }) {
  if (!pipeline?.conversion_metrics) return null;
  
  return (
    <div className="bg-white rounded-2xl p-6 border border-purple-100/50 shadow-lilac mb-8">
      <h2 className="text-xl font-semibold mb-4">Recruiting Conversion Metrics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div>
          <p className="text-gray-500 text-sm">Total Applications</p>
          <p className="text-3xl font-bold">{pipeline.conversion_metrics.total_applications}</p>
        </div>
        <div>
          <p className="text-gray-500 text-sm">Interviews</p>
          <p className="text-3xl font-bold">{pipeline.conversion_metrics.interviewed}</p>
          <p className="text-xs text-gray-500">{pipeline.conversion_metrics.interview_rate}% rate</p>
        </div>
        <div>
          <p className="text-gray-500 text-sm">Accepted</p>
          <p className="text-3xl font-bold">{pipeline.conversion_metrics.accepted}</p>
          <p className="text-xs text-gray-500">{pipeline.conversion_metrics.conversion_rate}% rate</p>
        </div>
        <div>
          <p className="text-gray-500 text-sm">Avg per Job</p>
          <p className="text-3xl font-bold">{stats?.candidates_per_posting?.toFixed(1) || '0.0'}</p>
        </div>
      </div>
    </div>
  );
}
