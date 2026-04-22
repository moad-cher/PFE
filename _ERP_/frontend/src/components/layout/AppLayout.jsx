import Navbar from './Navbar';
import { Outlet } from 'react-router-dom';

export default function AppLayout() {
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
