import type {
  IntelligenceEvent,
  EvidenceRecord,
  IntelligenceEntity,
  ClaimRecord,
  CountryProfile,
} from '@/intelligence/types';
import type { SourceHealthRecord } from '@/intelligence/schemas/registry';
import type { EventQuery, Paginated, IntelligenceRepository } from './index';
import { RedisRepository, isRedisConfigured } from './redis';

export class MemoryRepository implements IntelligenceRepository {
  private events = new Map<string, IntelligenceEvent>();
  private evidence = new Map<string, EvidenceRecord>();
  private entities = new Map<string, IntelligenceEntity>();
  private claims = new Map<string, ClaimRecord>();
  private health = new Map<string, SourceHealthRecord>();
  private countries = new Map<string, CountryProfile>();

  async upsertEvidence(records: EvidenceRecord[]): Promise<void> {
    for (const r of records) this.evidence.set(r.id, r);
  }

  async upsertEvents(records: IntelligenceEvent[]): Promise<void> {
    for (const r of records) this.events.set(r.id, r);
  }

  async upsertEntities(records: IntelligenceEntity[]): Promise<void> {
    for (const r of records) this.entities.set(r.id, r);
  }

  async upsertClaims(records: ClaimRecord[]): Promise<void> {
    for (const r of records) this.claims.set(r.id, r);
  }

  async updateSourceHealth(record: SourceHealthRecord): Promise<void> {
    this.health.set(record.sourceId, record);
  }

  async getEvents(query: EventQuery): Promise<Paginated<IntelligenceEvent>> {
    let items = Array.from(this.events.values());

    if (query.countries?.length) {
      const codes = new Set(query.countries.map(c => c.toLowerCase()));
      items = items.filter(e => e.countries.some(c => codes.has(c.alpha2.toLowerCase())));
    }
    if (query.categories?.length) {
      const cats = new Set(query.categories);
      items = items.filter(e => e.categories.some(c => cats.has(c)));
    }
    if (query.minSeverity !== undefined) {
      items = items.filter(e => e.severity >= query.minSeverity!);
    }
    if (query.minConfidence !== undefined) {
      items = items.filter(e => e.confidenceScore >= query.minConfidence!);
    }
    if (query.minMaltaRelevance !== undefined) {
      items = items.filter(e => e.maltaRelevanceScore >= query.minMaltaRelevance!);
    }
    if (query.status) {
      items = items.filter(e => e.status === query.status);
    }
    if (query.timeFrom) {
      const from = new Date(query.timeFrom).getTime();
      items = items.filter(e => new Date(e.eventTime || e.firstObservedAt).getTime() >= from);
    }
    if (query.timeTo) {
      const to = new Date(query.timeTo).getTime();
      items = items.filter(e => new Date(e.eventTime || e.firstObservedAt).getTime() <= to);
    }
    if (query.locationOnly) {
      items = items.filter(e => e.locations.length > 0);
    }

    items.sort((a, b) => new Date(b.lastObservedAt).getTime() - new Date(a.lastObservedAt).getTime());

    const total = items.length;
    const limit = query.limit ?? 50;
    const offset = query.offset ?? 0;
    items = items.slice(offset, offset + limit);

    return { items, total, offset, limit };
  }

  async getEvent(id: string): Promise<IntelligenceEvent | null> {
    return this.events.get(id) ?? null;
  }

  async getEventsByCountry(code: string): Promise<IntelligenceEvent[]> {
    const c = code.toLowerCase();
    return Array.from(this.events.values())
      .filter(e => e.countries.some(cc => cc.alpha2.toLowerCase() === c))
      .sort((a, b) => new Date(b.lastObservedAt).getTime() - new Date(a.lastObservedAt).getTime());
  }

  async getCountry(code: string): Promise<CountryProfile | null> {
    return this.countries.get(code.toLowerCase()) ?? null;
  }

  async upsertCountry(profile: CountryProfile): Promise<void> {
    this.countries.set(profile.alpha2.toLowerCase(), profile);
  }

  async getSourceHealth(): Promise<SourceHealthRecord[]> {
    return Array.from(this.health.values());
  }

  async getSourceHealthById(sourceId: string): Promise<SourceHealthRecord | null> {
    return this.health.get(sourceId) ?? null;
  }
}

let _repo: IntelligenceRepository | null = null;

export function getRepository(): IntelligenceRepository {
  if (!_repo) {
    _repo = isRedisConfigured() ? new RedisRepository() : new MemoryRepository();
  }
  return _repo;
}

export const globalRepository = new Proxy<IntelligenceRepository>({} as IntelligenceRepository, {
  get(_target, prop: keyof IntelligenceRepository) {
    const repo = getRepository();
    const fn = repo[prop];
    if (typeof fn === 'function') {
      return fn.bind(repo);
    }
    return fn;
  },
});
