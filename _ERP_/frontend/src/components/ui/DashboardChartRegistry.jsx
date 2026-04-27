import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, 
  XAxis, YAxis, Tooltip, 
  ResponsiveContainer, Legend, 
  LineChart, Line, 
  CartesianGrid, 
  AreaChart, Area,
  FunnelChart, Funnel, LabelList
} from 'recharts';

export const CHART_COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#06B6D4', '#F97316'];

export const CHART_TYPES = {
  PIE: 'pie',
  BAR: 'bar',
  LINE: 'line',
  AREA: 'area',
  DONUT: 'donut',
  FUNNEL: 'funnel',
};

const DefaultTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-purple-100 shadow-lilac rounded-lg text-sm">
        <p className="font-semibold text-gray-900 mb-1">{label || payload[0].name}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color || entry.fill }}>
            {entry.name}: <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardChart({ 
  type = CHART_TYPES.BAR, 
  data = [], 
  dataKey = 'value', 
  nameKey = 'name',
  color = '#8B5CF6',
  colorMap = {},
  height = '100%',
  horizontal = false,
  stacked = false,
  stackKeys = [],
  stackColors = [],
  showGrid = true,
  showTooltip = true,
  showLegend = true,
}) {
  if (!data || data.length === 0) return null;

  const renderChart = () => {
    switch (type) {
      case CHART_TYPES.PIE:
      case CHART_TYPES.DONUT:
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              cx="50%"
              cy="50%"
              outerRadius={type === CHART_TYPES.DONUT ? "85%" : "80%"}
              innerRadius={type === CHART_TYPES.DONUT ? "60%" : 0}
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.fill || colorMap[String(entry[nameKey]).toLowerCase()] || CHART_COLORS[index % CHART_COLORS.length]} 
                />
              ))}
            </Pie>
            {showTooltip && <Tooltip content={<DefaultTooltip />} />}
            {showLegend && <Legend verticalAlign="bottom" height={36}/>}
          </PieChart>
        );

      case CHART_TYPES.BAR:
        return (
          <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" vertical={!horizontal} horizontal={horizontal} stroke="#f3f4f6" />}
            {horizontal ? (
              <>
                <XAxis type="number" hide />
                <YAxis dataKey={nameKey} type="category" width={100} tick={{ fontSize: 11, fill: '#6b7280' }} />
              </>
            ) : (
              <>
                <XAxis dataKey={nameKey} tick={{ fontSize: 11, fill: '#6b7280' }} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              </>
            )}
            {showTooltip && <Tooltip cursor={{ fill: '#f9fafb' }} content={<DefaultTooltip />} />}
            {showLegend && <Legend />}
            
            {stacked && stackKeys.length > 0 ? (
              stackKeys.map((key, i) => (
                <Bar 
                  key={key} 
                  dataKey={key} 
                  stackId="a" 
                  fill={stackColors[i] || CHART_COLORS[i % CHART_COLORS.length]} 
                  radius={i === stackKeys.length - 1 ? (horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]) : [0, 0, 0, 0]}
                />
              ))
            ) : (
              <Bar dataKey={dataKey} fill={color} radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} />
            )}
          </BarChart>
        );

      case CHART_TYPES.LINE:
        return (
          <LineChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />}
            <XAxis dataKey={nameKey} tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
            {showTooltip && <Tooltip content={<DefaultTooltip />} />}
            {showLegend && <Legend />}
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 4, fill: color, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
          </LineChart>
        );

      case CHART_TYPES.AREA:
        return (
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
              </linearGradient>
            </defs>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />}
            <XAxis dataKey={nameKey} tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
            {showTooltip && <Tooltip content={<DefaultTooltip />} />}
            <Area type="monotone" dataKey={dataKey} stroke={color} fillOpacity={1} fill="url(#colorArea)" />
          </AreaChart>
        );

      case CHART_TYPES.FUNNEL:
        return (
          <FunnelChart>
            <Tooltip content={<DefaultTooltip />} />
            <Funnel
              data={data}
              dataKey={dataKey}
              nameKey={nameKey}
              isAnimationActive={true}
            >
              <LabelList position="right" fill="#6b7280" stroke="none" dataKey={nameKey} style={{ fontSize: 11 }} />
              <LabelList position="center" fill="#fff" stroke="none" dataKey={dataKey} style={{ fontSize: 12, fontWeight: 'bold' }} />
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill || CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Funnel>
          </FunnelChart>
        );

      default:
        return <div>Unsupported chart type: {type}</div>;
    }
  };

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
}
