import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import Guard from '../../../auth/Guard';
import NotificationDropdown from './NotificationDropdown';
import { API_BASE } from '../../../api';

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
  const location = useLocation();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  
  const currentTab = new URLSearchParams(location.search).get('tab');

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

  const getNavLinks = () => {
    const links = [];
    if (user?.role === 'admin' || user?.role === 'hr_manager') {
      links.push({ 
        id: 'administration', 
        name: 'Administration',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        )
      });
      links.push({ 
        id: 'hiring', 
        name: 'Hiring',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
      });
    }
    if (user?.role === 'admin' || user?.role === 'project_manager') {
      links.push({ 
        id: 'projects', 
        name: 'Projects',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        )
      });
    }
    if (user?.role === 'team_member' || links.length === 0) {
      links.push({ 
        id: 'tasks', 
        name: 'My Tasks',
        icon: (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        )
      });
    }
    return links;
  };

  const navLinks = getNavLinks();
  const linkIds = navLinks.map((link) => link.id);

  const resolveActiveTab = () => {
    if (location.pathname.startsWith('/hiring') && linkIds.includes('hiring')) {
      return 'hiring';
    }
    if (location.pathname.startsWith('/projects') && linkIds.includes('projects')) {
      return 'projects';
    }
    if (location.pathname.startsWith('/dashboard')) {
      return currentTab;
    }
    return currentTab;
  };

  const activeTab = resolveActiveTab();
  const resolvedTab = linkIds.includes(activeTab) ? activeTab : linkIds[0];

  const NavLink = ({ id, name, icon }) => {
    const isActive = resolvedTab === id;
    return (
      <Link
        to={`/dashboard?tab=${id}`}
        className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all relative min-w-max ${
          isActive ? 'text-purple-600' : 'text-gray-500 hover:text-purple-400'
        }`}
      >
        {icon}
        {name}
        {isActive && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 rounded-t-full" />
        )}
      </Link>
    );
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md shadow-lilac border-b border-purple-100/50 h-16">
      <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link
            to="/dashboard"
            style={{ fontFamily: 'lucida handwriting' }}
            className="inline-flex items-center gap-2 text-purple-300 font-bold text-xl tracking-tight hover:text-[#7C529A] transition-colors"
          >
            <img src="/log.png" alt="ERP logo" className="h-10 hover:scale-110 transition-transform" />
            <span>ERP</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <NavLink key={link.id} {...link} />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationDropdown />
          {/* ... user menu and mobile menu toggle ... */}

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
          {(user?.role === 'admin' || user?.role === 'hr_manager') && (
            <>
              <Link
                to="/dashboard?tab=administration"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Administration
              </Link>
              <Link
                to="/dashboard?tab=hiring"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Hiring
              </Link>
            </>
          )}
          {(user?.role === 'admin' || user?.role === 'project_manager') && (
            <Link
              to="/dashboard?tab=projects"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Projects
            </Link>
          )}
          {user?.role === 'team_member' && (
            <Link
              to="/dashboard?tab=tasks"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              My Tasks
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}



