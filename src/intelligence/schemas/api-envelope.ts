export interface ApiEnvelope<T> {
  apiVersion: '1';
  generatedAt: string;
  status: 'ok' | 'partial' | 'error';
  data: T;
  meta: {
    sources: string[];
    recordCount: number;
    warnings: string[];
    cache: {
      state: 'fresh' | 'stale' | 'miss';
      ageSeconds: number;
    };
  };
}

export function createEnvelope<T>(
  data: T,
  sources: string[],
  warnings: string[] = [],
  cacheState: 'fresh' | 'stale' | 'miss' = 'fresh',
  ageSeconds: number = 0,
): ApiEnvelope<T> {
  const recordCount = Array.isArray(data) ? data.length : (data as any)?.total ?? 1;
  return {
    apiVersion: '1',
    generatedAt: new Date().toISOString(),
    status: 'ok',
    data,
    meta: {
      sources,
      recordCount,
      warnings,
      cache: { state: cacheState, ageSeconds },
    },
  };
}

export function createErrorEnvelope(
  message: string,
  sources: string[] = [],
): ApiEnvelope<null> {
  return {
    apiVersion: '1',
    generatedAt: new Date().toISOString(),
    status: 'error',
    data: null,
    meta: {
      sources,
      recordCount: 0,
      warnings: [message],
      cache: { state: 'miss', ageSeconds: 0 },
    },
  };
}
