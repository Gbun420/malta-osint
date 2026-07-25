'use client';

interface VerificationState {
  'single-source': boolean;
  'official-confirmation': boolean;
  'secondary-only': boolean;
  'stale': boolean;
}

export function VerificationBadge({ state }: { state: string }) {
  const stateMap: Record<string, string> = {
    'single-source': 'single-source',
    'multi-source': 'multi-source',
    'official-confirmation': 'official-confirmation',
    'conflicting': 'conflicting',
    'retracted': 'retracted'
  };
  
  const colorClass = {
    'single-source': 'bg-green-500/20',
    'multi-source': 'bg-blue-500/20',
    'official-confirmation': 'bg-green-500/20',
    'conflicting': 'bg-red-500/20',
    'retracted': 'bg-gray-500/20'
  };
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      <span className="hamburger hamburger-open"></span>
      {state}
    </span>
  );