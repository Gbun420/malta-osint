'use client';

interface ConfidenceBadgeProps {
  value: number;
  label: 'confirmed' | 'high' | 'moderate' | 'low' | 'unverified';
}

export function ConfidenceBadge({ confidence, label }: ConfidenceBadgeProps) {
  const classes = {
    confirmed: 'bg-green-500/20 text-emerald-400 border-emerald-500/30',
    high: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    unverified: 'bg-red-500/20 text-red-400 border-red-500/30'
  } as const;

  const colorClass = Object.values(CONFIDENCE_COLORS)[Object.keys(CONFIDENCE_COLORS).indexOf(label)];
  
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm ${CONFIDENCE_COLORS[label]}`}>
      {confidence}%
      {label}
    </span>
  );
}

const CONFIDENCE_COLORS = {
  confirmed: 'bg-emerald-500/20 text-emerald-400',
  high: 'bg-blue-500/20 text-blue-400',
  moderate: 'bg-yellow-500/20 text-yellow-400',
  low: 'bg-orange-500/20 text-orange-400',
  unverified: 'bg-red-500/20 text-red-400'
};