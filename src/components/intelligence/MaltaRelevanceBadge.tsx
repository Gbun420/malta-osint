export function MaltaRelevanceBadge({ score }: { score: number }) {
  let color = 'gray';
  let label = 'General context';
  if (score >= 80) { color = 'red'; label = 'Immediate attention'; }
  else if (score >= 60) { color = 'orange'; label = 'High relevance'; }
  else if (score >= 40) { color = 'yellow'; label = 'Monitor'; }
  else if (score >= 20) { color = 'blue'; label = 'Background'; }

  const colors = {
    red: 'bg-red-500/20 text-red-400',
    orange: 'bg-orange-500/20 text-orange-400',
    yellow: 'bg-yellow-500/20 text-yellow-400',
    blue: 'bg-blue-500/20 text-blue-400',
    gray: 'bg-gray-500/20 text-gray-400',
  };

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colors[color as keyof typeof colors]}`}>
      {score}/100 {label}
    </span>
  );
}