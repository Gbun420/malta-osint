type StatusColor = 'green' | 'yellow' | 'red' | 'gray' | 'blue';

const STATUS_COLORS: Record<StatusColor, string> = {
  green: 'bg-green-500/20 text-green-400',
  yellow: 'bg-yellow-500/20 text-yellow-400',
  red: 'bg-red-500/20 text-red-400',
  gray: 'bg-gray-500/20 text-gray-400',
  blue: 'bg-blue-500/20 text-blue-400',
};

interface StatusBadgeProps {
  status: StatusColor;
  label: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}