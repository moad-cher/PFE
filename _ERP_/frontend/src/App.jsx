import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RealTimeProvider } from './context/RealTimeContext';
import ProtectedRoute from './components/features/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import PublicLayout from './components/layout/PublicLayout';

import Login from './pages/auth/Login';
import Dashboard from './pages/dashboards/Dashboard';
import Profile from './pages/Profile';
import Unauthorized from './pages/auth/Unauthorized';

import ProjectNew from './pages/projects/ProjectNew';
import ProjectDetail from './pages/projects/ProjectDetail';
import ProjectEdit from './pages/projects/ProjectEdit';
import ProjectSettings from './pages/projects/ProjectSettings';
import KanbanBoard from './pages/projects/KanbanBoard';
import ScrumBoard from './pages/projects/ScrumBoard';
import TaskDetail from './pages/projects/TaskDetail';
import TaskEdit from './pages/projects/TaskEdit';
import Members from './pages/projects/Members';
import Leaderboard from './pages/projects/Leaderboard';
import ProjectChat from './pages/projects/ProjectChat';
import TaskChat from './pages/projects/TaskChat';

import JobList from './pages/hiring/JobList';
import JobDetail from './pages/hiring/JobDetail';
import Apply from './pages/hiring/Apply';
import ApplySuccess from './pages/hiring/ApplySuccess';
import ApplicationDetail from './pages/hiring/ApplicationDetail';
import InterviewSchedule from './pages/hiring/InterviewSchedule';

export default function App() {
  return (
    <AuthProvider>
      <RealTimeProvider>
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
            <Route path="/projects/:pk/tasks/:taskId" element={<TaskDetail />} />
            <Route path="/projects/:pk/tasks/:taskId/edit" element={<TaskEdit />} />
            <Route path="/projects/:pk/tasks/:taskId/chat" element={<TaskChat />} />
            <Route path="/projects/:pk/members" element={<Members />} />
            <Route path="/projects/:pk/leaderboard" element={<Leaderboard />} />
            <Route path="/projects/:pk/chat" element={<ProjectChat />} />

            {/* Hiring routes - Admin and HR Manager only */}
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
    </RealTimeProvider>
    </AuthProvider>
  );
}
