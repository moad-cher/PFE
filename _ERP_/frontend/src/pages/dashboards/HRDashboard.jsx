import { useState, useEffect, useMemo } from 'react';
import { 
  getHRStats, 
  listApplications, 
  listJobs, 
  createUser, 
  getHRPipeline, 
  adminListUsers, 
  listDepartments,
  createJob
} from '../../api';
import { cardRegistry } from '../../components/dashboard/cardRegistry';
import CreateUserModal from '../../components/features/admin/CreateUserModal';
import CreateJobModal from '../../components/features/hiring/CreateJobModal';
import DepartmentModal from '../../components/features/admin/DepartmentModal';
import Spinner from '../../components/ui/Spinner';

const HR_PIPELINE_COLORS = {
  pending: '#e74c3c',
  reviewed: '#3498db',
  interview: '#f39c12',
  accepted: '#2ecc71',
  rejected: '#6b7280',
};

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

  const aiScoreData = useMemo(() => {
    if (!pipeline?.ai_score_distribution) return [];
    return pipeline.ai_score_distribution.map(item => ({
      category: item.category,
      count: Number(item.count) || 0,
    }));
  }, [pipeline?.ai_score_distribution]);

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

  const jobsChartData = useMemo(() => {
    if (!pipeline?.jobs) return [];
    return pipeline.jobs.slice(0, 8).map(job => ({
      name: job.title.length > 20 ? job.title.slice(0, 20) + '...' : job.title,
      applications: Number(job.total_applications) || 0,
    }));
  }, [pipeline?.jobs]);

  const handleAction = (actionId) => {
    if (actionId === 'CREATE_USER') setCreateUserOpen(true);
    if (actionId === 'CREATE_JOB') setCreateJobOpen(true);
    if (actionId === 'MANAGE_DEPTS') setDepartmentModalOpen(true);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;
  if (error) return <div className="max-w-7xl mx-auto px-4 py-8"><div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div></div>;

  const dashboardCards = cardRegistry.filter(card => card.roles.includes('hr_manager'));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">HR Manager Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage recruiting pipeline and candidate applications</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardCards.map(card => {
          const CardComponent = card.component;
          const cardProps = {};
          
          if (card.id === 'hr-stats') cardProps.stats = stats;
          if (card.id === 'hr-conversion') { cardProps.pipeline = pipeline; cardProps.stats = stats; }
          if (card.id === 'hr-quick-actions') cardProps.onAction = handleAction;
          if (card.id === 'hr-charts') {
            cardProps.funnelData = funnelData;
            cardProps.jobsChartData = jobsChartData;
            cardProps.aiScoreData = aiScoreData;
          }
          if (card.id === 'hr-app-status') cardProps.stats = stats;
          if (card.id === 'hr-recent-jobs') cardProps.recentJobs = recentJobs;
          if (card.id === 'hr-recent-candidates') {
            cardProps.recentApplications = recentApplications;
            cardProps.getStatusColor = getStatusColor;
          }

          return (
            <div key={card.id} className={card.layout?.gridClass || ''}>
              <CardComponent {...cardProps} />
            </div>
          );
        })}
      </div>

      <CreateUserModal
        open={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        onSubmit={async (data) => { await createUser(data); loadData(); }}
        roleOptions={[
          { value: 'team_member', label: 'Team Member' },
          { value: 'project_manager', label: 'Project Manager' },
          { value: 'hr_manager', label: 'HR Manager' },
          { value: 'admin', label: 'Admin' },
        ]}
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
    </div>
  );
}
