const STATUS_MAP = {
  done: 'bg-green-100 text-green-800',
  published: 'bg-green-100 text-green-800',
  review: 'bg-yellow-100 text-yellow-800',
  draft: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-orange-100 text-orange-800',
  paused: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
  closed: 'bg-red-100 text-red-800',
  open: 'bg-green-100 text-green-800',
  active: 'bg-blue-100 text-blue-800',
  archived: 'bg-gray-100 text-gray-600',
};

export default function StatusBadge({ status, color, className = '' }) {
  const label = status ? status.replace(/_/g, ' ') : 'unknown';
  
  if (color) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tighter border capitalize ${className}`}
        style={{ 
          backgroundColor: color + '15', 
          color: color, 
          borderColor: color + '30' 
        }}
      >
        {label}
      </span>
    );
  }

  const colorClass = STATUS_MAP[status?.toLowerCase()] || 'bg-gray-100 text-gray-600';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colorClass} ${className}`}
    >
      {label}
    </span>
  );
}
