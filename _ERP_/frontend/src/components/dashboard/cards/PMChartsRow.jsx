import DashboardChartCard from '../../ui/DashboardChartCard';
import DashboardChart, { CHART_TYPES } from '../../ui/DashboardChartRegistry';

const KANBAN_STATUS_COLORS = {
  todo: '#e74c3c',
  in_progress: '#f39c12',
  review: '#3498db',
  done: '#2ecc71',
};

export default function PMChartsRow({ projectCompletionData, taskStatusData }) {
  return (
    <div className="grid lg:grid-cols-2 lg:auto-rows-[320px] gap-6 mb-8">
      <DashboardChartCard
        title="Project Completion Rates"
        hasData={projectCompletionData && projectCompletionData.length > 0}
      >
        <DashboardChart 
          type={CHART_TYPES.BAR} 
          data={projectCompletionData} 
          dataKey="completion" 
          nameKey="name" 
          color={KANBAN_STATUS_COLORS.review} 
          horizontal={true}
        />
      </DashboardChartCard>
      
      <DashboardChartCard
        title="Task Status Distribution"
        hasData={taskStatusData && taskStatusData.length > 0}
      >
        <DashboardChart 
          type={CHART_TYPES.PIE} 
          data={taskStatusData} 
          dataKey="value" 
          nameKey="name" 
          colorMap={{
            completed: KANBAN_STATUS_COLORS.done,
            'in progress': KANBAN_STATUS_COLORS.in_progress,
          }}
        />
      </DashboardChartCard>
    </div>
  );
}
