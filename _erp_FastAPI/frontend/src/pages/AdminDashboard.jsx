import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminListUsers, adminGetStats, adminChangeRole, adminAssignDepartment, adminDeactivateUser, adminActivateUser, listDepartments, createUser, getAdminActivityTrend } from '../api';
import CreateUserModal from '../components/CreateUserModal';
import DepartmentModal from '../components/DepartmentModal';
import Spinner from '../components/Spinner';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LineChart, Line, CartesianGrid, AreaChart, Area } from 'recharts';

const CHART_COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#06B6D4', '#F97316'];

function StatCard({ icon, label, value, color, subtext }) {
  return (
    <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-600">{label}</p>
          {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
      </div>
    </div>
  );
}

function PieChartCard({ title, data, dataKey, nameKey }) {
  return (
    <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={40}
              paddingAngle={2}
              label={({ name, value }) => `${name}: ${value}`}
              labelLine={false}
            >
              {data.map((entry, index) => (
                <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
          No data available
        </div>
      )}
    </div>
  );
}

function BarChartCard({ title, data, dataKey, nameKey }) {
  const chartData = (data || []).map((item) => {
    const numericValue = Number(item?.[dataKey]);
    return {
      ...item,
      [dataKey]: Number.isFinite(numericValue) ? numericValue : 0,
      [nameKey]: item?.[nameKey] ?? 'Unknown',
    };
  });

  return (
    <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
            <XAxis type="number" />
            <YAxis type="category" dataKey={nameKey} width={100} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey={dataKey} fill="#8B5CF6" radius={[0, 4, 4, 0]} minPointSize={2} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
          No data available
        </div>
      )}
    </div>
  );
}

function LineChartCard({ title, data, dataKey, nameKey, color = "#8B5CF6" }) {
  return (
    <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
          No data available
        </div>
      )}
    </div>
  );
}

