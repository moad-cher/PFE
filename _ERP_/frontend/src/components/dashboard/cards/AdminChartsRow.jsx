import DashboardChartCard from '../../ui/DashboardChartCard';
import DashboardChart, { CHART_TYPES } from '../../ui/DashboardChartRegistry';

export default function AdminChartsRow({ roleChartData, departmentChartData, taskStatsData }) {
  return (
    <div className="grid lg:grid-cols-4 lg:auto-rows-[320px] gap-6 mb-8">
      <DashboardChartCard 
        colSpan={2} 
        rowSpan={2} 
        title="Role Distribution" 
        hasData={roleChartData && roleChartData.length > 0}
      >
        <DashboardChart 
          type={CHART_TYPES.PIE} 
          data={roleChartData} 
          dataKey="value" 
          nameKey="name" 
        />
      </DashboardChartCard>
      
      <DashboardChartCard 
        title="Users per Department" 
        colSpan={2} 
        hasData={departmentChartData && departmentChartData.length > 0}
      >
        <DashboardChart 
          type={CHART_TYPES.BAR} 
          data={departmentChartData} 
          dataKey="value" 
          nameKey="name" 
          color="#8B5CF6"
          horizontal={true}
        />
      </DashboardChartCard>
      
      <DashboardChartCard 
        title="Task Status" 
        hasData={taskStatsData && taskStatsData.length > 0}
      >
        <DashboardChart 
          type={CHART_TYPES.PIE} 
          data={taskStatsData} 
          dataKey="value" 
          nameKey="name" 
        />
      </DashboardChartCard>
    </div>
  );
}
