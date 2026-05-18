import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RealTimeProvider } from './context/RealTimeContext';
import ProtectedRoute from './auth/ProtectedRoute';
import AppLayout from './components/shared/layout/AppLayout';
import PublicLayout from './components/shared/layout/PublicLayout';

import Login from './pages/auth/Login';
import Dashboard from './pages/dashboards/Dashboard';
import Profile from './pages/Profile';
import Unauthorized from './pages/auth/Unauthorized';

import ProjectDetail from './pages/projects/ProjectDetail';
import TaskEdit from './components/features/projects/TaskEdit';

import JobList from './pages/hiring/JobList';
import ApplicationDetail from './pages/hiring/ApplicationDetail';

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
            <Route path="/hiring/jobs/:id?" element={<JobList />} />
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
            <Route path="/projects/:pk" element={<ProjectDetail />} />
            <Route path="/projects/:pk/kanban" element={<Navigate to="../?tab=kanban" replace />} />
            <Route path="/projects/:pk/scrum" element={<Navigate to="../?tab=scrum" replace />} />
            <Route path="/projects/:pk/scrum3" element={<Navigate to="../?tab=scrum3" replace />} />
            <Route path="/projects/:pk/members" element={<Navigate to="../?tab=members" replace />} />
            <Route path="/projects/:pk/leaderboard" element={<Navigate to="../?tab=leaderboard" replace />} />
            <Route path="/projects/:pk/chat" element={<Navigate to="../?tab=chat" replace />} />

            {/* Hiring routes - Admin and HR Manager only */}
            <Route
              path="/hiring/applications/:id"
              element={
                <ProtectedRoute roles={['admin', 'hr_manager']}>
                  <ApplicationDetail />
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