function AreaChartCard({ title, data, dataKeys, colors }) {
  return (
    <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6">
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {dataKeys.map((key, i) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[i]}
                fill={colors[i]}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
          No data available
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [activityTrend, setActivityTrend] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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
      const [usersRes, statsRes, deptsRes, trendRes] = await Promise.all([
        adminListUsers(),
        adminGetStats(),
        listDepartments(),
        getAdminActivityTrend(30),
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
      setDepartments(deptsRes.data);
      setActivityTrend(trendRes.data);
    } catch (err) {
      setError('Failed to load admin dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeRole = async (userId, newRole) => {
    if (!window.confirm(`Change user role to ${newRole}?`)) return;
    try {
      await adminChangeRole(userId, newRole);
      await loadData();
    } catch (err) {
      alert('Failed to change role: ' + (err.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleChangeDepartment = async (userId, departmentId) => {
    try {
      await adminAssignDepartment(userId, departmentId === '' ? null : parseInt(departmentId));
      await loadData();
    } catch (err) {
      alert('Failed to assign department: ' + (err.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleToggleActive = async (userId, isActive) => {
    if (isActive) {
      if (!window.confirm('Deactivate user? They will no longer be able to log in.')) return;
    }
    try {
      if (isActive) {
        await adminDeactivateUser(userId);
      } else {
        await adminActivateUser(userId);
      }
      await loadData();
    } catch (err) {
      alert('Failed to update status: ' + (err.response?.data?.detail || 'Unknown error'));
    }
  };

  const handleActivate = async (userId, username) => {
    if (!window.confirm(`Activate user "${username}"? They will be able to log in.`)) return;
    try {
      await adminActivateUser(userId);
      await loadData();
    } catch (err) {
      alert('Failed to activate user: ' + (err.response?.data?.detail || 'Unknown error'));
    }
  };

  const roleOptions = [
    { value: 'team_member', label: 'Team Member' },
    { value: 'project_manager', label: 'Project Manager' },
    { value: 'hr_manager', label: 'HR Manager' },
    { value: 'admin', label: 'Admin' },
  ];

  const handleCreateUser = async (userData) => {
    await createUser(userData);
    await loadData();
  };

  const filteredAndSortedUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = users.filter((user) => {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim().toLowerCase();
      const username = (user.username || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const departmentName = (user.department?.name || '').toLowerCase();

      const matchesSearch = !normalizedSearch
        || fullName.includes(normalizedSearch)
        || username.includes(normalizedSearch)
        || email.includes(normalizedSearch)
        || departmentName.includes(normalizedSearch);
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && user.is_active)
        || (statusFilter === 'inactive' && !user.is_active);
      const matchesDepartment = departmentFilter === 'all'
        || String(user.department?.id || '') === departmentFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesDepartment;
    });

    return [...filtered].sort((a, b) => {
      let aValue = '';
      let bValue = '';

      if (sortBy === 'name') {
        aValue = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
        bValue = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
      } else if (sortBy === 'email') {
        aValue = (a.email || '').toLowerCase();
        bValue = (b.email || '').toLowerCase();
      } else if (sortBy === 'role') {
        aValue = (a.role || '').toLowerCase();
        bValue = (b.role || '').toLowerCase();
      } else if (sortBy === 'department') {
        aValue = (a.department?.name || '').toLowerCase();
        bValue = (b.department?.name || '').toLowerCase();
      } else if (sortBy === 'status') {
        aValue = a.is_active ? 'active' : 'inactive';
        bValue = b.is_active ? 'active' : 'inactive';
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
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
    if (stats?.users_per_department) {
      if (Array.isArray(stats.users_per_department)) {
        return stats.users_per_department.map((row, index) => ({
          name: row?.name || row?.department || row?.department_name || `Department ${index + 1}`,
          value: Number(row?.value ?? row?.count ?? row?.users ?? row?.total ?? 0) || 0,
        }));
      }

      if (typeof stats.users_per_department === 'object') {
        return Object.entries(stats.users_per_department).map(([name, value]) => ({
          name,
          value: Number(value) || 0,
        }));
      }
    }

    const deptCounts = {};
    users.forEach(user => {
      const deptName = user.department?.name || 'No Department';
      deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
    });
    return Object.entries(deptCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [stats?.users_per_department, users]);

  const activityTrendData = useMemo(() => {
    if (!activityTrend) return [];
    // Merge users, tasks, and applications by day
    const allDays = new Set();
    activityTrend.users?.forEach(d => allDays.add(d.day));
    activityTrend.tasks?.forEach(d => allDays.add(d.day));
    activityTrend.applications?.forEach(d => allDays.add(d.day));

    return Array.from(allDays).sort((a, b) => a - b).map(day => {
      const userEntry = activityTrend.users?.find(d => d.day === day);
      const taskEntry = activityTrend.tasks?.find(d => d.day === day);
      const appEntry = activityTrend.applications?.find(d => d.day === day);
      return {
        day,
        users: userEntry?.users || 0,
        tasks: taskEntry?.tasks || 0,
        applications: appEntry?.applications || 0,
      };
    });
  }, [activityTrend]);

  const taskStatsData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: 'Completed', value: stats.completed_tasks || 0 },
      { name: 'Active', value: stats.active_tasks || 0 },
    ];
  }, [stats]);

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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">System overview and user management</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <StatCard
          label="Total Users"
          value={stats?.total_users || 0}
          color="bg-blue-100"
          icon={
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatCard
          label="Active"
          value={stats?.active_count || 0}
          color="bg-green-100"
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          subtext={`${stats?.total_users ? Math.round((stats.active_count / stats.total_users) * 100) : 0}% of total`}
        />
        <StatCard
          label="Inactive"
          value={stats?.inactive_count || 0}
          color="bg-red-100"
          icon={
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          }
        />
        <StatCard
          label="Departments"
          value={stats?.departments_count || departments.length}
          color="bg-purple-100"
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <StatCard
          label="Projects"
          value={stats?.total_projects || 0}
          color="bg-indigo-100"
          icon={
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          }
        />
        <StatCard
          label="New (7d)"
          value={stats?.new_users_this_week || 0}
          color="bg-pink-100"
          icon={
            <svg className="w-6 h-6 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          }
        />
      </div>

      {/* Activity Trend Chart 
      <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6 mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">Activity Trends (Last 30 Days)</h3>
        <AreaChartCard
          title=""
          data={activityTrendData}
          dataKeys={['users', 'tasks', 'applications']}
          colors={['#8B5CF6', '#10B981', '#F59E0B']}
        />
      </div>
      */}

      {/* Charts Row */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        <PieChartCard
          title="Role Distribution"
          data={roleChartData}
          dataKey="value"
          nameKey="name"
        />
        <BarChartCard
          title="Users per Department"
          data={departmentChartData}
          dataKey="value"
          nameKey="name"
        />
        <PieChartCard
          title="Task Status"
          data={taskStatsData}
          dataKey="value"
          nameKey="name"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Users per Role (List) */}
        <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6">
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

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => setCreateUserOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Create New User</p>
                <p className="text-xs text-gray-500">Add a new team member</p>
              </div>
            </button>
            <button
              onClick={() => setDepartmentModalOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900">Manage Departments</p>
                <p className="text-xs text-gray-500">View and edit departments</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/admin/')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {/* <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /> */}
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-900"></p>
                <p className="text-xs text-gray-500"></p>
              </div>
            </button>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6">
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
      </div>

      {/* User Management Table */}
      <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
            <p className="text-sm text-gray-600 mt-1">
              {filteredAndSortedUsers.length} shown of {users.length} total users
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreateUserOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create User
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search name, username, email..."
              className="lg:col-span-2 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Roles</option>
              {roleOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Departments</option>
              <option value="">No Department</option>
              {departments.map((dept) => (
                <option key={dept.id} value={String(dept.id)}>{dept.name}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="name">Sort: Name</option>
                <option value="email">Sort: Email</option>
                <option value="role">Sort: Role</option>
                <option value="department">Sort: Department</option>
                <option value="status">Sort: Status</option>
              </select>
              <button
                type="button"
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-500"
                title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAndSortedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className={`font-medium ${user.is_active ? "text-gray-600" : "text-gray-400"}`}>
                        {user.first_name} {user.last_name}
                      </div>
                      <div className={`text-sm ${user.is_active ? "text-gray-600" : "text-gray-400"}`}>@{user.username}</div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${user.is_active ? "text-gray-600" : "text-gray-400"}`}>
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => handleChangeRole(user.id, e.target.value)}
                      className={`text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500 ${user.is_active ? "border-gray-300" : "bg-gray-50 border-gray-200 text-gray-400"}`}
                      disabled={!user.is_active}
                    >
                      {roleOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.department?.id || ''}
                      onChange={(e) => handleChangeDepartment(user.id, e.target.value)}
                      className={`text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500 ${user.is_active ? "border-gray-300" : "bg-gray-50 border-gray-200 text-gray-400"}`}
                      disabled={!user.is_active}
                    >
                      <option value="">No Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(user.id, user.is_active)}
                      className={`px-2 py-1 text-xs font-medium rounded-full opacity-100 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-purple-300 ${user.is_active ? 'bg-green-100 text-green-800 hover:bg-green-200 hover:text-green-900' : 'bg-red-100 text-red-800 hover:bg-red-200 hover:text-red-900'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <CreateUserModal
        open={createUserOpen}
        onClose={() => setCreateUserOpen(false)}
        onSubmit={handleCreateUser}
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
