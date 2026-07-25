import type { IntelligenceEvent, IntelligenceEntity, EntityIdentifier } from '@/intelligence/types';

const COUNTRY_ALPHA2: Record<string, string> = {
  mt: 'MT', it: 'IT', fr: 'FR', de: 'DE', es: 'ES', pt: 'PT',
  gr: 'GR', tr: 'TR', eg: 'EG', ly: 'LY', tn: 'TN', dz: 'DZ',
  us: 'US', gb: 'GB', uk: 'GB', cn: 'CN', ru: 'RU', sa: 'SA',
  ae: 'AE', il: 'IL', ps: 'PS', lb: 'LB', sy: 'SY', iq: 'IQ',
  ir: 'IR', pk: 'PK', af: 'AF', sd: 'SD', so: 'SO', et: 'ET',
  ke: 'KE', tz: 'TZ', uga: 'UG', rwa: 'RW', bug: 'BI', css: 'LS',
  zw: 'ZW', zm: 'ZM', mw: 'MW', moz: 'MZ', mad: 'MG', com: 'KM',
};

const ENTITY_TYPE_PATTERNS: Record<string, RegExp[]> = {
  organisation: [
    /\b(?:un|联合国|united nations|european (?:union|commission|council)|nato|who|wto|imf|world bank|gcc|arab league)\b/gi,
    /\b(?:red cross|unicef|unhcr|oCHA|UN OCHA|reliefweb|gdacs)\b/gi,
    /\b(?:European Commission|Council of the (?:EU|Europe)|European Parliament|EEAS|(?:ECHR|European Court of Human Rights))\b/gi,
  ],
  government: [
    /\b(?:government of (?:malta|italy|france|germany|spain|portugal|greece|turkey|egypt|libya|tunisia|algeria))\b/gi,
    /\b(?:maltese government|government of malta)\b/gi,
    /\b(?:ministry (?:of |)(?:foreign affairs|defense|interior|health|education|trade|energy|climate))\b/gi,
  ],
  person: [
    /\b(?:president|prime minister|foreign minister|defense minister|ambassador|high representative|secretary general|pope|pontiff)\b/gi,
  ],
  vessel: [
    /\b(?:mv |ss |ms |m\/s |s\/s )?[a-z][a-z0-9\s\-\.]{2,20}\b/gi,
  ],
};

export interface ExtractedEntity {
  name: string;
  type: string;
  identifiers: EntityIdentifier[];
  countries: string[];
  confidence: number;
}

export interface CorrelationResult {
  entities: ExtractedEntity[];
  clusters: Array<{ seed: string; members: string[] }>;
}

export function extractEntities(text: string): ExtractedEntity[] {
  const entities: ExtractedEntity[] = [];
  const seen = new Set<string>();

  for (const [type, patterns] of Object.entries(ENTITY_TYPE_PATTERNS)) {
    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (!matches) continue;

      for (const match of matches) {
        const normalized = normalizeEntityName(match.trim());
        if (!normalized || seen.has(normalized)) continue;
        if (normalized.length < 3) continue;

        seen.add(normalized);
        entities.push({
          name: normalized,
          type,
          identifiers: [],
          countries: extractCountries(normalized),
          confidence: type === 'organisation' ? 0.8 : type === 'government' ? 0.85 : 0.5,
        });
      }
    }
  }

  return entities;
}

export function extractCountries(text: string): string[] {
  const found = new Set<string>();
  for (const [lower, code] of Object.entries(COUNTRY_ALPHA2)) {
    if (text.toLowerCase().includes(lower)) {
      found.add(code);
    }
  }
  return [...found];
}

function normalizeEntityName(name: string): string {
  return name
    .replace(/^(?:mv|ss|ms|m\/s|s\/s)\s+/i, '')
    .replace(/^the\s+/i, '')
    .trim();
}

export function correlateEvents(events: IntelligenceEvent[]): Array<{
  eventIds: string[];
  sharedEntities: ExtractedEntity[];
  sharedCountries: string[];
}> {
  const results: Array<{
    eventIds: string[];
    sharedEntities: ExtractedEntity[];
    sharedCountries: string[];
  }> = [];

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i];
      const b = events[j];

      const aEntityNames = new Set(a.actors.map(act => act.name.toLowerCase()));
      const bEntityNames = new Set(b.actors.map(act => act.name.toLowerCase()));
      const sharedActors = [...aEntityNames].filter(n => bEntityNames.has(n));

      const aCountryCodes = new Set(a.countries.map(c => c.alpha2));
      const bCountryCodes = new Set(b.countries.map(c => c.alpha2));
      const sharedCountries = [...aCountryCodes].filter(c => bCountryCodes.has(c));

      if (sharedActors.length > 0 || sharedCountries.length > 0) {
        results.push({
          eventIds: [a.id, b.id],
          sharedEntities: [],
          sharedCountries,
        });
      }
    }
  }

  return results;
}