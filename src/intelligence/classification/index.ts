import type { IntelligenceCategory } from '@/intelligence/types';

export interface ClassificationResult {
  category: IntelligenceCategory;
  method: 'source-native' | 'rule' | 'ai-assisted' | 'human';
  confidence: number;
  evidence: string;
}

const KEYWORD_RULES: [RegExp, IntelligenceCategory][] = [
  [/\b(election|vote|ballot|candidate|parliament|assembly)\b/i, 'political'],
  [/\b(sanctions|sanctioned|asset.freeze|travel.ban)\b/i, 'sanctions'],
  [/\b(war|conflict|ceasefire|truce|shelling|bomb|missile|strike|troop|military)\b/i, 'conflict'],
  [/\b(diplomat|embassy|consul|ambassador|mission|foreign.minister|high.representative)\b/i, 'diplomatic'],
  [/\b(humanitarian|aid|refugee|displaced|relief|food.security|malnutrition)\b/i, 'humanitarian'],
  [/\b(consular|citizen|evacuation|travel.advisory|passport|visa)\b/i, 'consular'],
  [/\b(trade|tariff|export|import|customs|wto|market.access)\b/i, 'trade'],
  [/\b(gdp|inflation|debt|fiscal|budget|economic.growth|recession)\b/i, 'economic'],
  [/\b(oil|gas|energy|petroleum|refinery|pipeline|electricity|renewable)\b/i, 'energy'],
  [/\b(ship|vessel|port|maritime|shipping|seafarer|harbour|anchorage)\b/i, 'maritime'],
  [/\b(flight|airport|airspace|aviation|aircraft|airline|runway|no.fly)\b/i, 'aviation'],
  [/\b(migrant|migration|asylum|border|crossing|irregular|smuggler)\b/i, 'migration'],
  [/\b(earthquake|flood|hurricane|typhoon|cyclone|tsunami|volcano|wildfire|drought)\b/i, 'natural-disaster'],
  [/\b(pandemic|outbreak|vaccine|health.emergency|hospital|disease)\b/i, 'public-health'],
  [/\b(cyber|hack|ransomware|data.breach|malware|phishing|cyber.attack)\b/i, 'cyber'],
  [/\b(infrastructure|bridge|road|rail|power.plant|grid|dam|telecom)\b/i, 'critical-infrastructure'],
  [/\b(eu|council.of.the.eu|european.commission|european.parliament|european.council)\b/i, 'eu-policy'],
  [/\b(un|united.nations|security.council|general.assembly|unga|unsc)\b/i, 'multilateral'],
  [/\b(climate|emission|paris.agreement|cop\d|carbon)\b/i, 'climate'],
  [/\b(disinformation|misinformation|propaganda|influence)\b/i, 'information-environment'],
  [/\b(security|terrorism|extremist|radicalisation|surveillance|intelligence)\b/i, 'security'],
];

export function classifyByKeywords(text: string): ClassificationResult[] {
  const results: ClassificationResult[] = [];
  const matched = new Set<string>();

  for (const [pattern, category] of KEYWORD_RULES) {
    if (pattern.test(text) && !matched.has(category)) {
      matched.add(category);
      results.push({
        category,
        method: 'rule',
        confidence: 0.7,
        evidence: `Keyword match: ${pattern.source.slice(0, 60)}`,
      });
    }
  }

  return results;
}

export function classify(sourceCategory: string | undefined, text: string): ClassificationResult[] {
  if (sourceCategory) {
    const mapped = mapSourceCategory(sourceCategory);
    if (mapped) return [{ category: mapped, method: 'source-native', confidence: 0.9, evidence: `Source category: ${sourceCategory}` }];
  }

  return classifyByKeywords(text);
}

const categoryMap: Record<string, IntelligenceCategory> = {
  'Foreign Affairs Council': 'diplomatic',
  'European Council': 'eu-policy',
  'sanctions': 'sanctions',
  'earthquake': 'natural-disaster',
  'flood': 'natural-disaster',
  'tropical cyclone': 'natural-disaster',
  'volcano': 'natural-disaster',
  'wildfire': 'natural-disaster',
  'maritime': 'maritime',
  'aviation': 'aviation',
  'conflict': 'conflict',
  'humanitarian': 'humanitarian',
  'trade': 'trade',
  'energy': 'energy',
  'migration': 'migration',
  'health': 'public-health',
  'cyber': 'cyber',
  'climate': 'climate',
  'election': 'political',
};

function mapSourceCategory(category: string): IntelligenceCategory | undefined {
  const lower = category.toLowerCase();
  for (const [key, val] of Object.entries(categoryMap)) {
    if (lower.includes(key.toLowerCase())) return val;
  }
  return undefined;
}
