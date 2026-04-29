import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useRealTime } from '../../../context/RealTimeContext';
import {
  listNotifications,
  markAllRead,
  markNotificationRead,
  deleteNotification,
  relativeTime,
} from '../../../api';

export default function NotificationDropdown() {
  const { refreshUser } = useAuth();
  const { unreadCount, setUnreadCount, subscribe } = useRealTime();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
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
      }
    });
  }, [subscribe, refreshUser]);

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
              notifications.slice(0, 10).map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => !notif.is_read && onMarkRead(notif.id)}
                  className={`flex items-start gap-3 px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 transition-colors ${!notif.is_read ? 'bg-blue-50' : ''
                    }`}
                >
                  <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${!notif.is_read ? 'bg-blue-600' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 line-clamp-2">{notif.message || notif.content || 'New notification'}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{relativeTime(notif.created_at)}</p>
                  </div>
                  <button
                    onClick={(e) => onDelete(notif.id, e)}
                    className="text-gray-300 hover:text-red-500 flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
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



