/**
 * THIRD EYE — Data-source health tracker.
 *
 * Central place that every live-feed route should call BEFORE returning.
 * Records last attempt, last success, latency, record counts, cache age,
 * the provider's raw HTTP status, and an errorCode/safeErrorMessage pair.
 *
 * Never logs API keys, never logs full URLs that may contain token query
 * parameters, never logs raw response bodies.
 */

import { createSourceHealthRecord } from '@/intelligence/source-health';
import { globalRepository } from '@/intelligence/repository/memory';
import type { SourceHealthState } from '@/intelligence/schemas/registry';

const LOG_PREFIX = '[data-source]';

export type PublicSourceStatus =
  | 'live'        // request succeeded, fresh record returned (count > 0)
  | 'stale'       // last valid dataset exists but is older than its freshness threshold
  | 'unavailable' // request failed (offline, DNS, 5xx, timeout)
  | 'rate-limited'// provider returned 429 or our rate-limit window exceeded
  | 'disabled'    // source intentionally disabled (env flag)
  | 'unconfigured';// required credentials not configured

export interface DataSourceHealthReport {
  source: string;
  status: PublicSourceStatus;
  internalState: SourceHealthState;
  lastAttempt: string | null;
  lastSuccess: string | null;
  lastRecordTime: string | null;
  latencyMs: number | null;
  recordCount: number;
  cacheAgeSeconds: number;
  providerHttpStatus: number | null;
  errorCode: string | null;
  safeErrorMessage: string | null;
  recordField?: string;
}

export interface RecordHealthInput {
  source: string;
  attemptedAt?: string;
  completedAt?: string;
  httpStatus: number;
  latencyMs: number;
  recordsReturned: number;
  /** was the cache fresh enough to satisfy the request? */
  cacheHitAgeSeconds?: number;
  /** thrown error or upstream message, already sanitized (no keys, no tokens) */
  errorMessage?: string | null;
  errorCode?: string | null;
  /** credential state */
  credentialsState?: 'valid' | 'invalid' | 'not-configured' | 'unknown';
  /** rate-limit state observed */
  rateLimitState?: 'ok' | 'approaching' | 'exceeded' | 'unknown';
  /** identifier of the primary record field for stamping (e.g. 'vessels', 'flights') */
  recordField?: string;
  /** is this source considered core to the platform? */
  stalenessThresholdSeconds: number;
}

function redact(message: string | null | undefined): string | null {
  if (!message) return null;
  // strip anything that looks like a key (e.g. AIS_..., FIRMS_..., api_key=, token=, a 32+ char hex)
  return String(message)
    .replace(/(?:[A-Za-z_]*[Aa][Pp][Ii]_[Kk][Ee][Yy]|token=|password=|Authorization:\s*[A-Za-z]+\s+\S+)/g, '[REDACTED]')
    .replace(/\b[a-f0-9]{32,}\b/gi, '[REDACTED-HEX]');
}

export async function recordHealth(input: RecordHealthInput) {
  const attemptedAt = input.attemptedAt ?? new Date().toISOString();
  const completedAt = input.completedAt ?? new Date().toISOString();
  const errCode = input.errorCode ?? (input.httpStatus === 429 ? 'RATE_LIMITED'
    : input.httpStatus === 401 || input.httpStatus === 403 ? 'AUTH_REQUIRED'
    : input.httpStatus === 0 ? 'NETWORK_ERROR'
    : input.httpStatus >= 500 ? 'PROVIDER_5XX'
    : input.httpStatus >= 400 ? 'PROVIDER_4XX'
    : null);
  const credentialsState = input.credentialsState ?? (input.errorCode === 'AUTH_REQUIRED' ? 'invalid' : (input.httpStatus === 200 ? 'valid' : 'unknown'));
  const rateLimitState = input.rateLimitState ?? (input.httpStatus === 429 ? 'exceeded' : (input.httpStatus === 200 ? 'ok' : 'unknown'));
  const consecutiveFailures = errCode ? 1 : 0;

  const safeError = redact(input.errorMessage ?? null);

  const record = createSourceHealthRecord({
    sourceId: input.source,
    lastAttemptAt: attemptedAt,
    lastSuccessAt: errCode === null ? completedAt : null,
    lastRecordTimestamp: input.recordsReturned > 0 && errCode === null ? completedAt : null,
    httpStatus: input.httpStatus,
    latencyMs: Math.round(input.latencyMs),
    recordsFetched: input.recordsReturned,
    recordsAccepted: input.recordsReturned,
    recordsRejected: 0,
    recordsDeduplicated: 0,
    schemaFailures: 0,
    consecutiveFailures,
    authenticationState: credentialsState,
    rateLimitState,
    errorMessage: safeError,
  });

  try {
    await globalRepository.updateSourceHealth(record);
  } catch {
    /* never let health tracking break the response */
  }

  const internalState: SourceHealthState = record.state;
  let status: PublicSourceStatus;
  if (internalState === 'disabled') status = 'disabled';
  else if (internalState === 'unconfigured') status = 'unconfigured';
  else if (internalState === 'rate-limited') status = 'rate-limited';
  else if (internalState === 'authentication-required') status = 'unconfigured';
  else if (internalState === 'error') status = 'unavailable';
  else if (internalState === 'stale') status = 'stale';
  else if (internalState === 'healthy-empty') status = 'live';
  else status = 'live';

  log({
    source: input.source,
    attemptedAt,
    status,
    httpStatus: input.httpStatus,
    latencyMs: Math.round(input.latencyMs),
    records: input.recordsReturned,
    cacheAgeSeconds: input.cacheHitAgeSeconds ?? 0,
    safeError,
    errorCode: errCode,
  });

  return {
    source: input.source,
    status,
    internalState,
    lastAttempt: attemptedAt,
    lastSuccess: record.lastSuccessAt,
    lastRecordTime: record.lastRecordTimestamp,
    latencyMs: record.latencyMs,
    recordCount: input.recordsReturned,
    cacheAgeSeconds: Math.max(0, Math.floor(input.cacheHitAgeSeconds ?? 0)),
    providerHttpStatus: input.httpStatus,
    errorCode: errCode,
    safeErrorMessage: safeError,
    recordField: input.recordField,
  } satisfies DataSourceHealthReport;
}

export function log(entry: {
  source: string;
  attemptedAt: string;
  status: PublicSourceStatus;
  httpStatus: number;
  latencyMs: number;
  records: number;
  cacheAgeSeconds: number;
  safeError: string | null;
  errorCode: string | null;
}) {
  const payload = {
    prefix: LOG_PREFIX,
    source: entry.source,
    timestamp: entry.attemptedAt,
    status: entry.status,
    httpStatus: entry.httpStatus,
    latencyMs: entry.latencyMs,
    records: entry.records,
    cacheAgeSeconds: entry.cacheAgeSeconds,
    errorCode: entry.errorCode,
    safeError: entry.safeError,
  };
  if (entry.status === 'unavailable' || entry.status === 'rate-limited') {
    console.warn(JSON.stringify(payload));
  } else if (entry.status === 'live' || entry.status === 'stale') {
    if (process.env.NODE_ENV !== 'production') {
      console.log(JSON.stringify(payload));
    }
  } else {
    console.info(JSON.stringify(payload));
  }
}
