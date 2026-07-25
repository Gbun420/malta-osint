type ConfidenceVariant = 'confirmed' | 'high' | 'moderate' | 'low' | 'unverified';

const CONFIDENCE_COLORS: Record<ConfidenceVariant, string> = {
  confirmed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  high: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  moderate: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  low: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  unverified: 'bg-red-500/20 text-red-400 border-red-500/30',
};

interface ConfidenceBadgeProps {
  confidence: number;
  label: ConfidenceVariant;
}

export function ConfidenceBadge({ confidence, label }: ConfidenceBadgeProps) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${CONFIDENCE_COLORS[label]}`}>
      {confidence}% {label}
    </span>
  );
}