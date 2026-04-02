import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';

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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-16">
        <Outlet />
      </div>
    </div>
  );
}

function PublicLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Outlet />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route element={<PublicLayout />}>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/hiring/jobs/:id/apply" element={<Apply />} />
            <Route path="/hiring/apply-success" element={<ApplySuccess />} />
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
            
            {/* Project routes */}
            <Route path="/projects/new" element={<ProjectNew />} />
            <Route path="/projects/:pk" element={<ProjectDetail />} />
            <Route path="/projects/:pk/edit" element={<ProjectEdit />} />
            <Route path="/projects/:pk/settings" element={<ProjectSettings />} />
            <Route path="/projects/:pk/kanban" element={<KanbanBoard />} />
            <Route path="/projects/:pk/scrum" element={<ScrumBoard />} />
            <Route path="/projects/:pk/tasks/new" element={<TaskNew />} />
            <Route path="/projects/:pk/tasks/:taskId" element={<TaskDetail />} />
            <Route path="/projects/:pk/tasks/:taskId/edit" element={<TaskEdit />} />
            <Route path="/projects/:pk/tasks/:taskId/chat" element={<TaskChat />} />
            <Route path="/projects/:pk/members" element={<Members />} />
            <Route path="/projects/:pk/leaderboard" element={<Leaderboard />} />
            <Route path="/projects/:pk/chat" element={<ProjectChat />} />

            {/* Hiring routes */}
            <Route path="/hiring/jobs" element={<JobList />} />
            <Route path="/hiring/jobs/new" element={<JobNew />} />
            <Route path="/hiring/jobs/:id" element={<JobDetail />} />
            <Route path="/hiring/jobs/:id/edit" element={<JobEdit />} />
            <Route path="/hiring/applications/:id" element={<ApplicationDetail />} />
            <Route path="/hiring/applications/:id/interview" element={<InterviewSchedule />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
