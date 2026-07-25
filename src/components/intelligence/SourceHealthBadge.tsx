type SourceHealthState = 'healthy' | 'healthy-empty' | 'degraded' | 'stale' | 'rate-limited' | 'authentication-required' | 'unconfigured' | 'disabled' | 'error';

const HEALTH_COLORS: Record<SourceHealthState, string> = {
  healthy: 'bg-green-500/20 text-green-400',
  'healthy-empty': 'bg-green-500/20 text-green-400',
  degraded: 'bg-yellow-500/20 text-yellow-400',
  stale: 'bg-orange-500/20 text-orange-400',
  'rate-limited': 'bg-orange-500/20 text-orange-400',
  'authentication-required': 'bg-red-500/20 text-red-400',
  unconfigured: 'bg-gray-500/20 text-gray-400',
  disabled: 'bg-gray-500/20 text-gray-500',
  error: 'bg-red-500/20 text-red-400',
};

interface SourceHealthBadgeProps {
  state: SourceHealthState;
  sourceName: string;
}

export function SourceHealthBadge({ state, sourceName }: SourceHealthBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${HEALTH_COLORS[state]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {sourceName}
    </span>
  );
}