import { NextResponse } from 'next/server';
import { globalRepository } from '@/intelligence/repository/memory';
import { SOURCE_REGISTRY } from '@/intelligence/schemas/source-registry';
import type { PublicSourceStatus, DataSourceHealthReport } from '@/lib/data-health';

export const dynamic = 'force-dynamic';

interface SlimSourceReport {
  source: string;
  status: PublicSourceStatus;
  lastAttempt: string | null;
  lastSuccess: string | null;
  cacheAgeSeconds: number;
  latencyMs: number | null;
  recordCount: number;
  providerHttpStatus: number | null;
  errorCode: string | null;
  safeErrorMessage: string | null;
}

function toSlim(report: DataSourceHealthReport): SlimSourceReport {
  return {
    source: report.source,
    status: report.status,
    lastAttempt: report.lastAttempt,
    lastSuccess: report.lastSuccess,
    cacheAgeSeconds: report.cacheAgeSeconds,
    latencyMs: report.latencyMs,
    recordCount: report.recordCount,
    providerHttpStatus: report.providerHttpStatus,
    errorCode: report.errorCode,
    safeErrorMessage: report.safeErrorMessage,
  };
}

export async function GET() {
  try {
    const healthRecords = await globalRepository.getSourceHealth();
    const healthMap = new Map(healthRecords.map(h => [h.sourceId, h]));
    const now = Date.now();

    const reports: SlimSourceReport[] = SOURCE_REGISTRY.map(def => {
      const h = healthMap.get(def.id);
      if (!h) {
        return {
          source: def.id,
          status: h?.state === 'disabled' ? 'disabled' : 'unconfigured',
          lastAttempt: null,
          lastSuccess: null,
          cacheAgeSeconds: 0,
          latencyMs: null,
          recordCount: 0,
          providerHttpStatus: null,
          errorCode: null,
          safeErrorMessage: null,
        };
      }

      const ageSeconds = h.lastSuccessAt
        ? Math.floor((now - new Date(h.lastSuccessAt).getTime()) / 1000)
        : 0;

      const status: PublicSourceStatus =
        h.state === 'disabled' ? 'disabled'
        : h.state === 'unconfigured' || h.authenticationState === 'not-configured' ? 'unconfigured'
        : h.state === 'authentication-required' ? 'unconfigured'
        : h.rateLimitState === 'exceeded' ? 'rate-limited'
        : h.state === 'rate-limited' ? 'rate-limited'
        : h.state === 'error' ? 'unavailable'
        : h.state === 'stale' ? 'stale'
        : h.state === 'healthy-empty' ? 'live'
        : 'live';

      return {
        source: def.id,
        status,
        lastAttempt: h.lastAttemptAt,
        lastSuccess: h.lastSuccessAt,
        cacheAgeSeconds: ageSeconds,
        latencyMs: h.latencyMs,
        recordCount: h.recordsAccepted,
        providerHttpStatus: h.httpStatus,
        errorCode: h.errorMessage ? 'PROVIDER_ERROR' : null,
        safeErrorMessage: h.errorMessage,
      };
    });

    return NextResponse.json({
      apiVersion: '1',
      generatedAt: new Date().toISOString(),
      sources: reports,
      summary: {
        live: reports.filter(r => r.status === 'live').length,
        stale: reports.filter(r => r.status === 'stale').length,
        unavailable: reports.filter(r => r.status === 'unavailable').length,
        rateLimited: reports.filter(r => r.status === 'rate-limited').length,
        unconfigured: reports.filter(r => r.status === 'unconfigured').length,
        disabled: reports.filter(r => r.status === 'disabled').length,
        total: reports.length,
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (e) {
    return NextResponse.json({
      apiVersion: '1',
      generatedAt: new Date().toISOString(),
      sources: [] as SlimSourceReport[],
      summary: { error: e instanceof Error ? e.message : String(e) },
    }, { status: 500 });
  }
}
