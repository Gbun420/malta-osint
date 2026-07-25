import { NextResponse } from 'next/server';
import { globalRepository } from '@/intelligence/repository/memory';
import { SOURCE_REGISTRY } from '@/intelligence/schemas/source-registry';
import { createEnvelope } from '@/intelligence/schemas/api-envelope';

export async function GET() {
  const records = await globalRepository.getSourceHealth();
  const healthMap = new Map(records.map(r => [r.sourceId, r]));

  const merged = SOURCE_REGISTRY.map(def => {
    const health = healthMap.get(def.id);
    return {
      id: def.id,
      name: def.name,
      publisher: def.publisher,
      category: def.category,
      tier: def.costProfile.tier,
      attribution: def.attribution,
      licence: def.licence,
      health: health ? {
        state: health.state,
        lastAttemptAt: health.lastAttemptAt,
        lastSuccessAt: health.lastSuccessAt,
        lastRecordTimestamp: health.lastRecordTimestamp,
        httpStatus: health.httpStatus,
        latencyMs: health.latencyMs,
        recordsAccepted: health.recordsAccepted,
        consecutiveFailures: health.consecutiveFailures,
        authenticationState: health.authenticationState,
        rateLimitState: health.rateLimitState,
        errorMessage: health.errorMessage,
      } : { state: 'unconfigured' },
    };
  });

  return NextResponse.json(createEnvelope(
    { sources: merged, total: merged.length },
    ['source-registry', 'intelligence-repository'],
  ));
}
