import { useState, useEffect, useMemo } from 'react';
import { adminListUsers, adminGetStats, adminChangeRole, adminAssignDepartment, adminDeactivateUser, listDepartments } from '../api';
import Spinner from '../components/Spinner';

function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
          {icon}
        </div>
        <div>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          <p className="text-sm text-gray-600">{label}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [usersRes, statsRes, deptsRes] = await Promise.all([
        adminListUsers(),
        adminGetStats(),
        listDepartments(),
      ]);
      setUsers(usersRes.data);
      setStats(statsRes.data);
      setDepartments(deptsRes.data);
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

  const handleDeactivate = async (userId, username) => {
    if (!window.confirm(`Deactivate user "${username}"? They will no longer be able to log in.`)) return;
    try {
      await adminDeactivateUser(userId);
      await loadData();
    } catch (err) {
      alert('Failed to deactivate user: ' + (err.response?.data?.detail || 'Unknown error'));
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
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Manage users, roles, and system settings</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
          label="Active Users"
          value={stats?.active_count || 0}
          color="bg-green-100"
          icon={
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Inactive Users"
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
          value={departments.length}
          color="bg-purple-100"
          icon={
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
      </div>

      {/* Breakdown Section */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Users per Role */}
        <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Users per Role</h3>
          <div className="space-y-3">
            {Object.entries(stats?.users_per_role || {}).map(([role, count]) => (
              <div key={role} className="flex items-center justify-between">
                <span className="text-gray-700 capitalize">{role.replace('_', ' ')}</span>
                <span className="font-semibold text-purple-600">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Users per Department */}
        <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Users per Department</h3>
          <div className="space-y-3">
            {Object.entries(stats?.users_per_department || {}).map(([dept, count]) => (
              <div key={dept} className="flex items-center justify-between">
                <span className="text-gray-700">{dept}</span>
                <span className="font-semibold text-purple-600">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* User Management Table */}
      <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredAndSortedUsers.length} shown of {users.length} total users
          </p>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAndSortedUsers.map((user) => (
                <tr key={user.id} className={`hover:bg-gray-50 ${!user.is_active ? 'opacity-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </div>
                      <div className="text-sm text-gray-500">@{user.username}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={user.role}
                      onChange={(e) => handleChangeRole(user.id, e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
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
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled={!user.is_active}
                    >
                      <option value="">No Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.is_active ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.is_active && (
                      <button
                        onClick={() => handleDeactivate(user.id, user.username)}
                        className="text-sm text-red-600 hover:text-red-800 font-medium"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
