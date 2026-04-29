import DashboardChartCard from '../../ui/DashboardChartCard';
import DashboardChart, { CHART_TYPES } from '../../ui/DashboardChartRegistry';

export default function HRChartsRow({ funnelData, jobsChartData, aiScoreData }) {
  return (
    <div className="grid lg:grid-cols-3 lg:auto-rows-[320px] gap-6 mb-8">
      <DashboardChartCard
        rowSpan={2}
        title="Recruitment Funnel"
        hasData={funnelData && funnelData.length > 0}
      >
        <DashboardChart 
          type={CHART_TYPES.FUNNEL} 
          data={funnelData} 
        />
      </DashboardChartCard>

      <DashboardChartCard
        colSpan={2}
        title="Applications per Job"
        hasData={jobsChartData && jobsChartData.length > 0}
      >
        <DashboardChart 
          type={CHART_TYPES.BAR} 
          data={jobsChartData} 
          dataKey="applications" 
          nameKey="name" 
          color="#10B981" 
        />
      </DashboardChartCard>

      <DashboardChartCard
        title="AI Score Distribution"
        hasData={aiScoreData && aiScoreData.length > 0}
      >
        <DashboardChart 
          type={CHART_TYPES.BAR} 
          data={aiScoreData} 
          dataKey="count" 
          nameKey="category" 
          color="#3498db" 
        />
      </DashboardChartCard>
    </div>
  );
}
