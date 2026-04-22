import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import HRDashboard from './HRDashboard';
import ProjectManagerDashboard from './ProjectManagerDashboard';
import TeamMemberDashboard from './TeamMemberDashboard';

export default function Dashboard() {
  const { user } = useAuth();

  // Route to role-specific dashboard
  if (!user) return null;

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'hr_manager':
      return <HRDashboard />;
    case 'project_manager':
      return <ProjectManagerDashboard />;
    case 'team_member':
      return <TeamMemberDashboard />;
    default:
      return <TeamMemberDashboard />;
  }
}
