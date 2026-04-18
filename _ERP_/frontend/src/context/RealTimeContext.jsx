import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { createNotificationsWS } from '../api';
import { useAuth } from './AuthContext';

const RealTimeContext = createContext(null);

export function RealTimeProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [unreadCount, setUnreadCount] = useState(0);
  const listeners = useRef(new Set());
  const wsRef = useRef(null);
  const reconnectTimeout = useRef(null);

  const subscribe = useCallback((callback) => {
    listeners.current.add(callback);
    return () => listeners.current.delete(callback);
  }, []);

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token || !userId) return;

    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const ws = createNotificationsWS();
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Basic notification handling (still needed for the bell icon)
          if (data.type === 'notification' || data.type === 'unread_count') {
            if (data.count !== undefined) setUnreadCount(data.count);
            else if (data.type === 'notification') setUnreadCount(prev => prev + 1);
          }

          // Dispatch to all subscribers (AI updates, messages, etc.)
          listeners.current.forEach(callback => callback(data));
        } catch (err) {
          console.error('RealTime WS parsing error', err);
        }
      };

      ws.onclose = () => {
        if (localStorage.getItem('token') && userId) {
          reconnectTimeout.current = setTimeout(connect, 3000);
        }
      };

      ws.onerror = () => {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      };
    } catch (err) {
      reconnectTimeout.current = setTimeout(connect, 3000);
    }
  }, [userId]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.onerror = null;
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      clearTimeout(reconnectTimeout.current);
    };
  }, [connect]);

  return (
    <RealTimeContext.Provider value={{ unreadCount, subscribe }}>
      {children}
    </RealTimeContext.Provider>
  );
}

export const useRealTime = () => useContext(RealTimeContext);
