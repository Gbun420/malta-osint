import { NextResponse } from 'next/server';
import { createEnvelope } from '@/intelligence/schemas/api-envelope';
import { globalRepository } from '@/intelligence/repository/memory';
import { createSourceHealthRecord } from '@/intelligence/source-health';

function parseFiresCSV(csv: string): any[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const header = lines[0].split(',');
  const latIdx = header.indexOf('latitude');
  const lngIdx = header.indexOf('longitude');
  const brightIdx = header.indexOf('bright_ti4') !== -1 ? header.indexOf('bright_ti4') : header.indexOf('brightness');
  const confIdx = header.indexOf('confidence');
  const dateIdx = header.indexOf('acq_date');
  const timeIdx = header.indexOf('acq_time');

  const fires: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const lat = parseFloat(cols[latIdx]);
    const lng = parseFloat(cols[lngIdx]);
    if (isNaN(lat) || isNaN(lng)) continue;
    fires.push({
      lat: Math.round(lat * 1000) / 1000,
      lng: Math.round(lng * 1000) / 1000,
      brightness: parseFloat(cols[brightIdx]) || 0,
      confidence: cols[confIdx] || 'unknown',
      time: dateIdx !== -1
        ? new Date(cols[dateIdx] + (cols[timeIdx] ? 'T' + cols[timeIdx].padStart(4, '0') : '')).getTime()
        : Date.now(),
    });
  }
  return fires;
}

export async function GET() {
  const sourceId = 'nasa-firms';
  const attemptedAt = new Date().toISOString();
  const start = Date.now();
  const httpStatus = 200;
  let errorMessage: string | null = null;

  try {
    const firmsApiKey = process.env.FIRMS_API_KEY;
    let fires: any[] = [];
    let sourceUsed = '';

    if (firmsApiKey) {
      const areaSources = [
        { name: 'VIIRS', url: `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${firmsApiKey}/VIIRS_SNPP_NRT/global/2` },
        { name: 'MODIS', url: `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${firmsApiKey}/MODIS_NRT/global/2` },
      ];
      for (const s of areaSources) {
        try {
          const res = await fetch(s.url, { signal: AbortSignal.timeout(15000) });
          if (res.ok) {
            const text = await res.text();
            if (text && text.includes('latitude') && text.length > 200) {
              const parsed = parseFiresCSV(text);
              if (parsed.length > 0) { fires = parsed; sourceUsed = s.name; break; }
            }
          }
        } catch { continue; }
      }
    }

    if (fires.length === 0) {
      const publicSources = [
        'https://firms.modaps.eosdis.nasa.gov/data/active_fire/suomi-npp-viirs-c2/csv/SUOMI_VIIRS_C2_Global_24h.csv',
        'https://firms.modaps.eosdis.nasa.gov/data/active_fire/modis-c6.1/csv/MODIS_C6_1_Global_24h.csv',
      ];
      for (const url of publicSources) {
        try {
          const res = await fetch(url, {
            signal: AbortSignal.timeout(15000),
            headers: { 'User-Agent': 'Third-Eye-Intelligence/1.0' },
          });
          if (res.ok) {
            const text = await res.text();
            if (text && text.includes('latitude') && text.length > 200) {
              const parsed = parseFiresCSV(text);
              if (parsed.length > 0) {
                fires = parsed;
                sourceUsed = url.includes('SUOMI') ? 'VIIRS (public)' : 'MODIS (public)';
                break;
              }
            }
          }
        } catch { continue; }
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
      recordsFetched: fires.length,
      recordsAccepted: fires.length,
      recordsRejected: 0,
      recordsDeduplicated: 0,
      schemaFailures: 0,
      consecutiveFailures: 0,
      authenticationState: firmsApiKey ? 'valid' : 'not-configured',
      rateLimitState: 'ok',
      errorMessage: null,
    });
    await globalRepository.updateSourceHealth(health);

    return NextResponse.json(createEnvelope(
      { fires, total: fires.length, source: sourceUsed || 'none' },
      [sourceId],
      firmsApiKey ? [] : ['FIRMS_API_KEY not set — using public CSV fallback'],
    ), {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
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
      authenticationState: process.env.FIRMS_API_KEY ? 'valid' : 'not-configured',
      rateLimitState: 'unknown',
      errorMessage,
    });
    await globalRepository.updateSourceHealth(health);

    return NextResponse.json(
      { error: errorMessage, fires: [], total: 0 },
      { status: 500 },
    );
  }
}
