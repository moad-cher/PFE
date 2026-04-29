import DashboardChartCard from '../../ui/DashboardChartCard';
import DashboardChart, { CHART_TYPES } from '../../ui/DashboardChartRegistry';

const KANBAN_STATUS_COLORS = {
  todo: '#e74c3c',
  in_progress: '#f39c12',
  review: '#3498db',
  done: '#2ecc71',
};

export default function TeamChartsRow({ statusData, projectData, pointsHistoryData }) {
  return (
    <div className="grid lg:grid-cols-3 lg:auto-rows-[300px] gap-6 mb-8">
      <DashboardChartCard
        title="Task Status"
        hasData={statusData && statusData.length > 0}
      >
        <DashboardChart 
          type={CHART_TYPES.PIE} 
          data={statusData} 
          dataKey="value" 
          nameKey="name" 
          colorMap={{
            done: KANBAN_STATUS_COLORS.done,
            in_progress: KANBAN_STATUS_COLORS.in_progress,
            review: KANBAN_STATUS_COLORS.review,
            todo: KANBAN_STATUS_COLORS.todo,
          }}
        />
      </DashboardChartCard>
      
      <DashboardChartCard
        title="Projects"
        hasData={projectData && projectData.length > 0}
      >
        <DashboardChart 
          type={CHART_TYPES.BAR} 
          data={projectData} 
          nameKey="project" 
          stacked={true}
          stackKeys={['todo', 'in_progress', 'review', 'done']}
          stackColors={[
            KANBAN_STATUS_COLORS.todo,
            KANBAN_STATUS_COLORS.in_progress,
            KANBAN_STATUS_COLORS.review,
            KANBAN_STATUS_COLORS.done
          ]}
        />
      </DashboardChartCard>
      
      <DashboardChartCard
        title="Points History"
        hasData={pointsHistoryData && pointsHistoryData.length > 0}
      >
        <DashboardChart 
          type={CHART_TYPES.LINE} 
          data={pointsHistoryData} 
          dataKey="points" 
          nameKey="day" 
          color="#F59E0B" 
        />
      </DashboardChartCard>
    </div>
  );
}