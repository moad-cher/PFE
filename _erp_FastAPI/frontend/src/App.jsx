import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Unauthorized from './pages/Unauthorized';

import ProjectNew from './pages/projects/ProjectNew';
import ProjectDetail from './pages/projects/ProjectDetail';
import ProjectEdit from './pages/projects/ProjectEdit';
import ProjectSettings from './pages/projects/ProjectSettings';
import KanbanBoard from './pages/projects/KanbanBoard';
import ScrumBoard from './pages/projects/ScrumBoard';
import TaskNew from './pages/projects/TaskNew';
import TaskDetail from './pages/projects/TaskDetail';
import TaskEdit from './pages/projects/TaskEdit';
import Members from './pages/projects/Members';
import Leaderboard from './pages/projects/Leaderboard';
import ProjectChat from './pages/projects/ProjectChat';
import TaskChat from './pages/projects/TaskChat';

import JobList from './pages/hiring/JobList';
import JobNew from './pages/hiring/JobNew';
import JobDetail from './pages/hiring/JobDetail';
import JobEdit from './pages/hiring/JobEdit';
import Apply from './pages/hiring/Apply';
import ApplySuccess from './pages/hiring/ApplySuccess';
import ApplicationDetail from './pages/hiring/ApplicationDetail';
import InterviewSchedule from './pages/hiring/InterviewSchedule';

function AppLayout() {
  return (
    <div className="relative min-h-screen bg-transparent">
      {/* filter */}
      <div className="absolute inset-0 bg-white/35 pointer-events-none" aria-hidden="true" />
      <Navbar />
      <div className="relative z-10 pt-16">
        <Outlet />
      </div>
    </div>
  );
}

function PublicLayout() {
  const { user } = useAuth();
  
  return (
    <div className="relative min-h-screen bg-transparent">
      {/* filter */}
      <div className="absolute inset-0 bg-white/35 pointer-events-none" aria-hidden="true" />
      {user && <Navbar />}
      <div className={`relative z-10 ${user ? 'pt-16' : ''}`}>
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Navigate to="/login" replace />} />
            <Route path="/hiring/jobs" element={<JobList />} />
            <Route path="/hiring/jobs/:id" element={<JobDetail />} />
            <Route path="/hiring/jobs/:id/apply" element={<Apply />} />
            <Route path="/hiring/apply-success" element={<ApplySuccess />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
          </Route>

          {/* Protected routes with Navbar */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            
            {/* Project routes - Admin and Project Manager can create/edit */}
            <Route
              path="/projects/new"
              element={
                <ProtectedRoute roles={['admin', 'project_manager']}>
                  <ProjectNew />
                </ProtectedRoute>
              }
            />
            <Route path="/projects/:pk" element={<ProjectDetail />} />
            <Route path="/projects/:pk/edit" element={<ProjectEdit />} />
            <Route path="/projects/:pk/settings" element={<ProjectSettings />} />
            <Route path="/projects/:pk/kanban" element={<KanbanBoard />} />
            <Route path="/projects/:pk/scrum" element={<ScrumBoard />} />
            <Route
              path="/projects/:pk/tasks/new"
              element={
                <ProtectedRoute roles={['admin', 'project_manager']}>
                  <TaskNew />
                </ProtectedRoute>
              }
            />
            <Route path="/projects/:pk/tasks/:taskId" element={<TaskDetail />} />
            <Route path="/projects/:pk/tasks/:taskId/edit" element={<TaskEdit />} />
            <Route path="/projects/:pk/tasks/:taskId/chat" element={<TaskChat />} />
            <Route path="/projects/:pk/members" element={<Members />} />
            <Route path="/projects/:pk/leaderboard" element={<Leaderboard />} />
            <Route path="/projects/:pk/chat" element={<ProjectChat />} />

            {/* Hiring routes - Admin and HR Manager only */}
            <Route
              path="/hiring/jobs/new"
              element={
                <ProtectedRoute roles={['admin', 'hr_manager']}>
                  <JobNew />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hiring/jobs/:id/edit"
              element={
                <ProtectedRoute roles={['admin', 'hr_manager']}>
                  <JobEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hiring/applications/:id"
              element={
                <ProtectedRoute roles={['admin', 'hr_manager']}>
                  <ApplicationDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/hiring/applications/:id/interview"
              element={
                <ProtectedRoute roles={['admin', 'hr_manager']}>
                  <InterviewSchedule />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
