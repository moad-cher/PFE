import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Guard from '../features/auth/Guard';
import NotificationDropdown from './NotificationDropdown';
import { API_BASE } from '../../api';

function UserAvatar({ user, size = 8 }) {
  const initials = [user.first_name, user.last_name]
    .filter(Boolean)
    .map((n) => n[0].toUpperCase())
    .join('') || user.username?.[0]?.toUpperCase() || '?';

  if (user.avatar) {
    return (
      <img
        src={user.avatar.startsWith('http') ? user.avatar : `${API_BASE}${user.avatar}`}
        alt={user.username}
        className={`w-${size} h-${size} rounded-full object-cover`}
      />
    );
  }
  return (
    <div
      className={`w-${size} h-${size} rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium`}
    >
      {initials}
    </div>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md shadow-lilac border-b border-purple-100/50 h-16">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-6">
          <Link
            to="/dashboard"
            style={{ fontFamily: 'lucida handwriting' }}
            className="inline-flex items-center gap-2 text-purple-300 font-bold text-xl tracking-tight hover:text-[#7C529A] transition-colors"
          >
            <img
              src="/log.png"
              alt="ERP logo"
              className="h-10 hover:scale-110 transition-transform"
            />
            <span>ERP</span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              to="/dashboard"
              className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-colors"
            >
              Dashboard
            </Link>
            <Guard canManageProjects>
              <Link
                to="/projects/new"
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-purple-600 hover:bg-purple-50 transition-colors"
              >
                New Project
              </Link>
            </Guard>
            <Guard canManageHiring>
              <Link
                to="/hiring/jobs"
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-violet-600 hover:bg-violet-50 transition-colors"
              >
                Hiring
              </Link>
            </Guard>
            <Guard roles={['team_member', 'project_manager']}>
              <Link
                to="/hiring/jobs"
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-violet-600 hover:bg-violet-50 transition-colors"
              >
                Jobs
              </Link>
            </Guard>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <NotificationDropdown />

          {/* User menu */}
          <div className="relative" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen((v) => !v)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-purple-50 transition-colors"
            >
              {user && <UserAvatar user={user} />}
              <span className="hidden sm:block text-sm font-medium text-gray-700">
                {user?.first_name || user?.username}
              </span>
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white/95 backdrop-blur-sm rounded-2xl shadow-lilac border border-purple-100/50 py-1 z-50">
                <div className="px-4 py-2 border-b border-purple-100/50">
                  <p className="text-sm font-medium text-gray-800">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-purple-400">{user?.email}</p>
                  <span className="mt-1 inline-block text-xs bg-violet-100 text-violet-600 rounded-full px-2 py-0.5">
                    {user?.reward_points || 0} pts
                  </span>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-purple-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Profile
                </Link>
                <Guard canManageHiring>
                  <Link
                    to="/hiring/jobs"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Hiring
                  </Link>
                </Guard>
                <div className="border-t mt-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t px-4 py-2 space-y-1">
          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            Dashboard
          </Link>
          <Link
            to="/hiring/jobs"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            <Guard canManageHiring fallback="Jobs">Hiring</Guard>
          </Link>
          <Guard canManageProjects>
            <Link
              to="/projects/new"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              New Project
            </Link>
          </Guard>
        </div>
      )}
    </nav>
  );
}



