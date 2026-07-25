export function calculateMaltaRelevance(params: RelevanceParams): number {
  let score = 0;

  if (params.mentionsMalta) score += 25;
  if (params.hasMalteseGovernmentLink) score += 20;
  if (params.hasConsularImplication) score += 15;
  if (params.hasMaltaFlaggedAsset) score += 15;
  if (params.isEUDecisionBindingMalta) score += 10;

  if (params.centralMedProximityKm !== null) {
    if (params.centralMedProximityKm < 100) score += 10;
    else if (params.centralMedProximityKm < 500) score += 5;
    else if (params.centralMedProximityKm < 1000) score += 2;
  }

  if (params.tradeExposure) score += 10;
  if (params.sanctionsExposure) score += 10;
  if (params.maltaInInternationalOrg) score += 5;
  if (params.humanitarianObligation) score += 5;

  return Math.min(100, Math.max(0, score));
}

export function relevanceBand(score: number): string {
  if (score >= 80) return 'Immediate ministerial attention';
  if (score >= 60) return 'High Malta relevance';
  if (score >= 40) return 'Monitor';
  if (score >= 20) return 'Background relevance';
  return 'General global context';
}

export interface RelevanceParams {
  mentionsMalta: boolean;
  hasMalteseGovernmentLink: boolean;
  hasConsularImplication: boolean;
  hasMaltaFlaggedAsset: boolean;
  isEUDecisionBindingMalta: boolean;
  centralMedProximityKm: number | null;
  tradeExposure: boolean;
  sanctionsExposure: boolean;
  maltaInInternationalOrg: boolean;
  humanitarianObligation: boolean;
}

export function relevanceExplanation(score: number, params: RelevanceParams): string[] {
  const reasons: string[] = [];
  if (params.mentionsMalta) reasons.push('Direct Malta mention');
  if (params.hasMalteseGovernmentLink) reasons.push('Maltese government or diplomatic mission involved');
  if (params.hasConsularImplication) reasons.push('Possible consular implications for Maltese citizens');
  if (params.hasMaltaFlaggedAsset) reasons.push('Malta-flagged vessel or Malta-linked aviation');
  if (params.isEUDecisionBindingMalta) reasons.push('EU decision directly binding on Malta');
  if (params.centralMedProximityKm !== null && params.centralMedProximityKm < 1000) reasons.push(`Central Mediterranean proximity (${Math.round(params.centralMedProximityKm)} km)`);
  if (params.tradeExposure) reasons.push('Material trade or energy exposure');
  if (params.sanctionsExposure) reasons.push('Sanctions compliance exposure');
  if (params.maltaInInternationalOrg) reasons.push('Relevant international organisation where Malta participates');
  if (params.humanitarianObligation) reasons.push('Humanitarian or legal-policy obligation');
  return reasons;
}
