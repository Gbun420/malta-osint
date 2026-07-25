import { NextResponse } from 'next/server';
import { createEnvelope } from '@/intelligence/schemas/api-envelope';
import { globalRepository } from '@/intelligence/repository/memory';
import { createSourceHealthRecord } from '@/intelligence/source-health';

export async function GET() {
  const sourceId = 'open-meteo-marine';
  const attemptedAt = new Date().toISOString();
  const start = Date.now();
  let httpStatus = 200;
  let errorMessage: string | null = null;

  try {
    const url = 'https://marine-api.open-meteo.com/v1/marine'
      + '?latitude=35.9375&longitude=14.3754'
      + '&current=wave_height,wave_direction,wave_period,sea_surface_temperature'
      + '&hourly=wave_height,wave_direction,wave_period,wind_wave_height,swell_wave_height,sea_surface_temperature,ocean_current_velocity,ocean_current_direction'
      + '&timezone=Europe/Malta&forecast_days=3';

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    httpStatus = res.status;
    if (!res.ok) throw new Error(`Open-Meteo Marine returned ${res.status}`);

    const data = await res.json();
    const latency = Date.now() - start;

    const health = createSourceHealthRecord({
      sourceId,
      lastAttemptAt: attemptedAt,
      lastSuccessAt: attemptedAt,
      lastRecordTimestamp: new Date().toISOString(),
      httpStatus,
      latencyMs: latency,
      recordsFetched: 1,
      recordsAccepted: 1,
      recordsRejected: 0,
      recordsDeduplicated: 0,
      schemaFailures: 0,
      consecutiveFailures: 0,
      authenticationState: 'valid',
      rateLimitState: 'ok',
      errorMessage: null,
    });
    await globalRepository.updateSourceHealth(health);

    return NextResponse.json(createEnvelope(
      { conditions: data },
      [sourceId],
    ), {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' },
    });
  } catch (e) {
    const latency = Date.now() - start;
    errorMessage = e instanceof Error ? e.message : String(e);
    const health = createSourceHealthRecord({
      sourceId,
      lastAttemptAt: attemptedAt,
      lastSuccessAt: null,
      lastRecordTimestamp: null,
      httpStatus,
      latencyMs: latency,
      recordsFetched: 0,
      recordsAccepted: 0,
      recordsRejected: 0,
      recordsDeduplicated: 0,
      schemaFailures: 0,
      consecutiveFailures: 1,
      authenticationState: 'valid',
      rateLimitState: 'ok',
      errorMessage,
    });
    await globalRepository.updateSourceHealth(health);

    return NextResponse.json(
      { error: errorMessage, conditions: null },
      { status: 500 },
    );
  }
}
