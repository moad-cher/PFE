export default function DashboardChartCard({
  title,
  rowSpan = 1,
  colSpan = 1,
  minHeight = 220,
  hasData = true,
  emptyText = 'No data available',
  children,
}) {
  const rowSpanClass = { 2: 'lg:row-span-2', 3: 'lg:row-span-3', 4: 'lg:row-span-4' }[rowSpan] || '';
  const colSpanClass = { 2: 'lg:col-span-2', 3: 'lg:col-span-3', 4: 'lg:col-span-4' }[colSpan] || '';
  const cardClass = [
    'bg-white rounded-xl shadow-lilac border border-purple-100/50 p-6 h-full flex flex-col',
    rowSpanClass,
    colSpanClass,
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClass}>
      <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>
      {hasData ? (
        <div className="flex-1" style={{ minHeight }}>
          {children}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm" style={{ minHeight }}>
          {emptyText}
        </div>
      )}
    </div>
  );
}
