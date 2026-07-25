type VerificationState = 'single-source' | 'multi-source' | 'official-confirmation' | 'conflicting' | 'retracted';

const VERIFICATION_COLORS: Record<VerificationState, string> = {
  'official-confirmation': 'bg-emerald-500/20 text-emerald-400',
  'multi-source': 'bg-blue-500/20 text-blue-400',
  'single-source': 'bg-yellow-500/20 text-yellow-400',
  'conflicting': 'bg-red-500/20 text-red-400',
  'retracted': 'bg-gray-500/20 text-gray-400',
};

export function VerificationBadge({ state }: { state: VerificationState }) {
  const display = state.replace(/-/g, ' ');
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${VERIFICATION_COLORS[state]}`}>
      {display}
    </span>
  );
}