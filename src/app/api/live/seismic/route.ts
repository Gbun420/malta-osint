import { NextResponse } from 'next/server';
import { createEnvelope } from '@/intelligence/schemas/api-envelope';
import { globalRepository } from '@/intelligence/repository/memory';
import { createSourceHealthRecord } from '@/intelligence/source-health';

export async function GET() {
  const sourceId = 'usgs-earthquake';
  const attemptedAt = new Date().toISOString();
  const start = Date.now();
  let httpStatus = 200;
  let errorMessage: string | null = null;

  try {
    const url = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson';
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    httpStatus = res.status;
    if (!res.ok) throw new Error(`USGS returned ${res.status}`);

    const data = await res.json();
    const events = (data.features || []).map((f: any) => ({
      id: f.id,
      lat: f.geometry.coordinates[1],
      lng: f.geometry.coordinates[0],
      depth: f.geometry.coordinates[2],
      magnitude: f.properties.mag,
      place: f.properties.place,
      time: f.properties.time,
      url: f.properties.url,
      tsunami: f.properties.tsunami,
      alert: f.properties.alert,
    }));

    const latency = Date.now() - start;
    const health = createSourceHealthRecord({
      sourceId,
      lastAttemptAt: attemptedAt,
      lastSuccessAt: attemptedAt,
      lastRecordTimestamp: new Date().toISOString(),
      httpStatus,
      latencyMs: latency,
      recordsFetched: events.length,
      recordsAccepted: events.length,
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
      { seismic: events, total: events.length },
      [sourceId],
    ), {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
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
      { error: errorMessage, seismic: [], total: 0 },
      { status: 500 },
    );
  }
}
