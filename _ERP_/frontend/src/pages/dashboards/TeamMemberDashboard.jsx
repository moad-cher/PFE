import { useState, useEffect, useMemo } from 'react';
import { getDashboard, getTeamMemberPerformance } from '../../api';
import { useAuth } from '../../context/AuthContext';
import { cardRegistry } from '../../components/dashboard/cardRegistry';
import Spinner from '../../components/ui/Spinner';

const KANBAN_STATUS_COLORS = {
  todo: '#e74c3c',
  in_progress: '#f39c12',
  review: '#3498db',
  done: '#2ecc71',
};

export default function TeamMemberDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [performance, setPerformance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardRes, performanceRes] = await Promise.all([
        getDashboard(),
        getTeamMemberPerformance(),
      ]);
      setData(dashboardRes.data);
      setPerformance(performanceRes.data);
    } catch (err) {
      setError('Failed to load dashboard');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const myTasks = data?.my_tasks || [];
  const projects = data?.projects || [];

  // Filter today's tasks
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayTasks = myTasks.filter(task => {
    const scheduleRef = task.start_time || task.end_time;
    if (!scheduleRef || task.status === 'done') return false;
    const scheduledAt = new Date(scheduleRef);
    return scheduledAt >= today && scheduledAt < tomorrow;
  });

  const morningTasks = todayTasks.filter((t) => {
    const scheduleRef = t.start_time || t.end_time;
    if (!scheduleRef) return false;
    return new Date(scheduleRef).getHours() < 12;
  });
  const afternoonTasks = todayTasks.filter((t) => {
    const scheduleRef = t.start_time || t.end_time;
    if (!scheduleRef) return false;
    return new Date(scheduleRef).getHours() >= 12;
  });

  // Upcoming deadlines (next 7 days)
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const upcomingTasks = myTasks.filter(task => {
    if (!task.end_time || task.status === 'done') return false;
    const endTime = new Date(task.end_time);
    return endTime > today && endTime <= nextWeek;
  }).sort((a, b) => new Date(a.end_time) - new Date(b.end_time));

  const doneTasks = myTasks.filter((t) => t.status === 'done').length;
  const activeTasks = myTasks.filter((t) => t.status !== 'done').length;

  // Status distribution for chart
  const statusData = useMemo(() => {
    if (!performance?.status_distribution) return [];
    return Object.entries(performance.status_distribution).map(([name, value]) => ({
      name,
      value: Number(value) || 0,
      fill: KANBAN_STATUS_COLORS[name?.toLowerCase()] || undefined,
    }));
  }, [performance?.status_distribution]);

  // Project distribution for chart — new shape: [{project, total, todo, in_progress, review, done}, ...]
  const projectData = useMemo(() => {
    if (!performance?.project_distribution) return [];
    return performance.project_distribution.map(d => ({
      project: d.project,
      total: d.total,
      todo: d.todo || 0,
      in_progress: d.in_progress || 0,
      review: d.review || 0,
      done: d.done || 0,
    }));
  }, [performance?.project_distribution]);

  // Points history for line chart
  const pointsHistoryData = useMemo(() => {
    if (!performance?.points_history) return [];
    return performance.points_history.map(d => ({
      day: d.day,
      points: d.points,
    }));
  }, [performance?.points_history]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">{error}</div>
      </div>
    );
  }

  const dashboardCards = cardRegistry.filter(card => card.roles.includes('team_member'));

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Hello {user?.first_name || user?.username}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dashboardCards.map(card => {
          const CardComponent = card.component;
          const cardProps = {};

          if (card.id === 'team-stats') { cardProps.myTasks = myTasks; cardProps.activeTasks = activeTasks; cardProps.doneTasks = doneTasks; cardProps.performance = performance; cardProps.user = user; }
          if (card.id === 'team-performance') { cardProps.performance = performance; }
          if (card.id === 'team-schedule') { cardProps.todayTasks = todayTasks; cardProps.morningTasks = morningTasks; cardProps.afternoonTasks = afternoonTasks; }
          if (card.id === 'team-charts') { cardProps.statusData = statusData; cardProps.projectData = projectData; cardProps.pointsHistoryData = pointsHistoryData; }
          if (card.id === 'team-tasks') { cardProps.myTasks = myTasks; }
          if (card.id === 'team-deadlines') { cardProps.upcomingTasks = upcomingTasks; }

          return (
            <div key={card.id} className={card.layout?.gridClass || ''}>
              <CardComponent {...cardProps} />
            </div>
          );
        })}
      </div>
    </div>
  );
}





