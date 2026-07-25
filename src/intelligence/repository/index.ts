import type {
  IntelligenceEvent,
  EvidenceRecord,
  IntelligenceEntity,
  ClaimRecord,
  CountryProfile,
} from '@/intelligence/types';
import type { SourceHealthRecord } from '@/intelligence/schemas/registry';

export interface EventQuery {
  countries?: string[];
  categories?: string[];
  minSeverity?: number;
  minConfidence?: number;
  minMaltaRelevance?: number;
  status?: string;
  timeFrom?: string;
  timeTo?: string;
  limit?: number;
  offset?: number;
  sourceIds?: string[];
  locationOnly?: boolean;
  sanctionsRelated?: boolean;
  maritimeRelated?: boolean;
  consularRelevance?: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export interface IntelligenceRepository {
  upsertEvidence(records: EvidenceRecord[]): Promise<void>;
  upsertEvents(records: IntelligenceEvent[]): Promise<void>;
  upsertEntities(records: IntelligenceEntity[]): Promise<void>;
  upsertClaims(records: ClaimRecord[]): Promise<void>;
  updateSourceHealth(record: SourceHealthRecord): Promise<void>;

  getEvents(query: EventQuery): Promise<Paginated<IntelligenceEvent>>;
  getEvent(id: string): Promise<IntelligenceEvent | null>;
  getEventsByCountry(code: string): Promise<IntelligenceEvent[]>;
  getCountry(code: string): Promise<CountryProfile | null>;
  upsertCountry(profile: CountryProfile): Promise<void>;
  getSourceHealth(): Promise<SourceHealthRecord[]>;
  getSourceHealthById(sourceId: string): Promise<SourceHealthRecord | null>;
}
