import StatsGridCard from './StatsGridCard';

export default function PMStatsGrid({ overview, stats }) {
  const cards = [
    {
      id: 'pm-total-projects',
      label: 'Total Projects',
      value: overview?.summary?.total_projects || stats?.total_projects || 0,
      color: 'bg-blue-100',
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      id: 'pm-total-tasks',
      label: 'Total Tasks',
      value: overview?.summary?.total_tasks || stats?.total_tasks || 0,
      color: 'bg-purple-100',
      icon: (
        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      id: 'pm-completion-rate',
      label: 'Completion Rate',
      value: `${overview?.summary?.avg_completion_rate || stats?.completion_rate || 0}%`,
      color: 'bg-green-100',
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      subtext: `${overview?.summary?.total_completed || stats?.completed_tasks || 0} completed`,
    },
    {
      id: 'pm-overdue-tasks',
      label: 'Overdue Tasks',
      value: stats?.overdue_tasks || 0,
      color: 'bg-red-100',
      icon: (
        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <StatsGridCard
      cards={cards}
      gridClassName="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
    />
  );
}
