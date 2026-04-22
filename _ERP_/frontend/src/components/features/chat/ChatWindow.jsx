import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { createChatWS, relativeTime, API_BASE } from '../../../api';
import Spinner from '../../ui/Spinner';

function Avatar({ user }) {
  const initials = [user.first_name, user.last_name]
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase() || user.username?.[0]?.toUpperCase() || '?';

  if (user.avatar) {
    return (
      <img
        src={user.avatar.startsWith('http') ? user.avatar : `${API_BASE}${user.avatar}`}
        alt={user.username}
        className="w-7 h-7 rounded-full object-cover flex-shrink-0"
      />
    );
  }
  return (
    <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
      {initials}
    </div>
  );
}

export default function ChatWindow({ roomType, pk }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [connected, setConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [typingUsers, setTypingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeout = useRef(null);
  const pingInterval = useRef(null);
  const typingTimeout = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    let ws;

    const connect = () => {
      try {
        ws = createChatWS(roomType, pk);
        wsRef.current = ws;

        ws.onopen = () => {
          setConnected(true);
          clearTimeout(reconnectTimeout.current);
          pingInterval.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'ping' }));
            }
          }, 30000);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'history') {
              setMessages(data.messages || []);
              setLoading(false);
            } else if (data.type === 'message') {
              setMessages((prev) => [...prev, data]);
            } else if (data.type === 'presence') {
              setOnlineCount(data.online_count || 0);
              // Optionally show join/leave system messages
            } else if (data.type === 'typing') {
              if (data.user_id !== user?.id) {
                setTypingUsers((prev) => {
                  if (!prev.find((u) => u.user_id === data.user_id)) {
                    return [...prev, data];
                  }
                  return prev;
                });
                setTimeout(() => {
                  setTypingUsers((prev) =>
                    prev.filter((u) => u.user_id !== data.user_id)
                  );
                }, 3000);
              }
            } else if (data.type === 'pong') {
              // keepalive acknowledged
            }
          } catch (_) {}
        };

        ws.onclose = (event) => {
          setConnected(false);
          setLoading(false);
          clearInterval(pingInterval.current);

          // Stop reconnect loops when backend explicitly rejects auth/access.
          if (event?.code === 1008 || event?.code === 4001) {
            console.warn('Chat WS rejected by backend; stopping auto-reconnect.', event.reason || event.code);
            return;
          }

          reconnectTimeout.current = setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          // Ignore transient errors; onclose handles actual disconnects.
          if (ws.readyState === WebSocket.CLOSED) ws.close();
        };
      } catch (err) {
        console.error('Chat WS connect error:', err);
        setLoading(false);
      }
    };

    connect();

    return () => {
      clearTimeout(reconnectTimeout.current);
      clearInterval(pingInterval.current);
      clearTimeout(typingTimeout.current);
      ws?.close();
    };
  }, [roomType, pk, user?.id]);

  const sendMessage = (e) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'message', content: trimmed }));
    setInput('');
  };

  const handleTyping = (e) => {
    setInput(e.target.value);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing' }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-10rem)] bg-white rounded-2xl shadow border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-indigo-600 text-white">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="font-semibold text-sm">
            {connected ? 'Connected' : 'Reconnecting...'}
          </span>
        </div>
        {onlineCount > 0 && (
          <span className="text-xs bg-indigo-500 rounded-full px-2 py-0.5">
            {onlineCount} online
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 chat-messages">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 text-sm py-8">
            No messages yet. Start the conversation!
          </div>
        )}
        {messages.map((msg, idx) => {
          const isOwn = msg.user_id === user?.id || msg.sender_id === user?.id;
          const senderName =
            msg.username ||
            msg.sender_username ||
            (msg.user ? msg.user.username : 'Unknown');
          const senderUser = msg.user || { username: senderName };

          return (
            <div
              key={msg.id || idx}
              className={`flex items-start gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}
            >
              <Avatar user={senderUser} />
              <div className={`max-w-xs lg:max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                <div className={`flex items-center gap-1 mb-0.5 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  <span className="text-xs font-medium text-gray-600">{senderName}</span>
                  <span className="text-xs text-gray-400">{relativeTime(msg.created_at)}</span>
                </div>
                <div
                  className={`px-3 py-2 rounded-2xl text-sm ${
                    isOwn
                      ? 'bg-indigo-600 text-white rounded-tr-sm'
                      : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <div className="flex gap-0.5">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            {typingUsers.map((u) => u.username).join(', ')} is typing...
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex items-center gap-2 px-4 py-3 border-t bg-gray-50">
        <input
          type="text"
          value={input}
          onChange={handleTyping}
          placeholder={connected ? 'Type a message...' : 'Reconnecting...'}
          disabled={!connected}
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!connected || !input.trim()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}



