import { NextResponse } from 'next/server';
import { createEnvelope } from '@/intelligence/schemas/api-envelope';
import { globalRepository } from '@/intelligence/repository/memory';
import { createSourceHealthRecord } from '@/intelligence/source-health';

const ADSB_LOL_REGIONS = [
  { lat: 35.9, lon: 14.4, dist: 250 },
  { lat: 48.8, lon: 2.3, dist: 300 },
  { lat: 40.7, lon: -74.0, dist: 300 },
  { lat: 25.2, lon: 55.3, dist: 300 },
  { lat: 35.7, lon: 139.7, dist: 300 },
  { lat: -33.8, lon: 151.2, dist: 300 },
];

async function fetchRegion(region: typeof ADSB_LOL_REGIONS[0], timeoutMs = 12000): Promise<any[]> {
  const url = `https://api.adsb.lol/v2/lat/${region.lat}/lon/${region.lon}/dist/${region.dist}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`ADSB.lol returned ${res.status}`);
  const data = await res.json();
  return data.ac || [];
}

export async function GET() {
  const sourceId = 'adsb-lol';
  const attemptedAt = new Date().toISOString();
  const start = Date.now();
  let httpStatus = 200;
  let errorMessage: string | null = null;

  try {
    const results = await Promise.allSettled(
      ADSB_LOL_REGIONS.map(r => fetchRegion(r))
    );

    const allAircraft: any[] = [];
    const seenHex = new Set<string>();
    let rejectedCount = 0;

    for (const result of results) {
      if (result.status === 'fulfilled') {
        for (const ac of result.value) {
          const hex = (ac.hex || '').toLowerCase().trim();
          if (hex && !seenHex.has(hex)) {
            seenHex.add(hex);
            if (ac.lat != null && ac.lon != null) {
              allAircraft.push({
                hex,
                flight: ac.flight?.trim() || '',
                lat: ac.lat,
                lng: ac.lon,
                alt: ac.alt_baro ? Math.round(ac.alt_baro * 0.3048) : null,
                alt_geom: ac.alt_geom ? Math.round(ac.alt_geom * 0.3048) : null,
                gs: ac.gs ? Math.round(ac.gs * 1.852) : null,
                track: ac.track || 0,
                roc: ac.baro_rate || 0,
                category: ac.category || 'unknown',
                reg: ac.r || '',
                type: ac.t || '',
                dbFlags: ac.dbFlags || 0,
                seen: Date.now(),
              });
            } else {
              rejectedCount++;
            }
          } else {
            rejectedCount++;
          }
        }
      } else {
        rejectedCount++;
      }
    }

    const latency = Date.now() - start;
    const health = createSourceHealthRecord({
      sourceId,
      lastAttemptAt: attemptedAt,
      lastSuccessAt: attemptedAt,
      lastRecordTimestamp: new Date().toISOString(),
      httpStatus,
      latencyMs: latency,
      recordsFetched: allAircraft.length + rejectedCount,
      recordsAccepted: allAircraft.length,
      recordsRejected: rejectedCount,
      recordsDeduplicated: 0,
      schemaFailures: 0,
      consecutiveFailures: 0,
      authenticationState: 'valid',
      rateLimitState: 'ok',
      errorMessage: null,
    });
    await globalRepository.updateSourceHealth(health);

    return NextResponse.json(createEnvelope(
      { flights: allAircraft, total: allAircraft.length },
      [sourceId],
      [],
      'fresh',
      0,
    ), {
      headers: { 'Cache-Control': 'public, s-maxage=15, stale-while-revalidate=45' },
    });
  } catch (e) {
    const latency = Date.now() - start;
    errorMessage = e instanceof Error ? e.message : String(e);
    httpStatus = 500;

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
      authenticationState: 'unknown',
      rateLimitState: 'unknown',
      errorMessage,
    });
    await globalRepository.updateSourceHealth(health);

    return NextResponse.json(
      { error: errorMessage, flights: [], total: 0 },
      { status: 500 },
    );
  }
}
