import DashboardChart, { CHART_TYPES } from '../../../pages/dashboards/cards/DashboardChartRegistry';

export default function TaskDistributionChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border p-8 flex items-center justify-center h-48 text-gray-400 text-sm italic">
        No tasks to display
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border p-6">
      <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4">Task Distribution</h3>
      <DashboardChart 
        type={CHART_TYPES.DONUT}
        data={data}
        dataKey="value"
        nameKey="name"
        height={220}
        showLegend={true}
      />
    </div>
  );
}
