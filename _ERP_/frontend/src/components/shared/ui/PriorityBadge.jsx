const PRIORITY_MAP = {
  urgent: 'bg-red-100 text-red-800',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-yellow-100 text-yellow-800',
  low: 'bg-gray-100 text-gray-600',
};

export default function PriorityBadge({ priority, className = '' }) {
  const colorClass = PRIORITY_MAP[priority?.toLowerCase()] || 'bg-gray-100 text-gray-600';
  const label = priority || 'none';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
}
