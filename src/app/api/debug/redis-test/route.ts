import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { globalRepository } from '@/intelligence/repository/memory';
import type { IntelligenceEvent } from '@/intelligence/types';

export async function GET() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  const redis = new Redis({ url: url!, token: token! });

  const testEvents: IntelligenceEvent[] = Array.from({ length: 5 }, (_, i) => ({
    id: `test-proxy-${i}`,
    canonicalKey: `proxy-test-${i}`,
    title: `Proxy Test ${i}`,
    summary: `test ${i}`,
    categories: ['test'],
    subcategories: [],
    eventTime: new Date().toISOString(),
    timePrecision: 'second',
    firstObservedAt: new Date().toISOString(),
    lastObservedAt: new Date().toISOString(),
    ingestedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    locations: [],
    countries: [],
    regions: [],
    actors: [],
    linkedEntities: [],
    linkedAssets: [],
    severity: 1,
    confidenceScore: 50,
    maltaRelevanceScore: 50,
    verificationState: 'single-source',
    sourceCount: 1,
    officialSourceCount: 0,
    evidenceIds: [],
    claimIds: [],
    status: 'active',
    provenance: { ingestedAt: new Date().toISOString(), ingestionMethod: 'test', adapterId: 'test', parserVersion: '1' },
    description: '',
  }));

  await globalRepository.upsertEvents(testEvents);

  const afterKeys = await redis.keys('intel:event:test-proxy-*');
  const afterCount = afterKeys.length;

  const directAfter: Record<string, unknown> = {};
  for (const k of afterKeys) {
    const v = await redis.get(k);
    directAfter[k] = v ? (typeof v === 'object' ? (v as any).title : typeof v) : 'null';
  }

  await redis.del(...afterKeys);

  return NextResponse.json({
    written: testEvents.length,
    foundInRedis: afterCount,
    details: directAfter,
  });
}
