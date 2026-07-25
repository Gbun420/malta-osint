'use client';

interface StatusBadgeProps {
  status: 'green' | 'yellow' | 'red' | 'gray' | 'blue';
  label: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const colors = {
    green: 'bg-green-500/20 text-green-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    red: 'bg-red-500/20 text-red-400',
    gray: 'bg-gray-500/20 text-gray-400',
    blue: 'bg-blue-500/20 text-blue-400'
  };
  
  const colorClass = status === 'green' ? 'green' : 
                   status === 'yellow' ? 'yellow' : 
                   status === 'red' ? 'red' : 
                   status === 'gray' ? 'gray' : 
                   'blue';
                 
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${colors[status]}`}>
      <span className="h-1 w-1.5"></span>
      {label}
    </span>
  );
}