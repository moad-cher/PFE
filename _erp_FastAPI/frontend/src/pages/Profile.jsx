import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  getUsersMeStats,
  updateUsersMe,
  updateUserAvatar,
  changePassword,
  listProjects,
  API_BASE,
} from '../api';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    skills: '',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editSuccess, setEditSuccess] = useState('');
  const [editError, setEditError] = useState('');

  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setEditForm({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        skills: user.skills || '',
      });
    }
  }, [user]);

  useEffect(() => {
    Promise.all([
      getUsersMeStats().catch(() => ({ data: null })),
      listProjects().catch(() => ({ data: [] })),
    ])
      .then(([statsRes, projectsRes]) => {
        setStats(statsRes.data);
        setProjects(projectsRes.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
    setEditError('');
    setEditSuccess('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      await updateUsersMe(editForm);
      await refreshUser();
      setEditSuccess('Profile updated successfully!');
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Failed to update profile');
    } finally {
      setEditLoading(false);
    }
  };

  const handlePasswordChange = (e) => {
    setPasswordForm({ ...passwordForm, [e.target.name]: e.target.value });
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError('New passwords do not match');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    setPasswordLoading(true);
    try {
      await changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      setPasswordSuccess('Password changed successfully!');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setPasswordError(err.response?.data?.detail || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      await updateUserAvatar(file);
      await refreshUser();
    } catch (err) {
      console.error(err);
    } finally {
      setAvatarLoading(false);
    }
  };

  const roleLabel = {
    admin: 'Administrator',
    hr_manager: 'HR Manager',
    project_manager: 'Project Manager',
    team_member: 'Team Member',
  };

  if (!user) return null;

  const avatarUrl = user.avatar
    ? user.avatar.startsWith('http')
      ? user.avatar
      : `${API_BASE}${user.avatar}`
    : null;

  const initials = [user.first_name, user.last_name]
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .join('') || user.username?.[0]?.toUpperCase() || '?';

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">My Profile</h1>

      <div className="space-y-6">
        {/* Avatar & Basic Info */}
        <div className="bg-white rounded-2xl shadow p-6">
          <div className="flex items-start gap-6">
            <div className="relative">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={user.username}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white shadow"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow">
                  {initials}
                </div>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 shadow"
              >
                {avatarLoading ? (
                  <Spinner size="sm" className="border-white border-t-transparent" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900">
                {user.first_name} {user.last_name} {!user.first_name && user.username}
              </h2>
              <p className="text-gray-500 text-sm mt-0.5">@{user.username}</p>
              <p className="text-gray-500 text-sm">{user.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 font-medium">
                  {roleLabel[user.role] || user.role}
                </span>
                <span className="text-xs bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5 font-medium">
                  {user.reward_points || 0} pts
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          {loading ? (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <Spinner size="sm" />
              <span className="text-sm text-gray-400">Loading stats...</span>
            </div>
          ) : stats && (
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{stats.active_projects || 0}</p>
                <p className="text-xs text-gray-500">Active Projects</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{stats.tasks_done || 0}</p>
                <p className="text-xs text-gray-500">Tasks Done</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{stats.tasks_active || 0}</p>
                <p className="text-xs text-gray-500">Active Tasks</p>
              </div>
            </div>
          )}
        </div>

        {/* Edit Profile */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Edit Profile</h3>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
                {editSuccess}
              </div>
            )}
            {editError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {editError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First name</label>
                <input
                  type="text"
                  name="first_name"
                  value={editForm.first_name}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last name</label>
                <input
                  type="text"
                  name="last_name"
                  value={editForm.last_name}
                  onChange={handleEditChange}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={editForm.email}
                onChange={handleEditChange}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
              <textarea
                name="skills"
                value={editForm.skills}
                onChange={handleEditChange}
                rows={3}
                placeholder="e.g. Python, React, Project Management..."
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">List your skills, comma separated</p>
            </div>
            <button
              type="submit"
              disabled={editLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors flex items-center gap-2"
            >
              {editLoading && <Spinner size="sm" className="border-white border-t-transparent" />}
              Save Changes
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-white rounded-2xl shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Change Password</h3>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
                {passwordSuccess}
              </div>
            )}
            {passwordError && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                {passwordError}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Current password</label>
              <input
                type="password"
                name="current_password"
                value={passwordForm.current_password}
                onChange={handlePasswordChange}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
              <input
                type="password"
                name="new_password"
                value={passwordForm.new_password}
                onChange={handlePasswordChange}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm new password</label>
              <input
                type="password"
                name="confirm_password"
                value={passwordForm.confirm_password}
                onChange={handlePasswordChange}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={passwordLoading}
              className="px-6 py-2 bg-gray-800 text-white rounded-xl text-sm font-medium hover:bg-gray-900 disabled:opacity-60 transition-colors flex items-center gap-2"
            >
              {passwordLoading && <Spinner size="sm" className="border-white border-t-transparent" />}
              Update Password
            </button>
          </form>
        </div>

        {/* Projects */}
        {projects.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-6">
            <h3 className="font-semibold text-gray-900 mb-4">My Projects</h3>
            <div className="space-y-2">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                >
                  <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">
                    {project.name}
                  </span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
