import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useRealTime } from '../../../context/RealTimeContext';
import {
  listNotifications,
  markAllRead,
  markNotificationRead,
  deleteNotification,
  relativeTime,
} from '../../../api';

const notifConfig = {
  application: {
    color: 'bg-blue-50',
    iconColor: 'text-blue-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  interview: {
    color: 'bg-orange-50',
    iconColor: 'text-orange-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  task_assigned: {
    color: 'bg-blue-50',
    iconColor: 'text-blue-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  task_updated: {
    color: 'bg-gray-100',
    iconColor: 'text-gray-600',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  task_blocked: {
    color: 'bg-red-50',
    iconColor: 'text-red-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  deadline: {
    color: 'bg-orange-50',
    iconColor: 'text-orange-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
  },
  reward: {
    color: 'bg-green-50',
    iconColor: 'text-green-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  default: {
    color: 'bg-blue-50',
    iconColor: 'text-blue-500',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  }
};

export default function NotificationDropdown() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const { unreadCount, setUnreadCount, subscribe } = useRealTime();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [expandedNotes, setExpandedNotes] = useState({});
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Load initial notifications
  useEffect(() => {
    listNotifications()
      .then((res) => {
        setNotifications(res.data || []);
      })
      .catch(() => { });
  }, []);

  // Listen for live updates via context
  useEffect(() => {
    return subscribe((data) => {
      if (data.type === 'notification') {
        setNotifications((prev) => {
          if (prev.some((n) => n.id === data.id)) return prev;
          return [data, ...prev.slice(0, 49)];
        });

        // Refresh user data if this is a reward notification
        const message = (data.message || data.content || '').toLowerCase();
        const isReward = message.includes('point') || message.includes('reward') || message.includes('earned');
        if (isReward) {
          refreshUser().catch(() => { });
        }
      } else if (data.type === 'notification_deleted') {
        setNotifications((prev) => {
          const target = prev.find((n) => n.id === data.id);
          if (target && !target.is_read) {
            setUnreadCount((count) => Math.max(0, count - 1));
          }
          return prev.filter((n) => n.id !== data.id);
        });
      } else if (data.type === 'points_revoked') {
        refreshUser().catch(() => { });
        // Optional: you could also show a toast here "Points revoked"
      }
    });
  }, [subscribe, refreshUser, setUnreadCount]);

  const handleMarkAll = async () => {
    try {
      await markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (_) { }
  };

  const onMarkRead = async (id) => {
    const target = notifications.find((n) => n.id === id);
    const wasUnread = Boolean(target && !target.is_read);
    try {
      await markNotificationRead(id);
      setNotifications((prev) => 
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (_) { }
  };

  const onDelete = async (id, e) => {
    e.stopPropagation();
    const target = notifications.find((n) => n.id === id);
    const wasUnread = Boolean(target && !target.is_read);
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (wasUnread) setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (_) { }
  };

  const handleNotifClick = (notif) => {
    if (!notif.is_read) {
      onMarkRead(notif.id);
    }
    if (notif.link) {
      setOpen(false);
      navigate(notif.link);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-xl shadow-lg border z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-blue-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-gray-500">
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 10).map((notif) => {
                const config = notifConfig[notif.type] || notifConfig.default;
                const text = notif.message || notif.content || 'New notification';
                const isLong = text.length > 55 || text.includes('\n');
                const isExpanded = !!expandedNotes[notif.id];

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotifClick(notif)}
                    className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 cursor-pointer transition-colors hover:opacity-80
                      ${!notif.is_read ? config.color : 'bg-white hover:bg-gray-50'}`}
                  >
                    <div className="flex-shrink-0 mt-1 relative">
                      <div className={`p-1.5 rounded-lg ${config.color} ${config.iconColor}`}>
                        {config.icon}
                      </div>
                      {!notif.is_read && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 mt-1">
                      <p className={`text-sm ${isExpanded ? '' : 'line-clamp-2'} ${!notif.is_read ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>
                        {text}
                      </p>
                      {isLong && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedNotes(prev => ({ ...prev, [notif.id]: !prev[notif.id] }));
                          }}
                          className="text-xs text-blue-500 mt-1 hover:underline font-medium"
                        >
                          {isExpanded ? 'Show less' : '...more'}
                        </button>
                      )}
                      <p className="text-xs text-gray-400 mt-1 font-medium">{relativeTime(notif.created_at)}</p>
                    </div>
                    <button
                      onClick={(e) => onDelete(notif.id, e)}
                      className="text-gray-300 hover:text-red-500 flex-shrink-0 mt-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-4 py-2 border-t text-right">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete all notifications? This cannot be undone.')) {
                  const unreadToRemove = notifications.filter((n) => !n.is_read).length;
                  setNotifications([]);
                  notifications.forEach(n => deleteNotification(n.id).catch(() => { }));
                  if (unreadToRemove > 0) {
                    setUnreadCount((prev) => Math.max(0, prev - unreadToRemove));
                  }
                }
              }}
              className="text-gray-300 hover:text-red-500 transition-colors"
            >
              Delete all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}



