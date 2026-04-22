import { useAuth } from '../../context/AuthContext';
import Navbar from './Navbar';
import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
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
