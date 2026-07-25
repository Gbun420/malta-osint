import type {
  IntelligenceEvent, MinisterBriefItem, ConfidenceLabel,
  HumanReviewStatus,
} from '@/intelligence/types';
import { confidenceLabel } from '@/intelligence/confidence';

export interface BriefingParams {
  maxItems?: number;
  minRelevance?: number;
  minConfidence?: number;
  categories?: string[];
  since?: string;
}

export function generateBriefing(
  events: IntelligenceEvent[],
  params: BriefingParams = {},
): MinisterBriefItem[] {
  const maxItems = params.maxItems ?? 20;
  const minRelevance = params.minRelevance ?? 0;
  const minConfidence = params.minConfidence ?? 0;
  const categories = params.categories;
  const since = params.since ? new Date(params.since).getTime() : 0;

  let filtered = events.filter(e => {
    if (e.maltaRelevanceScore < minRelevance) return false;
    if (e.confidenceScore < minConfidence) return false;
    if (categories && !e.categories.some(c => categories.includes(c))) return false;
    if (since && new Date(e.lastObservedAt).getTime() < since) return false;
    return true;
  });

  filtered.sort((a, b) => {
    const scoreA = a.maltaRelevanceScore * 0.6 + a.confidenceScore * 0.4;
    const scoreB = b.maltaRelevanceScore * 0.6 + b.confidenceScore * 0.4;
    return scoreB - scoreA;
  });

  return filtered.slice(0, maxItems).map(eventToBriefItem);
}

function eventToBriefItem(event: IntelligenceEvent): MinisterBriefItem {
  const confLabel: ConfidenceLabel = confidenceLabel(event.confidenceScore);
  const reviewStatus: HumanReviewStatus = event.confidenceScore >= 90
    ? 'not-required'
    : event.confidenceScore >= 75
      ? 'not-required'
      : 'pending';

  return {
    id: event.id,
    headline: event.title,
    executiveSummary: event.summary,
    whyItMattersToMalta: generateWhyItMatters(event),
    eventTime: event.eventTime,
    firstObservedAt: event.firstObservedAt,
    lastUpdatedAt: event.lastObservedAt,
    countries: event.countries,
    locations: event.locations,
    organisations: event.linkedEntities.filter(e => ['government', 'organisation', 'company'].includes(e.type)),
    people: event.linkedEntities.filter(e => e.type === 'person'),
    categories: event.categories,
    severity: Math.round(event.severity) as 0 | 1 | 2 | 3 | 4 | 5,
    maltaRelevanceScore: event.maltaRelevanceScore,
    confidenceScore: event.confidenceScore,
    confidenceLabel: confLabel,
    verificationState: event.verificationState,
    evidence: event.evidenceIds.map(id => ({ evidenceId: id })),
    uncertainties: [],
    possibleFollowUp: generateFollowUp(event),
    humanReviewStatus: reviewStatus,
  };
}

function generateWhyItMatters(event: IntelligenceEvent): string[] {
  const reasons: string[] = [];
  if (event.countries.some(c => c.alpha2 === 'MT')) {
    reasons.push('Directly involves Malta');
  }
  if (event.maltaRelevanceScore >= 60) {
    reasons.push('High strategic relevance to Maltese interests');
  }
  if (event.categories.includes('maritime') || event.categories.includes('aviation')) {
    reasons.push('Affects Maltese transport or connectivity');
  }
  if (event.categories.includes('trade') || event.categories.includes('economic')) {
    reasons.push('Economic or trade implications for Malta');
  }
  if (event.categories.includes('eu-policy') || event.categories.includes('sanctions')) {
    reasons.push('EU policy decision requiring Maltese consideration');
  }
  if (event.categories.includes('humanitarian') || event.categories.includes('consular')) {
    reasons.push('Humanitarian or consular dimension');
  }
  if (reasons.length === 0) {
    reasons.push('General contextual relevance');
  }
  return reasons;
}

function generateFollowUp(event: IntelligenceEvent): { action: string; priority: 'immediate' | 'today' | 'this-week' | 'monitor'; rationale?: string }[] {
  const actions: { action: string; priority: 'immediate' | 'today' | 'this-week' | 'monitor'; rationale?: string }[] = [];
  if (event.maltaRelevanceScore >= 80) {
    actions.push({ action: 'Brief minister', priority: 'immediate', rationale: 'Critical Malta relevance' });
  }
  if (event.maltaRelevanceScore >= 60 && event.confidenceScore < 75) {
    actions.push({ action: 'Verify with official sources', priority: 'today', rationale: 'Moderate confidence on high-relevance event' });
  }
  if (event.categories.includes('sanctions')) {
    actions.push({ action: 'Review sanctions compliance exposure', priority: 'this-week' });
  }
  if (event.categories.includes('consular')) {
    actions.push({ action: 'Assess consular implications', priority: 'today' });
  }
  return actions;
}
