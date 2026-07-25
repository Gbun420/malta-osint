import { Redis } from '@upstash/redis';
import type {
  IntelligenceEvent,
  EvidenceRecord,
  IntelligenceEntity,
  ClaimRecord,
  CountryProfile,
} from '@/intelligence/types';
import type { SourceHealthRecord } from '@/intelligence/schemas/registry';
import type { EventQuery, Paginated, IntelligenceRepository } from './index';

function env(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key];
  }
  return undefined;
}

export function isRedisConfigured(): boolean {
  const url = env('UPSTASH_REDIS_REST_URL');
  const token = env('UPSTASH_REDIS_REST_TOKEN');
  return !!(url && token);
}

const PREFIXES = {
  event: 'intel:event:',
  evidence: 'intel:evidence:',
  entity: 'intel:entity:',
  claim: 'intel:claim:',
  health: 'intel:health:',
  country: 'intel:country:',
  index: 'intel:index:events',
} as const;

function key(prefix: string, id: string): string {
  return `${prefix}${id}`;
}

export class RedisRepository implements IntelligenceRepository {
  private redis: Redis;

  constructor() {
    const url = env('UPSTASH_REDIS_REST_URL');
    const token = env('UPSTASH_REDIS_REST_TOKEN');
    if (!url || !token) {
      throw new Error('Redis not configured: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set');
    }
    this.redis = new Redis({ url, token });
  }

  async upsertEvidence(records: EvidenceRecord[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    for (const r of records) {
      pipeline.set(key(PREFIXES.evidence, r.id), JSON.stringify(r));
    }
    await pipeline.exec();
  }

  async upsertEvents(records: IntelligenceEvent[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    for (const r of records) {
      pipeline.set(key(PREFIXES.event, r.id), JSON.stringify(r));
    }
    await pipeline.exec();
  }

  async upsertEntities(records: IntelligenceEntity[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    for (const r of records) {
      pipeline.set(key(PREFIXES.entity, r.id), JSON.stringify(r));
    }
    await pipeline.exec();
  }

  async upsertClaims(records: ClaimRecord[]): Promise<void> {
    const pipeline = this.redis.pipeline();
    for (const r of records) {
      pipeline.set(key(PREFIXES.claim, r.id), JSON.stringify(r));
    }
    await pipeline.exec();
  }

  async updateSourceHealth(record: SourceHealthRecord): Promise<void> {
    await this.redis.set(key(PREFIXES.health, record.sourceId), JSON.stringify(record));
  }

  async getEvents(query: EventQuery): Promise<Paginated<IntelligenceEvent>> {
    const keys = await this.redis.keys(`${PREFIXES.event}*`);
    if (keys.length === 0) return { items: [], total: 0, offset: query.offset ?? 0, limit: query.limit ?? 50 };

    const values = keys.length > 0 ? await this.redis.mget<[...unknown[]]>(...keys) : [];
    let items: IntelligenceEvent[] = values
      .filter((v): v is string => typeof v === 'string')
      .map(v => { try { return JSON.parse(v) as IntelligenceEvent; } catch { return null; } })
      .filter((v): v is IntelligenceEvent => v !== null);

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
    const raw = await this.redis.get<string>(key(PREFIXES.event, id));
    if (!raw) return null;
    try { return JSON.parse(raw) as IntelligenceEvent; } catch { return null; }
  }

  async getEventsByCountry(code: string): Promise<IntelligenceEvent[]> {
    const keys = await this.redis.keys(`${PREFIXES.event}*`);
    if (keys.length === 0) return [];

    const values = await this.redis.mget<[...unknown[]]>(...keys);
    const c = code.toLowerCase();
    const items: IntelligenceEvent[] = values
      .filter((v): v is string => typeof v === 'string')
      .map(v => { try { return JSON.parse(v) as IntelligenceEvent; } catch { return null; } })
      .filter((v): v is IntelligenceEvent => v !== null && v.countries.some(cc => cc.alpha2.toLowerCase() === c));

    return items.sort((a, b) => new Date(b.lastObservedAt).getTime() - new Date(a.lastObservedAt).getTime());
  }

  async getCountry(code: string): Promise<CountryProfile | null> {
    const raw = await this.redis.get<string>(key(PREFIXES.country, code.toLowerCase()));
    if (!raw) return null;
    try { return JSON.parse(raw) as CountryProfile; } catch { return null; }
  }

  async upsertCountry(profile: CountryProfile): Promise<void> {
    await this.redis.set(key(PREFIXES.country, profile.alpha2.toLowerCase()), JSON.stringify(profile));
  }

  async getSourceHealth(): Promise<SourceHealthRecord[]> {
    const keys = await this.redis.keys(`${PREFIXES.health}*`);
    if (keys.length === 0) return [];

    const values = await this.redis.mget<[...unknown[]]>(...keys);
    return values
      .filter((v): v is string => typeof v === 'string')
      .map(v => { try { return JSON.parse(v) as SourceHealthRecord; } catch { return null; } })
      .filter((v): v is SourceHealthRecord => v !== null);
  }

  async getSourceHealthById(sourceId: string): Promise<SourceHealthRecord | null> {
    const raw = await this.redis.get<string>(key(PREFIXES.health, sourceId));
    if (!raw) return null;
    try { return JSON.parse(raw) as SourceHealthRecord; } catch { return null; }
  }
}
