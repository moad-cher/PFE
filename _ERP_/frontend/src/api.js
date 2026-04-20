import axios from 'axios';

// Prefer same-origin through Vite proxy in development to avoid CORS issues.
// You can override via VITE_API_BASE / VITE_WS_BASE when needed.
const normalizeBase = (value, fallback) => {
  const base = (value || fallback).trim();
  return base.endsWith('/') ? base.slice(0, -1) : base;
};

export const API_BASE = normalizeBase(import.meta.env.VITE_API_BASE, '/api');

const normalizeWsFromHttp = (url) => {
  if (!url) return '';
  const normalized = url.trim().replace(/\/+$/, '');
  return normalized.replace(/^http:/i, 'ws:').replace(/^https:/i, 'wss:');
};

const isLocalDevHost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
const backendWsBase = normalizeWsFromHttp(import.meta.env.VITE_BACKEND_TARGET);
const defaultWsBase = import.meta.env.DEV && isLocalDevHost
  ? (backendWsBase || 'ws://127.0.0.1:8001')
  : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;
export const WS_BASE = normalizeBase(import.meta.env.VITE_WS_BASE, defaultWsBase);

export const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const res = await api.post('/auth/refresh', null, { params: { refresh_token: refreshToken } });
          localStorage.setItem('access_token', res.data.access_token);
          localStorage.setItem('refresh_token', res.data.refresh_token);
          originalRequest.headers.Authorization = `Bearer ${res.data.access_token}`;
          return api(originalRequest);
        } catch (err) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      } else {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ===================== Auth =====================
export const authLogin = (username, password) => {
  const params = new URLSearchParams();
  params.append('username', username);
  params.append('password', password);
  return api.post('/auth/token', params).then((res) => {
    localStorage.setItem('access_token', res.data.access_token);
    localStorage.setItem('refresh_token', res.data.refresh_token);
    return res;
  });
};

export const createUser = (userData) => api.post('/auth/register', userData);
export const getMe = () => api.get('/auth/me');

// ===================== Users =====================
export const getUsersMe = () => api.get('/users/me');
export const getUsersMeStats = () => api.get('/users/me/stats');
export const updateUsersMe = (data) => api.patch('/users/me', data);
export const updateUserAvatar = (file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/users/me/avatar', formData);
};
export const changePassword = (data) => api.post('/users/me/password', data);
export const listUsers = () => api.get('/users/');
export const getUser = (id) => api.get(`/users/${id}`);

// Admin endpoints
export const adminListUsers = () => api.get('/admin/users');
export const adminChangeRole = (id, role) => api.patch(`/admin/users/${id}/role`, { role });
export const adminAssignDepartment = (id, department_id) => api.patch(`/admin/users/${id}/department`, { department_id });
export const adminDeactivateUser = (id) => api.patch(`/admin/users/${id}/status`, { is_active: false });
export const adminActivateUser = (id) => api.patch(`/admin/users/${id}/status`, { is_active: true });
export const adminGetStats = () => api.get('/admin/stats');

// Legacy admin endpoints (backward compatibility)
export const adminListUsersLegacy = () => api.get('/users/admin/all');
export const adminUpdateUser = (id, data) => api.patch(`/users/admin/${id}`, data);

export const listDepartments = () => api.get('/departments/');
export const createDepartment = (data) => api.post('/departments/', data);
export const updateDepartment = (id, data) => api.patch(`/departments/${id}`, data);
export const deleteDepartment = (id) => api.delete(`/departments/${id}`);

// ===================== Projects =====================
export const getDashboard = () => api.get('/projects/dashboard');
export const getProjectStats = () => api.get('/projects/stats');
export const listProjects = () => api.get('/projects/');
export const createProject = (data) => api.post('/projects/', data);
export const getProject = (pk) => api.get(`/projects/${pk}`);
export const updateProject = (pk, data) => api.patch(`/projects/${pk}`, data);
export const deleteProject = (pk) => api.delete(`/projects/${pk}`);
export const getProjectConfig = (pk) => api.get(`/projects/${pk}/config`);
export const updateProjectConfig = (pk, data) => api.patch(`/projects/${pk}/config`, data);
export const getProjectStatuses = (pk) => api.get(`/projects/${pk}/statuses`);
export const createProjectStatus = (pk, data) => api.post(`/projects/${pk}/statuses`, data);
export const deleteProjectStatus = (pk, id) => api.delete(`/projects/${pk}/statuses/${id}`);
export const getKanban = (pk) => api.get(`/projects/${pk}/kanban`);
export const getScrum = (pk, params) => api.get(`/projects/${pk}/scrum`, { params });
export const searchProjectMembers = (pk, q, departmentId) => api.get(`/projects/${pk}/members/search`, { params: { q, department_id: departmentId } });
export const getProjectMembers = (pk) => api.get(`/projects/${pk}/members`);
export const addProjectMember = (pk, userId) => api.post(`/projects/${pk}/members/${userId}`);
export const removeProjectMember = (pk, userId) => api.delete(`/projects/${pk}/members/${userId}`);
export const getLeaderboard = (pk) => api.get(`/projects/${pk}/leaderboard`);
export const suggestAssignee = (pk, taskId) => api.post(`/projects/${pk}/tasks/${taskId}/suggest`);

// Sprints
export const getSprints = (pk) => api.get(`/projects/${pk}/sprints`);
export const createSprint = (pk, data) => api.post(`/projects/${pk}/sprints`, data);
export const updateSprint = (pk, sprintId, data) => api.patch(`/projects/${pk}/sprints/${sprintId}`, data);
export const deleteSprint = (pk, sprintId) => api.delete(`/projects/${pk}/sprints/${sprintId}`);

// ===================== Tasks =====================
export const listTasks = (projectId, params) =>
  api.get(`/projects/${projectId}/tasks/`, { params });
export const createTask = (projectId, data) =>
  api.post(`/projects/${projectId}/tasks/`, data);
export const getTask = (projectId, taskId) =>
  api.get(`/projects/${projectId}/tasks/${taskId}`);
export const updateTask = (projectId, taskId, data) =>
  api.patch(`/projects/${projectId}/tasks/${taskId}`, data);
export const deleteTask = (projectId, taskId) =>
  api.delete(`/projects/${projectId}/tasks/${taskId}`);
export const moveTask = (projectId, taskId, status) =>
  api.patch(`/projects/${projectId}/tasks/${taskId}/move`, { status });
export const reassignTask = (projectId, taskId, newAssigneeId) =>
  api.patch(`/projects/${projectId}/tasks/${taskId}/reassign`, null, {
    params: { new_assignee_id: newAssigneeId },
  });
export const getTaskComments = (projectId, taskId) =>
  api.get(`/projects/${projectId}/tasks/${taskId}/comments`);
export const createTaskComment = (projectId, taskId, content) =>
  api.post(`/projects/${projectId}/tasks/${taskId}/comments`, { content });

// ===================== Hiring =====================
export const listJobs = (status) =>
  api.get('/hiring/jobs', { params: status ? { status } : {} });
export const createJob = (data) => api.post('/hiring/jobs', data);
export const getJob = (id) => api.get(`/hiring/jobs/${id}`);
export const updateJob = (id, data) => api.patch(`/hiring/jobs/${id}`, data);
export const deleteJob = (id) => api.delete(`/hiring/jobs/${id}`);
export const listApplications = () => api.get('/hiring/applications');
export const getJobApplications = (id) => api.get(`/hiring/jobs/${id}/applications`);
export const applyToJob = (id, formData) =>
  api.post(`/hiring/jobs/${id}/apply`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
export const getApplication = (id) => api.get(`/hiring/applications/${id}`);
export const updateApplicationStatus = (id, status) =>
  api.patch(`/hiring/applications/${id}/status`, { status });
export const analyzeApplication = (id) =>
  api.post(`/hiring/applications/${id}/analyze`);
export const scheduleInterview = (id, data) =>
  api.post(`/hiring/applications/${id}/interviews`, data);
export const getInterviews = (id) => api.get(`/hiring/applications/${id}/interviews`);
export const getHRStats = () => api.get('/hiring/stats');

// ===================== Notifications =====================
export const listNotifications = () => api.get('/notifications/');
export const markAllRead = () => api.post('/notifications/mark-all-read');
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);

// ===================== Chat =====================
export const getProjectChat = (id, params) =>
  api.get(`/chat/project/${id}`, { params });
export const sendProjectMessage = (id, content) =>
  api.post(`/chat/project/${id}`, { content });
export const getTaskChat = (id, params) =>
  api.get(`/chat/task/${id}`, { params });
export const sendTaskMessage = (id, content) =>
  api.post(`/chat/task/${id}`, { content });
export const deleteChatMessage = (id) => api.delete(`/chat/message/${id}`);

// ===================== AI =====================
export const getAIStatus = () => api.get('/ai/status');
export const aiChat = (messages, system) =>
  api.post('/ai/chat', { messages, system_prompt: system });
export const aiSummarize = (text, maxWords, language) =>
  api.post('/ai/summarize', { text, max_words: maxWords, language });
export const aiGenerateDescription = (title, contextType) =>
  api.post('/ai/generate-description', { title, context: contextType });

// ===================== WebSocket helpers =====================
export const createChatWS = (roomType, pk) => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('No authentication token available');
  }
  return new WebSocket(`${WS_BASE}/ws/chat/${roomType}/${pk}`, [token]);
};

export const createNotificationsWS = () => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('No authentication token available');
  }
  return new WebSocket(`${WS_BASE}/ws/notifications`, [token]);
};

export const createAIStreamWS = () => {
  const token = localStorage.getItem('access_token');
  if (!token) {
    throw new Error('No authentication token available');
  }
  return new WebSocket(`${WS_BASE}/ws/ai/stream`, [token]);
};

// ===================== Analytics =====================
export const getAdminActivityTrend = (days = 30) => api.get(`/analytics/admin/activity-trend?days=${days}`);
export const getHRPipeline = () => api.get('/analytics/hr/pipeline');
export const getProjectOverview = (projectId) => api.get(`/analytics/project/${projectId}/overview`);
export const getProjectManagerOverview = () => api.get('/analytics/project-manager/overview');
export const getTeamMemberPerformance = () => api.get('/analytics/team-member/performance');

// ===================== Utility =====================
export const relativeTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
