import { NextResponse } from 'next/server';
import { isRedisConfigured, RedisRepository } from '@/intelligence/repository/redis';
import { MemoryRepository } from '@/intelligence/repository/memory';

export async function GET() {
  const redisConfigured = isRedisConfigured();
  const hasUrl = !!process.env.UPSTASH_REDIS_REST_URL;
  const hasToken = !!process.env.UPSTASH_REDIS_REST_TOKEN;

  let redisTest: any = null;
  if (redisConfigured) {
    try {
      const repo = new RedisRepository();
      await repo.updateSourceHealth({
        sourceId: 'test-ping',
        state: 'healthy',
        lastAttemptAt: new Date().toISOString(),
        lastSuccessAt: new Date().toISOString(),
        lastRecordTimestamp: null,
        httpStatus: 200,
        latencyMs: 0,
        recordsFetched: 0,
        recordsAccepted: 0,
        recordsRejected: 0,
        recordsDeduplicated: 0,
        schemaFailures: 0,
        consecutiveFailures: 0,
        authenticationState: 'valid',
        rateLimitState: 'ok',
        stalenessThresholdSeconds: 3600,
        errorMessage: null,
        updatedAt: new Date().toISOString(),
      });
      const health = await repo.getSourceHealth();
      const found = health.find(h => h.sourceId === 'test-ping');
      redisTest = {
        written: true,
        readBack: !!found,
        healthCount: health.filter(h => h.sourceId !== 'test-ping').map(h => h.sourceId),
        state: found?.state,
      };
    } catch (e: any) {
      redisTest = { error: e?.message || String(e), stack: e?.stack?.slice(0, 300) };
    }
  }

  return NextResponse.json({
    redisConfigured,
    hasUrl,
    hasToken,
    nodeEnv: process.env.NODE_ENV,
    redisTest,
  });
}
