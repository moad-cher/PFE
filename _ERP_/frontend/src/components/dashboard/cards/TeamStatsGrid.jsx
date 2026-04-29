import StatsGridCard from './StatsGridCard';

export default function TeamStatsGrid({ myTasks, activeTasks, doneTasks, performance, user }) {
  const cards = [
    {
      id: 'team-my-tasks',
      label: 'My Tasks',
      value: myTasks.length,
      color: 'bg-blue-100',
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
    {
      id: 'team-active-tasks',
      label: 'Active Tasks',
      value: activeTasks,
      color: 'bg-orange-100',
      icon: (
        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'team-completed-tasks',
      label: 'Completed',
      value: doneTasks,
      color: 'bg-green-100',
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      subtext: `${performance?.summary?.on_time_completions || 0} on-time`,
    },
    {
      id: 'team-reward-points',
      label: 'Reward Points',
      value: performance?.summary?.total_reward_points || user?.reward_points || 0,
      color: 'bg-yellow-100',
      icon: (
        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      ),
      subtext: performance?.summary?.late_completions > 0 ? `${performance.summary.late_completions} late` : 'All on time!'
    },
  ];

  return (
    <StatsGridCard
      cards={cards}
      gridClassName="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
    />
  );
}