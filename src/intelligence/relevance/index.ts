export interface RelevanceFactor {
  key: string;
  label: string;
  weight: number;
  check: (params: RelevanceParams) => { active: boolean; value?: number };
}

export const DEFAULT_FACTORS: RelevanceFactor[] = [
  { key: 'mentionsMalta', label: 'Direct Malta mention', weight: 25, check: p => ({ active: p.mentionsMalta }) },
  { key: 'malteseGovernment', label: 'Maltese Government involvement', weight: 20, check: p => ({ active: p.hasMalteseGovernmentLink }) },
  { key: 'embassy', label: 'Maltese embassy, mission or consulate', weight: 20, check: p => ({ active: p.hasEmbassyInvolvement }) },
  { key: 'citizensAffected', label: 'Maltese citizens or travellers affected', weight: 15, check: p => ({ active: p.citizensAffected }) },
  { key: 'flaggedVessel', label: 'Malta-flagged vessel involvement', weight: 15, check: p => ({ active: p.hasMaltaFlaggedAsset }) },
  { key: 'aviation', label: 'Malta-linked aircraft or airport impact', weight: 15, check: p => ({ active: p.maltaAviationImpact }) },
  { key: 'euDecision', label: 'EU decision affecting Malta', weight: 15, check: p => ({ active: p.isEUDecisionBindingMalta }) },
  { key: 'centralMed', label: 'Central Mediterranean impact', weight: 12, check: p => {
    if (p.centralMedProximityKm === null) return { active: false };
    if (p.centralMedProximityKm < 100) return { active: true, value: 12 };
    if (p.centralMedProximityKm < 500) return { active: true, value: 8 };
    if (p.centralMedProximityKm < 1000) return { active: true, value: 4 };
    return { active: false };
  }},
  { key: 'tradeExposure', label: 'Trade or investment exposure', weight: 12, check: p => ({ active: p.tradeExposure }) },
  { key: 'energySupply', label: 'Energy or supply-chain exposure', weight: 12, check: p => ({ active: p.energyExposure }) },
  { key: 'sanctionsExposure', label: 'Sanctions or regulatory exposure', weight: 12, check: p => ({ active: p.sanctionsExposure }) },
  { key: 'migration', label: 'Migration or humanitarian relevance', weight: 10, check: p => ({ active: p.humanitarianObligation }) },
  { key: 'multilateral', label: 'Commonwealth or multilateral relevance', weight: 8, check: p => ({ active: p.maltaInInternationalOrg }) },
  { key: 'priorityCountry', label: 'Relationship with priority country', weight: 8, check: p => ({ active: p.priorityCountryRelation }) },
  { key: 'reputational', label: 'Potential reputational impact on Malta', weight: 8, check: p => ({ active: p.reputationalImpact }) },
];

let factors = [...DEFAULT_FACTORS];

export function setRelevanceFactors(overrides: RelevanceFactor[]): void {
  const map = new Map(DEFAULT_FACTORS.map(f => [f.key, f]));
  for (const f of overrides) {
    if (map.has(f.key)) map.set(f.key, f);
  }
  factors = Array.from(map.values());
}

export function resetRelevanceFactors(): void {
  factors = [...DEFAULT_FACTORS];
}

export function getRelevanceFactors(): RelevanceFactor[] {
  return [...factors];
}

export interface RelevanceParams {
  mentionsMalta: boolean;
  hasMalteseGovernmentLink: boolean;
  hasEmbassyInvolvement: boolean;
  citizensAffected: boolean;
  hasMaltaFlaggedAsset: boolean;
  maltaAviationImpact: boolean;
  hasConsularImplication: boolean;
  isEUDecisionBindingMalta: boolean;
  centralMedProximityKm: number | null;
  tradeExposure: boolean;
  energyExposure: boolean;
  sanctionsExposure: boolean;
  humanitarianObligation: boolean;
  maltaInInternationalOrg: boolean;
  priorityCountryRelation: boolean;
  reputationalImpact: boolean;
}

export interface RelevanceResult {
  score: number;
  band: string;
  factors: { key: string; label: string; points: number; explanation: string }[];
}

export function calculateMaltaRelevance(params: RelevanceParams): RelevanceResult {
  const activeFactors: { key: string; label: string; points: number; explanation: string }[] = [];

  for (const f of factors) {
    const result = f.check(params);
    if (result.active) {
      const points = result.value ?? f.weight;
      activeFactors.push({
        key: f.key,
        label: f.label,
        points: Math.round(points),
        explanation: `${f.label}: +${result.value ?? f.weight}`,
      });
    }
  }

  const score = Math.min(100, activeFactors.reduce((sum, f) => sum + f.points, 0));

  return { score, band: relevanceBand(score), factors: activeFactors };
}

export function relevanceBand(score: number): string {
  if (score >= 80) return 'Immediate Malta attention';
  if (score >= 60) return 'High Malta relevance';
  if (score >= 40) return 'Monitor for Malta';
  if (score >= 20) return 'Background relevance';
  return 'Global context';
}

export function relevanceExplanation(result: RelevanceResult): string[] {
  return result.factors.map(f => f.explanation);
}

export function quickRelevanceScore(params: Partial<RelevanceParams>): number {
  const defaults: RelevanceParams = {
    mentionsMalta: false, hasMalteseGovernmentLink: false,
    hasEmbassyInvolvement: false, citizensAffected: false,
    hasMaltaFlaggedAsset: false, maltaAviationImpact: false,
    hasConsularImplication: false, isEUDecisionBindingMalta: false,
    centralMedProximityKm: null, tradeExposure: false,
    energyExposure: false, sanctionsExposure: false,
    humanitarianObligation: false, maltaInInternationalOrg: false,
    priorityCountryRelation: false, reputationalImpact: false,
  };
  return calculateMaltaRelevance({ ...defaults, ...params }).score;
}
