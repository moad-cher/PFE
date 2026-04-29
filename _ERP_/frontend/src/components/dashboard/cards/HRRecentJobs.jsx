import { Link } from 'react-router-dom';

export default function HRRecentJobs({ recentJobs }) {
  if (recentJobs.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Active Job Postings</h2>
        <Link to="/hiring/jobs" className="text-sm text-purple-600 hover:text-purple-800 font-medium">
          View all
        </Link>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {recentJobs.map((job) => (
          <Link
            key={job.id}
            to={`/hiring/jobs/${job.id}`}
            className="block p-4 rounded-xl border border-purple-100 bg-purple-50 hover:bg-purple-100 transition-colors"
          >
            <h4 className="font-semibold text-gray-900 truncate">{job.title}</h4>
            <p className="text-sm text-gray-600 mt-1">{job.department || 'All Departments'}</p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-xs bg-white px-2 py-1 rounded-full text-purple-600">
                {job.applications_count || 0} applicants
              </span>
              <span className={`text-xs px-2 py-1 rounded-full ${job.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {job.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
