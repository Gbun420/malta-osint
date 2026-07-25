import type { SourceHealthState, SourceHealthRecord } from '@/intelligence/schemas/registry';
import { getSourceDefinition } from '@/intelligence/schemas/source-registry';

export function determineHealth(params: {
  sourceId: string;
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  httpStatus: number | null;
  consecutiveFailures: number;
  authenticationState: string;
  rateLimitState: string;
  recordsFetched: number;
  errorMessage: string | null;
}): SourceHealthState {
  const def = getSourceDefinition(params.sourceId);

  if (!def) return 'disabled';
  if (params.authenticationState === 'not-configured') return 'unconfigured';

  if (params.rateLimitState === 'exceeded') return 'rate-limited';
  if (params.rateLimitState === 'approaching') return 'degraded';
  if (params.authenticationState === 'invalid') return 'authentication-required';

  if (params.consecutiveFailures >= 3) return 'error';
  if (params.consecutiveFailures >= 1) return 'degraded';

  if (params.httpStatus === null) return 'error';
  if (params.httpStatus >= 500) return 'error';
  if (params.httpStatus === 429) return 'rate-limited';
  if (params.httpStatus === 401 || params.httpStatus === 403) return 'authentication-required';

  if (params.lastSuccessAt && def) {
    const staleness = Date.now() - new Date(params.lastSuccessAt).getTime();
    if (staleness > def.stalenessThresholdSeconds * 1000 * 2) return 'stale';
  }

  if (params.recordsFetched === 0) return 'healthy-empty';

  return 'healthy';
}

export function createSourceHealthRecord(params: {
  sourceId: string;
  lastAttemptAt: string;
  lastSuccessAt: string | null;
  lastRecordTimestamp: string | null;
  httpStatus: number | null;
  latencyMs: number | null;
  recordsFetched: number;
  recordsAccepted: number;
  recordsRejected: number;
  recordsDeduplicated: number;
  schemaFailures: number;
  consecutiveFailures: number;
  authenticationState: 'valid' | 'invalid' | 'not-configured' | 'unknown';
  rateLimitState: 'ok' | 'approaching' | 'exceeded' | 'unknown';
  errorMessage: string | null;
}): SourceHealthRecord {
  const def = getSourceDefinition(params.sourceId);
  return {
    sourceId: params.sourceId,
    state: determineHealth({ ...params }),
    lastAttemptAt: params.lastAttemptAt,
    lastSuccessAt: params.lastSuccessAt,
    lastRecordTimestamp: params.lastRecordTimestamp,
    httpStatus: params.httpStatus,
    latencyMs: params.latencyMs,
    recordsFetched: params.recordsFetched,
    recordsAccepted: params.recordsAccepted,
    recordsRejected: params.recordsRejected,
    recordsDeduplicated: params.recordsDeduplicated,
    schemaFailures: params.schemaFailures,
    consecutiveFailures: params.consecutiveFailures,
    authenticationState: params.authenticationState,
    rateLimitState: params.rateLimitState,
    stalenessThresholdSeconds: def?.stalenessThresholdSeconds ?? 3600,
    errorMessage: params.errorMessage,
    updatedAt: new Date().toISOString(),
  };
}
