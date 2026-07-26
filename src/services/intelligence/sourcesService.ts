import { SourceHealthRecord } from '@/intelligence/schemas/registry';

const SOURCES = [
  { id: 'live-flights', url: '/api/flights' },
  { id: 'live-maritime', url: '/api/maritime' },
  { id: 'live-satellites', url: '/api/satellites' },
  { id: 'live-earthquakes', url: '/api/earthquakes' },
  { id: 'live-gdelt', url: '/api/gdelt' },
  { id: 'live-news-reports', url: '/api/news' },
];

async function checkSource(url: string): Promise<{ state: string; latencyMs: number; errorMessage: string | null }> {
  const start = Date.now();
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const latency = Date.now() - start;
    if (!res.ok) {
      return { state: 'error', latencyMs: latency, errorMessage: `HTTP ${res.status}` };
    }
    return { state: 'healthy', latencyMs: latency, errorMessage: null };
  } catch (e) {
    return { state: 'error', latencyMs: Date.now() - start, errorMessage: e instanceof Error ? e.message : 'Fetch failed' };
  }
}

export async function fetchSourceHealth(): Promise<SourceHealthRecord[]> {
  const now = new Date().toISOString();
  const results = await Promise.all(
    SOURCES.map(async (s) => {
      const health = await checkSource(s.url);
      const record: SourceHealthRecord = {
        sourceId: s.id,
        state: health.state as SourceHealthRecord['state'],
        lastAttemptAt: now,
        lastSuccessAt: health.state === 'healthy' ? now : null,
        lastRecordTimestamp: now,
        latencyMs: health.latencyMs,
        httpStatus: health.state === 'error' ? 503 : 200,
        recordsFetched: health.state === 'healthy' ? 1 : 0,
        recordsAccepted: health.state === 'healthy' ? 1 : 0,
        recordsRejected: 0,
        recordsDeduplicated: 0,
        schemaFailures: 0,
        consecutiveFailures: health.state === 'healthy' ? 0 : 1,
        authenticationState: 'valid' as const,
        rateLimitState: 'ok' as const,
        stalenessThresholdSeconds: 120,
        errorMessage: health.errorMessage,
        updatedAt: now,
      };
      return record;
    })
  );
  return results;
}