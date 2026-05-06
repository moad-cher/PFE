import { 
  PieChart, Pie, Cell, 
  BarChart, Bar, 
  XAxis, YAxis, Tooltip, 
  ResponsiveContainer, Legend, 
  LineChart, Line, 
  CartesianGrid, 
  AreaChart, Area,
  FunnelChart, Funnel, LabelList,
  ComposedChart, ReferenceLine
} from 'recharts';

export const CHART_COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#06B6D4', '#F97316'];

export const CHART_TYPES = {
  PIE: 'pie',
  BAR: 'bar',
  LINE: 'line',
  AREA: 'area',
  DONUT: 'donut',
  FUNNEL: 'funnel',
  MULTI_LINE: 'multi_line',
  BURNDOWN: 'burndown',
};

const DefaultTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const filteredPayload = payload.filter(
      (entry) => !['shadedActual', 'goodArea', 'badArea'].includes(entry.dataKey) && 
                 !['Sprint Window', 'Ahead', 'Behind'].includes(entry.name)
    );
    
    if (filteredPayload.length === 0) return null;

    return (
      <div className="bg-white p-3 border border-purple-100 shadow-lilac rounded-lg text-sm">
        <p className="font-semibold text-gray-900 mb-1">{label || filteredPayload[0].name}</p>
        {filteredPayload.map((entry, index) => (
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
  lineKeys = [],
  lineColors = [],
  lineNames = {},
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
            
            {stackKeys.length > 0 ? (
              stackKeys.map((key, i) => (
                <Bar 
                  key={key} 
                  dataKey={key} 
                  stackId={stacked ? 'a' : undefined}
                  fill={stackColors[i] || CHART_COLORS[i % CHART_COLORS.length]} 
                  radius={stacked && i === stackKeys.length - 1 ? (horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]) : [0, 0, 0, 0]}
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

      case CHART_TYPES.MULTI_LINE: {
        const keys = lineKeys.length > 0 ? lineKeys : [dataKey];
        return (
          <LineChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />}
            <XAxis dataKey={nameKey} tick={{ fontSize: 11, fill: '#6b7280' }} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
            {showTooltip && <Tooltip content={<DefaultTooltip />} />}
            {showLegend && <Legend />}
            {keys.map((key, i) => {
              const lineColor = lineColors[i] || CHART_COLORS[i % CHART_COLORS.length];
              return (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={lineNames[key] || key}
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={{ r: 3, fill: lineColor, strokeWidth: 1, stroke: '#fff' }}
                  activeDot={{ r: 5 }}
                />
              );
            })}
          </LineChart>
        );
      }

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

      case CHART_TYPES.BURNDOWN: {
        const todayItem = data.find(d => d.isToday);
        const CustomizedXAxisTick = ({ x, y, payload }) => {
          const isTodayTick = data.find(d => d[nameKey] === payload.value)?.isToday;
          return (
            <text 
              x={x} y={y} dy={16} 
              textAnchor="middle" 
              fill={isTodayTick ? '#2563EB' : '#6b7280'} 
              fontSize={isTodayTick ? 12 : 11} 
              fontWeight={isTodayTick ? 'bold' : 'normal'}
            >
              {payload.value}
            </text>
          );
        };

        return (
          <ComposedChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />}
            <XAxis dataKey={nameKey} tick={<CustomizedXAxisTick />} />
            <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
            {showTooltip && <Tooltip content={<DefaultTooltip />} />}
            {showLegend && (
              <Legend 
                payload={[
                  { value: 'Actual', type: 'line', id: 'actual', color: '#EF4444' },
                  { value: 'Ideal', type: 'line', id: 'ideal', color: '#94A3B8' }
                ]} 
              />
            )}
            
            {/* Shading for future area */}
            <Area
              type="monotone"
              dataKey="shadedActual"
              stroke="none"
              fill="#e2e8f0"
              name="Sprint Window"
              legendType="none"
              tooltipType="none"
            />

            {/* Good Area (Green) - when actual < ideal */}
            <Area
              type="monotone"
              dataKey="goodArea"
              stroke="none"
              fill="#10B981"
              fillOpacity={0.15}
              name="Ahead"
              legendType="none"
              tooltipType="none"
            />

            {/* Bad Area (Red) - when actual > ideal */}
            <Area
              type="monotone"
              dataKey="badArea"
              stroke="none"
              fill="#EF4444"
              fillOpacity={0.15}
              name="Behind"
              legendType="none"
              tooltipType="none"
            />

            {/* Today Line */}
            {todayItem && (
              <ReferenceLine
                x={todayItem[nameKey]}
                stroke="#94A3B8"
                strokeDasharray="3 3"
                label={{ position: 'top', value: 'Today', fill: '#6b7280', fontSize: 10 }}
              />
            )}

            {/* Ideal Line */}
            <Line
              type="monotone"
              dataKey="ideal"
              name="Ideal"
              stroke="#94A3B8"
              strokeWidth={1}
              strokeDasharray="5 5"
              dot={false}
            />

            {/* Actual Line */}
            <Line
              type="monotone"
              dataKey="actual"
              name="Actual"
              stroke="#EF4444"
              strokeWidth={3}
              dot={{ r: 4, fill: '#EF4444', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6 }}
            />
          </ComposedChart>
        );
      }

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
