import AdminUserStats from './cards/AdminUserStats';
import AdminChartsRow from './cards/AdminChartsRow';
import RoleBreakdownCard from './cards/RoleBreakdownCard';
import QuickActionsCard from './cards/QuickActionsCard';
import SystemStatusCard from './cards/SystemStatusCard';
import ProjectsOverviewCard from './cards/ProjectsOverviewCard';
import UserManagementTable from './cards/UserManagementTable';

import HRStatsGrid from './cards/HRStatsGrid';
import HRConversionMetrics from './cards/HRConversionMetrics';
import HRQuickActions from './cards/HRQuickActions';
import HRChartsRow from './cards/HRChartsRow';
import HRApplicationsStatus from './cards/HRApplicationsStatus';
import HRRecentJobs from './cards/HRRecentJobs';
import HRRecentCandidates from './cards/HRRecentCandidates';

import PMStatsGrid from './cards/PMStatsGrid';
import PMChartsRow from './cards/PMChartsRow';
import PMProjectsList from './cards/PMProjectsList';
import PMTasksDueWeek from './cards/PMTasksDueWeek';
import PMProjectOverviewSummary from './cards/PMProjectOverviewSummary';

import TeamStatsGrid from './cards/TeamStatsGrid';
import TeamPerformanceSummary from './cards/TeamPerformanceSummary';
import TeamTodaySchedule from './cards/TeamTodaySchedule';
import TeamChartsRow from './cards/TeamChartsRow';
import TeamTasksList from './cards/TeamTasksList';
import TeamUpcomingDeadlines from './cards/TeamUpcomingDeadlines';

export const cardRegistry = [
  // ===================== Admin Cards =====================
  {
    id: 'admin-stats',
    roles: ['admin'],
    component: AdminUserStats,
    layout: { gridClass: 'col-span-full' }
  },
  {
    id: 'admin-charts',
    roles: ['admin'],
    component: AdminChartsRow,
    layout: { gridClass: 'col-span-full' }
  },
  {
    id: 'admin-role-breakdown',
    roles: ['admin'],
    component: RoleBreakdownCard,
    layout: { gridClass: 'lg:col-span-1' }
  },
  {
    id: 'admin-quick-actions',
    roles: ['admin'],
    component: QuickActionsCard,
    layout: { gridClass: 'lg:col-span-1' },
    actions: [
      { id: 'create-user', label: 'Create User', type: 'primary' },
      { id: 'manage-depts', label: 'Manage Departments', type: 'secondary' }
    ]
  },
  {
    id: 'admin-system-status',
    roles: ['admin'],
    component: SystemStatusCard,
    layout: { gridClass: 'lg:col-span-1' }
  },
  {
    id: 'admin-projects-overview',
    roles: ['admin'],
    component: ProjectsOverviewCard,
    layout: { gridClass: 'col-span-full' }
  },
  {
    id: 'admin-user-table',
    roles: ['admin'],
    component: UserManagementTable,
    layout: { gridClass: 'col-span-full' }
  },

  // ===================== HR Cards =====================
  {
    id: 'hr-stats',
    roles: ['hr_manager'],
    component: HRStatsGrid,
    layout: { gridClass: 'col-span-full' }
  },
  {
    id: 'hr-conversion',
    roles: ['hr_manager'],
    component: HRConversionMetrics,
    layout: { gridClass: 'col-span-full' }
  },
  {
    id: 'hr-quick-actions',
    roles: ['hr_manager'],
    component: HRQuickActions,
    layout: { gridClass: 'col-span-full' }
  },
  {
    id: 'hr-charts',
    roles: ['hr_manager'],
    component: HRChartsRow,
    layout: { gridClass: 'col-span-full' }
  },
  {
    id: 'hr-app-status',
    roles: ['hr_manager'],
    component: HRApplicationsStatus,
    layout: { gridClass: 'col-span-full' }
  },
  {
    id: 'hr-recent-jobs',
    roles: ['hr_manager'],
    component: HRRecentJobs,
    layout: { gridClass: 'col-span-full' }
  },
  {
    id: 'hr-recent-candidates',
    roles: ['hr_manager'],
    component: HRRecentCandidates,
    layout: { gridClass: 'col-span-full' }
  },

  // ===================== PM Cards =====================
  {
    id: 'pm-stats',
    roles: ['project_manager'],
    component: PMStatsGrid,
    layout: { gridClass: 'col-span-full' }
  },
  {
    id: 'pm-charts',
    roles: ['project_manager'],
    component: PMChartsRow,
    layout: { gridClass: 'col-span-full' }
  },
  {
    id: 'pm-projects-list',
    roles: ['project_manager'],
    component: PMProjectsList,
    layout: { gridClass: 'lg:col-span-1' }
  },
  {
    id: 'pm-tasks-due',
    roles: ['project_manager'],
    component: PMTasksDueWeek,
    layout: { gridClass: 'lg:col-span-1' }
  },
  {
    id: 'pm-overview-summary',
    roles: ['project_manager'],
    component: PMProjectOverviewSummary,
    layout: { gridClass: 'col-span-full' }
  },

  // ===================== Team Member Cards =====================
  {
    id: 'team-stats',
    roles: ['team_member'],
    component: TeamStatsGrid,
    layout: { gridClass: 'col-span-full' }
  },
  {
    id: 'team-performance',
    roles: ['team_member'],
    component: TeamPerformanceSummary,
    layout: { gridClass: 'col-span-full' }
  },
  {
    id: 'team-schedule',
    roles: ['team_member'],
    component: TeamTodaySchedule,
    layout: { gridClass: 'col-span-full' }
  },
  {
    id: 'team-charts',
    roles: ['team_member'],
    component: TeamChartsRow,
    layout: { gridClass: 'col-span-full' }
  },
  {
    id: 'team-tasks',
    roles: ['team_member'],
    component: TeamTasksList,
    layout: { gridClass: 'lg:col-span-1' }
  },
  {
    id: 'team-deadlines',
    roles: ['team_member'],
    component: TeamUpcomingDeadlines,
    layout: { gridClass: 'lg:col-span-1' }
  }
];
