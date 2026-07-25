export type IntelligenceCategory =
  | 'diplomatic' | 'political' | 'conflict' | 'security'
  | 'humanitarian' | 'consular' | 'sanctions' | 'eu-policy'
  | 'multilateral' | 'trade' | 'economic' | 'energy'
  | 'maritime' | 'aviation' | 'migration' | 'climate'
  | 'natural-disaster' | 'public-health' | 'cyber'
  | 'critical-infrastructure' | 'information-environment';

export type ConfidenceLabel =
  | 'confirmed' | 'high' | 'moderate' | 'low' | 'unverified';

export type VerificationState =
  | 'single-source' | 'multi-source' | 'official-confirmation'
  | 'conflicting' | 'retracted';

export type EventStatus =
  | 'emerging' | 'active' | 'developing' | 'resolved' | 'historical' | 'retracted';

export type TimePrecision =
  | 'exact' | 'minute' | 'hour' | 'day' | 'month' | 'unknown';

export type HumanReviewStatus =
  | 'not-required' | 'pending' | 'approved' | 'rejected' | 'changes-requested';

export interface GeoReference {
  lat: number;
  lng: number;
  placeName?: string;
  countryCode?: string;
}

export interface CountryReference {
  alpha2: string;
  alpha3?: string;
  name?: string;
  unM49?: string;
}

export interface EntityReference {
  id: string;
  type: string;
  name: string;
}

export interface AssetReference {
  type: 'vessel' | 'aircraft' | 'vehicle' | 'infrastructure';
  identifier: string;
  identifierType: 'imo' | 'mmsi' | 'icao24' | 'registration' | 'call-sign';
  name?: string;
}

export interface EventActor {
  entityId?: string;
  name: string;
  role?: string;
  countryCode?: string;
}

export interface EvidenceReference {
  evidenceId: string;
  url?: string;
  publisher?: string;
  publicationTime?: string;
}

export interface AdvisoryAction {
  action: string;
  priority: 'immediate' | 'today' | 'this-week' | 'monitor';
  rationale?: string;
}

export interface ProvenanceRecord {
  ingestedAt: string;
  ingestionMethod: 'polling' | 'webhook' | 'manual';
  adapterId: string;
  parserVersion: string;
}

export interface IntelligenceEvent {
  id: string;
  canonicalKey: string;
  title: string;
  summary: string;
  description?: string;
  categories: IntelligenceCategory[];
  subcategories: string[];
  eventTime: string | null;
  timePrecision: TimePrecision;
  firstObservedAt: string;
  lastObservedAt: string;
  ingestedAt: string;
  updatedAt: string;
  locations: GeoReference[];
  countries: CountryReference[];
  regions: string[];
  actors: EventActor[];
  linkedEntities: EntityReference[];
  linkedAssets: AssetReference[];
  severity: number;
  confidenceScore: number;
  maltaRelevanceScore: number;
  verificationState: VerificationState;
  sourceCount: number;
  officialSourceCount: number;
  evidenceIds: string[];
  claimIds: string[];
  status: EventStatus;
  provenance: ProvenanceRecord;
}

export interface EvidenceRecord {
  id: string;
  sourceId: string;
  publisher: string;
  sourceType:
    | 'official-primary'
    | 'official-secondary'
    | 'international-organisation'
    | 'established-media'
    | 'specialist-source'
    | 'aggregator'
    | 'user-submitted';
  url: string;
  title: string;
  publicationTime: string | null;
  retrievalTime: string;
  language: string | null;
  contentHash: string;
  excerpt?: string;
  suppliedDescription?: string;
  licence?: string;
  attribution?: string;
  rawRecordReference?: string;
  schemaVersion: string;
  parserVersion: string;
}

export interface ClaimRecord {
  id: string;
  eventId: string;
  subjectEntityId?: string;
  predicate: string;
  objectValue: unknown;
  normalizedValue?: unknown;
  evidenceIds: string[];
  supportingSourceCount: number;
  contradictingSourceCount: number;
  confidenceScore: number;
  verificationState: VerificationState;
  createdAt: string;
  updatedAt: string;
}

export interface IntelligenceEntity {
  id: string;
  type:
    | 'country' | 'territory' | 'person' | 'government'
    | 'organisation' | 'company' | 'mission' | 'embassy'
    | 'consulate' | 'port' | 'airport' | 'vessel' | 'aircraft'
    | 'treaty' | 'sanctions-regime' | 'commodity' | 'infrastructure';
  canonicalName: string;
  aliases: string[];
  identifiers: EntityIdentifier[];
  countries: string[];
  attributes: Record<string, unknown>;
  evidenceIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EntityIdentifier {
  type: 'iso-alpha2' | 'iso-alpha3' | 'un-m49' | 'imo' | 'mmsi'
    | 'icao24' | 'registration' | 'call-sign' | 'lei' | 'euid' | 'other';
  value: string;
}

export interface MinisterBriefItem {
  id: string;
  headline: string;
  executiveSummary: string;
  whyItMattersToMalta: string[];
  eventTime: string | null;
  firstObservedAt: string;
  lastUpdatedAt: string;
  countries: CountryReference[];
  locations: GeoReference[];
  organisations: EntityReference[];
  people: EntityReference[];
  categories: IntelligenceCategory[];
  severity: number;
  maltaRelevanceScore: number;
  confidenceScore: number;
  confidenceLabel: ConfidenceLabel;
  verificationState: VerificationState;
  evidence: EvidenceReference[];
  uncertainties: string[];
  possibleFollowUp: AdvisoryAction[];
  humanReviewStatus: HumanReviewStatus;
}

export interface OfficeHolderRecord {
  office: string;
  personName: string;
  countryCode: string;
  termStart?: string;
  termEnd?: string;
  sourceUrl: string;
  sourcePublisher: string;
  verifiedAt: string;
  verificationState: 'official' | 'official-plus-secondary' | 'secondary-only' | 'stale';
}

export interface CountryProfile {
  alpha2: string;
  alpha3: string;
  unM49?: string;
  name: string;
  capital?: string;
  region?: string;
  subregion?: string;
  population?: number;
  gdp?: number;
  tradeWithMalta?: {
    exports?: number;
    imports?: number;
    year?: number;
  };
  euMember: boolean;
  diplomaticRepresentation?: {
    maltaMission?: string;
    localMissionInMalta?: string;
  };
  officeHolders: OfficeHolderRecord[];
  upcomingElections?: string;
  activeSanctions: string[];
  recentEvents: string[];
  recentContactsWithMalta: string[];
  relevantAgreements: string[];
  travelRisk?: string;
  consularRisk?: string;
  maltaRelevanceSummary?: string;
  sourceFreshness: string;
}
