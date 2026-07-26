type SourceHealthState = 'healthy' | 'healthy-empty' | 'degraded' | 'stale' | 'rate-limited' | 'authentication-required' | 'unconfigured' | 'disabled' | 'error';

const HEALTH_COLORS: Record<SourceHealthState, { bg: string; text: string; border: string }> = {
  healthy: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
  'healthy-empty': { bg: 'bg-green-500/10', text: 'text-green-300', border: 'border-green-500/20' },
  degraded: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  stale: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30' },
  'rate-limited': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  'authentication-required': { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
  unconfigured: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500/30' },
  disabled: { bg: 'bg-gray-500/10', text: 'text-gray-500', border: 'border-gray-500/20' },
  error: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
};

interface SourceHealthBadgeProps {
  state: SourceHealthState;
  sourceName: string;
}

export function SourceHealthBadge({ state, sourceName }: SourceHealthBadgeProps) {
  const colors = HEALTH_COLORS[state];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {sourceName}
    </span>
  );
}