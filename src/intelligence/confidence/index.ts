import type { ConfidenceLabel, VerificationState } from '@/intelligence/types';
import type { EvidenceRecord } from '@/intelligence/types';

const SOURCE_AUTHORITY: Record<string, number> = {
  'official-primary': 0.95,
  'official-secondary': 0.88,
  'international-organisation': 0.92,
  'established-media': 0.75,
  'specialist-source': 0.70,
  'aggregator': 0.60,
  'user-submitted': 0.45,
};

export function calculateConfidence(params: {
  evidence: EvidenceRecord[];
  verificationState?: VerificationState;
  eventTimeKnown: boolean;
  geolocationInferred: boolean;
  hasRetraction: boolean;
  hasConflictingSources: boolean;
  sourceFreshnessMs: number;
  stalenessThresholdMs?: number;
}): { score: number; label: ConfidenceLabel } {
  const { evidence, eventTimeKnown, geolocationInferred, hasRetraction, hasConflictingSources, sourceFreshnessMs } = params;

  if (evidence.length === 0) return { score: 0, label: 'unverified' };

  const stalenessThreshold = params.stalenessThresholdMs ?? 7200000;

  const sourceAuthority = evidence.reduce((sum, e) => sum + (SOURCE_AUTHORITY[e.sourceType] ?? 0.5), 0) / evidence.length;

  const uniqueSources = new Set(evidence.map(e => e.publisher)).size;
  const sourceCount = Math.min(evidence.length, 10);

  let independentCorroboration = 0;
  if (uniqueSources >= 3) independentCorroboration = 1;
  else if (uniqueSources >= 2) independentCorroboration = 0.8;
  else independentCorroboration = 0.4;

  const hasAllFields = evidence.every(e =>
    e.url && e.title && e.retrievalTime && e.publisher
  );
  const evidenceCompleteness = hasAllFields ? 1 : 0.6;

  const temporalConsistency = eventTimeKnown ? 1 : 0.4;

  const geographicConsistency = geolocationInferred ? 0.4 : 1;

  const freshness = Math.max(0, 1 - sourceFreshnessMs / stalenessThreshold);

  let score =
    sourceAuthority * 0.35 +
    independentCorroboration * 0.25 +
    evidenceCompleteness * 0.15 +
    temporalConsistency * 0.10 +
    geographicConsistency * 0.05 +
    freshness * 0.10;

  score = Math.round(score * 100);

  if (hasRetraction) score = Math.max(0, score - 25);
  if (hasConflictingSources) score = Math.max(0, score - 20);
  if (!eventTimeKnown) score = Math.max(0, score - 10);
  if (geolocationInferred) score = Math.max(0, score - 10);

  score = Math.min(100, Math.max(0, score));

  const label = confidenceLabel(score);
  return { score, label };
}

export function confidenceLabel(score: number): ConfidenceLabel {
  if (score >= 90) return 'confirmed';
  if (score >= 75) return 'high';
  if (score >= 55) return 'moderate';
  if (score >= 30) return 'low';
  return 'unverified';
}

export function verificationState(
  evidenceCount: number,
  officialSourceCount: number,
  hasConflicting: boolean,
  hasRetraction: boolean,
): VerificationState {
  if (hasRetraction) return 'retracted';
  if (hasConflicting) return 'conflicting';
  if (officialSourceCount > 0 && evidenceCount > 1) return 'official-confirmation';
  if (evidenceCount >= 2) return 'multi-source';
  return 'single-source';
}
