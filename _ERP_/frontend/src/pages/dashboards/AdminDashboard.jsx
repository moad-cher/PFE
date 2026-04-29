import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  adminListUsers, 
  adminGetStats, 
  adminChangeRole, 
  adminAssignDepartment, 
  adminDeactivateUser, 
  adminActivateUser, 
  listDepartments, 
  createUser, 
  getAdminActivityTrend, 
  listProjects 
} from '../../api';
import { useAuth } from '../../context/AuthContext';
import { cardRegistry } from '../../components/dashboard/cardRegistry';
import CreateUserModal from '../../components/features/admin/CreateUserModal';
import DepartmentModal from '../../components/features/admin/DepartmentModal';
import Spinner from '../../components/ui/Spinner';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [activityTrend, setActivityTrend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Table filters/sort state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  
  const [createUserOpen, setCreateUserOpen] = useState(false);
  const [departmentModalOpen, setDepartmentModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, statsRes, deptsRes, trendRes, projectsRes] = await Promise.all([
        adminListUsers(),
        adminGetStats(),
        listDepartments(),
        getAdminActivityTrend(30),
        listProjects(),
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
      setDepartments(deptsRes.data);
      setActivityTrend(trendRes.data);
      setProjects(projectsRes.data);
    } catch (err) {
      setError('Failed to load admin dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: 'team_member', label: 'Team Member' },
    { value: 'project_manager', label: 'Project Manager' },
    { value: 'hr_manager', label: 'HR Manager' },
    { value: 'admin', label: 'Admin' },
  ];

  const filteredAndSortedUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const filtered = users.filter((u) => {
      const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim().toLowerCase();
      const uname = (u.username || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const deptName = (u.department?.name || '').toLowerCase();

      const matchesSearch = !normalizedSearch
        || fullName.includes(normalizedSearch)
        || uname.includes(normalizedSearch)
        || email.includes(normalizedSearch)
        || deptName.includes(normalizedSearch);
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && u.is_active)
        || (statusFilter === 'inactive' && !u.is_active);
      const matchesDept = departmentFilter === 'all'
        || String(u.department?.id || '') === departmentFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesDept;
    });

    return [...filtered].sort((a, b) => {
      let aV = '', bV = '';
      if (sortBy === 'name') {
        aV = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
        bV = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
      } else if (sortBy === 'email') {
        aV = (a.email || '').toLowerCase();
        bV = (b.email || '').toLowerCase();
      } else if (sortBy === 'role') {
        aV = (a.role || '').toLowerCase();
        bV = (b.role || '').toLowerCase();
      } else if (sortBy === 'department') {
        aV = (a.department?.name || '').toLowerCase();
        bV = (b.department?.name || '').toLowerCase();
      } else if (sortBy === 'status') {
        aV = a.is_active ? 'active' : 'inactive';
        bV = b.is_active ? 'active' : 'inactive';
      }
      if (aV < bV) return sortOrder === 'asc' ? -1 : 1;
      if (aV > bV) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [users, searchTerm, roleFilter, statusFilter, departmentFilter, sortBy, sortOrder]);

  const roleChartData = useMemo(() => {
    if (!stats?.users_per_role) return [];
    return Object.entries(stats.users_per_role).map(([role, count]) => ({
      name: role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
      value: count,
    }));
  }, [stats?.users_per_role]);

  const departmentChartData = useMemo(() => {
    if (!stats?.users_per_department) return [];
    if (typeof stats.users_per_department === 'object' && !Array.isArray(stats.users_per_department)) {
      return Object.entries(stats.users_per_department).map(([name, value]) => ({
        name,
        value: Number(value) || 0,
      }));
    }
    return [];
  }, [stats?.users_per_department]);

  const taskStatsData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Completed', value: stats.completed_tasks || 0 },
      { name: 'Active', value: stats.active_tasks || 0 },
    ];
  }, [stats]);

  const handleAction = (actionId) => {
    if (actionId === 'CREATE_USER') setCreateUserOpen(true);
    if (actionId === 'MANAGE_DEPTS') setDepartmentModalOpen(true);
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>;
  if (error) return <div className="max-w-7xl mx-auto px-4 py-8"><div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div></div>;

  const dashboardCards = cardRegistry.filter(card => card.roles.includes('admin'));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">System overview and user management</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardCards.map(card => {
          const CardComponent = card.component;
          
          // Map props based on card ID
          const cardProps = {};
          if (card.id === 'admin-stats') { cardProps.stats = stats; cardProps.departments = departments; }
          if (card.id === 'admin-charts') { 
            cardProps.roleChartData = roleChartData; 
            cardProps.departmentChartData = departmentChartData; 
            cardProps.taskStatsData = taskStatsData; 
          }
          if (card.id === 'admin-role-breakdown') { cardProps.stats = stats; }
          if (card.id === 'admin-quick-actions') { cardProps.onAction = handleAction; }
          if (card.id === 'admin-system-status') { cardProps.stats = stats; }
          if (card.id === 'admin-projects-overview') { cardProps.projects = projects; cardProps.onProjectClick = (id) => navigate(`/projects/${id}`); }
          if (card.id === 'admin-user-table') {
            Object.assign(cardProps, {
              users, filteredUsers: filteredAndSortedUsers, searchTerm, setSearchTerm,
              roleFilter, setRoleFilter, statusFilter, setStatusFilter, departmentFilter, setDepartmentFilter,
              sortBy, setSortBy, sortOrder, setSortOrder, departments, roleOptions,
              onChangeRole: async (uid, role) => { if(window.confirm(`Change role to ${role}?`)) { await adminChangeRole(uid, role); loadData(); }},
              onChangeDepartment: async (uid, did) => { await adminAssignDepartment(uid, did === '' ? null : parseInt(did)); loadData(); },
              onToggleActive: async (uid, active) => { if(active && !window.confirm('Deactivate user?')) return; if(active) await adminDeactivateUser(uid); else await adminActivateUser(uid); loadData(); },
              onCreateUser: () => setCreateUserOpen(true)
            });
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
        roleOptions={roleOptions}
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
