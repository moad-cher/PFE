import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { getHRStats, listApplications, listJobs, createUser, getHRPipeline, adminListUsers, listDepartments } from '../../api';
import CreateUserModal from '../../components/features/admin/CreateUserModal';
import CreateJobModal from '../../components/features/hiring/CreateJobModal';
import DepartmentModal from '../../components/features/admin/DepartmentModal';
import Spinner from '../../components/ui/Spinner';
import DashboardChartCard from '../../components/ui/DashboardChartCard';
import StatCard from '../../components/ui/StatCard';
import DashboardChart, { CHART_TYPES } from '../../components/ui/DashboardChartRegistry';

const HR_PIPELINE_COLORS = {
  pending: '#e74c3c',
  reviewed: '#3498db',
  interview: '#f39c12',
  accepted: '#2ecc71',
  rejected: '#6b7280',
};

function ChartCard({ title, type, data, dataKey, nameKey, color, rowSpan, colSpan }) {
  return (
    <DashboardChartCard title={title} rowSpan={rowSpan} colSpan={colSpan} hasData={data && data.length > 0}>
      <DashboardChart 
        type={type} 
        data={data} 
        dataKey={dataKey} 
        nameKey={nameKey} 
        color={color} 
      />
    </DashboardChartCard>
  );
}

export default function HRDashboard() {
  const [stats, setStats] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [users, setUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [recentApplications, setRecentApplications] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [createJobOpen, setCreateJobOpen] = useState(false);
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statsRes, appsRes, jobsRes, pipelineRes, usersRes, deptsRes] = await Promise.all([
        getHRStats(),
        listApplications(),
        listJobs(),
        getHRPipeline(),
        adminListUsers(),
        listDepartments(),
      ]);
      setStats(statsRes.data);
      setRecentApplications(appsRes.data.slice(0, 10));
      setRecentJobs(jobsRes.data.slice(0, 5));
      setPipeline(pipelineRes.data);
      setUsers(usersRes.data);
      setDepartments(deptsRes.data);
    } catch (err) {
      setError('Failed to load HR dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      reviewed: 'bg-blue-100 text-blue-800',
      interview: 'bg-purple-100 text-purple-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const roleOptions = [
    { value: 'team_member', label: 'Team Member' },
    { value: 'project_manager', label: 'Project Manager' },
    { value: 'hr_manager', label: 'HR Manager' },
    { value: 'admin', label: 'Admin' },
  ];

  const handleCreateUser = async (userData) => {
    await createUser(userData);
  };

  // AI Score distribution chart data
  const aiScoreData = useMemo(() => {
    if (!pipeline?.ai_score_distribution) return [];
    return pipeline.ai_score_distribution.map(item => ({
      category: item.category,
      count: Number(item.count) || 0,
    }));
  }, [pipeline?.ai_score_distribution]);

  // Application status funnel data
  const funnelData = useMemo(() => {
    if (!stats?.applications_by_status) return [];
    const statusOrder = ['pending', 'reviewed', 'interview', 'accepted'];
    return statusOrder
      .map(status => ({
        name: status.charAt(0).toUpperCase() + status.slice(1),
        value: Number(stats.applications_by_status[status]) || 0,
        fill: HR_PIPELINE_COLORS[status],
      }))
      .filter(d => d.value > 0);
  }, [stats?.applications_by_status]);

  // Jobs with applications bar chart
  const jobsChartData = useMemo(() => {
    if (!pipeline?.jobs) return [];
    return pipeline.jobs.slice(0, 8).map(job => ({
      name: job.title.length > 20 ? job.title.slice(0, 20) + '...' : job.title,
      applications: Number(job.total_applications) || 0,
    }));
  }, [pipeline?.jobs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">HR Manager Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage recruiting pipeline and candidate applications</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Job Postings"
          value={stats?.total_job_postings || 0}
          color="bg-blue-100"
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          label="Open Postings"
          value={stats?.open_postings || 0}
          color="bg-green-100"
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Total Applicants"
          value={stats?.total_applicants || 0}
          color="bg-purple-100"
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatCard
          label="Avg AI Score"
          value={stats?.avg_ai_score?.toFixed(1) || '0.0'}
          color="bg-indigo-100"
          icon={
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
        />
      </div>

      {/* Conversion Metrics */}
      {pipeline?.conversion_metrics && (
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
      )}

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <button
          type="button"
          onClick={() => setCreateUserOpen(true)}
          className="bg-white rounded-xl p-6 card-hover group text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-1">Create User</h3>
              <p className="text-purple-500 text-sm">Add a new employee account</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setCreateJobOpen(true)}
          className="bg-white rounded-xl p-6 card-hover group text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-1">Create Job Posting</h3>
              <p className="text-purple-500 text-sm">Post a new job opportunity</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
          </div>
        </button>

        <Link
          to="/hiring/jobs"
          className="bg-white rounded-xl p-6 card-hover group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-1">Manage Job Postings</h3>
              <p className="text-purple-500 text-sm">View and edit all postings</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setDepartmentModalOpen(true)}
          className="bg-white rounded-xl p-6 card-hover group text-left"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg mb-1">Manage Departments</h3>
              <p className="text-purple-500 text-sm">View and edit departments</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center group-hover:bg-white/30 transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
        </button>
      </div>

      <CreateUserModal
        open={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        onSubmit={handleCreateUser}
        roleOptions={roleOptions}
      />

      <CreateJobModal
        open={createJobOpen}
        onClose={() => setCreateJobOpen(false)}
      />

      <DepartmentModal
        open={departmentModalOpen}
        onClose={() => setDepartmentModalOpen(false)}
        departments={departments}
        users={users}
        onRefresh={loadData}
      />

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 lg:auto-rows-[320px] gap-6 mb-8">
        <ChartCard
          rowSpan={2}
          title="Recruitment Funnel"
          type={CHART_TYPES.FUNNEL}
          data={funnelData}
        />
        <ChartCard
          colSpan={2}
          title="Applications per Job"
          type={CHART_TYPES.BAR}
          data={jobsChartData}
          dataKey="applications"
          nameKey="name"
          color="#10B981"
        />
        <ChartCard
          title="AI Score Distribution"
          type={CHART_TYPES.BAR}
          data={aiScoreData}
          dataKey="count"
          nameKey="category"
          color="#3498db"
        />
      </div>

      {/* Applications by Status */}
      {stats?.applications_by_status && Object.keys(stats.applications_by_status).length > 0 && (
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
      )}

      {/* Recent Jobs */}
      {recentJobs.length > 0 && (
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
      )}

      {/* Recent Candidates */}
      <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Candidates</h2>
          <p className="text-sm text-gray-600 mt-1">Latest applications received</p>
        </div>

        {recentApplications.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>No applications yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Candidate</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">AI Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">
                        {app.first_name} {app.last_name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {app.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {app.ai_score ? (
                        <span className={`text-sm font-medium ${app.ai_score >= 70 ? 'text-green-600' : app.ai_score >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {app.ai_score.toFixed(1)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        to={`/hiring/applications/${app.id}`}
                        className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}





