export default function UserManagementTable({ 
  users, 
  filteredUsers, 
  searchTerm, 
  setSearchTerm, 
  roleFilter, 
  setRoleFilter, 
  statusFilter, 
  setStatusFilter, 
  departmentFilter, 
  setDepartmentFilter, 
  sortBy, 
  setSortBy, 
  sortOrder, 
  setSortOrder, 
  departments, 
  roleOptions, 
  onChangeRole, 
  onChangeDepartment, 
  onToggleActive, 
  onCreateUser 
}) {
  return (
    <div className="bg-white rounded-xl shadow-lilac border border-purple-100/50 overflow-hidden">
      <div className="p-6 border-b border-gray-200 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            {filteredUsers.length} shown of {users.length} total users
          </p>
        </div>
        <button
          type="button"
          onClick={onCreateUser}
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
              onClick={() => setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
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
            {filteredUsers.map((user) => (
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
                    onChange={(e) => onChangeRole(user.id, e.target.value)}
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
                    onChange={(e) => onChangeDepartment(user.id, e.target.value)}
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
                    onClick={() => onToggleActive(user.id, user.is_active)}
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
  );
}
