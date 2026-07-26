import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface VesselAPIPosition {
  mmsi?: number;
  imo?: number;
  latitude?: number;
  longitude?: number;
  sog?: number;
  cog?: number;
  heading?: number;
  nav_status?: number;
  vessel_name?: string;
  timestamp?: string;
  processed_timestamp?: string;
  suspected_glitch?: boolean;
}

interface RegionBBox {
  name: string;
  lonLeft: number;
  latBottom: number;
  lonRight: number;
  latTop: number;
}

const MAJOR_REGIONS: RegionBBox[] = [
  { name: 'singapore-strait', lonLeft: 103.5, latBottom: 1.0, lonRight: 104.5, latTop: 1.5 },
  { name: 'english-channel', lonLeft: 1.0, latBottom: 50.8, lonRight: 2.5, latTop: 51.5 },
  { name: 'gibraltar', lonLeft: -5.8, latBottom: 35.8, lonRight: -5.0, latTop: 36.2 },
  { name: 'suez-north', lonLeft: 32.3, latBottom: 29.5, lonRight: 32.8, latTop: 30.2 },
  { name: 'panama-pacific', lonLeft: -79.8, latBottom: 8.8, lonRight: -79.3, latTop: 9.5 },
  { name: 'shanghai-approach', lonLeft: 122.0, latBottom: 30.0, lonRight: 123.0, latTop: 31.5 },
  { name: 'rotterdam-approach', lonLeft: 3.5, latBottom: 51.5, lonRight: 5.0, latTop: 52.5 },
  { name: 'bosporus', lonLeft: 28.7, latBottom: 40.9, lonRight: 29.2, latTop: 41.3 },
  { name: 'java-sea', lonLeft: 106.0, latBottom: -6.5, lonRight: 107.5, latTop: -5.5 },
  { name: 'ny-harbor', lonLeft: -74.5, latBottom: 40.3, lonRight: -73.5, latTop: 40.8 },
];

const MAX_PAGES_PER_REGION = 2;

function parseTimestamp(ts: string | undefined): number {
  if (!ts) return Date.now();
  const d = new Date(ts);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}

function computePositionAge(ts: string | undefined): number {
  if (!ts) return -1;
  const d = new Date(ts);
  if (isNaN(d.getTime())) return -1;
  return Math.floor((Date.now() - d.getTime()) / 1000);
}

async function fetchRegion(
  apiKey: string,
  region: RegionBBox,
): Promise<{
  vessels: VesselAPIPosition[];
  dataSource: string;
  error: string | null;
  regionName: string;
}> {
  const allVessels: VesselAPIPosition[] = [];
  let dataSource = 'terrestrial';
  let nextToken: string | undefined;
  let pages = 0;
  let error: string | null = null;

  while (pages < MAX_PAGES_PER_REGION) {
    try {
      const params = new URLSearchParams({
        'filter.lonLeft': String(region.lonLeft),
        'filter.latBottom': String(region.latBottom),
        'filter.lonRight': String(region.lonRight),
        'filter.latTop': String(region.latTop),
        'pagination.limit': '50',
      });

      if (nextToken) {
        params.set('pagination.nextToken', nextToken);
      }

      const res = await fetch(
        `https://api.vesselapi.com/v1/location/vessels/bounding-box?${params}`,
        {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(15000),
        },
      );

      dataSource = res.headers.get('X-Data-Source') || dataSource;

      if (res.status === 402) {
        console.error(`[vessels] satellite credits required for region ${region.name}`);
        break;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => '');
        const redacted = body.length > 0 ? ` (body length ${body.length})` : '';
        console.error(`[vessels] HTTP ${res.status} for ${region.name}${redacted}`);
        error = `HTTP ${res.status} for ${region.name}`;
        break;
      }

      const data = await res.json();
      const vessels: VesselAPIPosition[] = data?.vessels ?? [];
      allVessels.push(...vessels.filter(v => !v.suspected_glitch));
      nextToken = data?.nextToken ?? undefined;
      pages++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown error';
      console.error(`[vessels] fetch failed for ${region.name}: ${msg}`);
      error = `fetch error for ${region.name}`;
      break;
    }
  }

  return { vessels: allVessels, dataSource, error, regionName: region.name };
}

export async function GET() {
  const apiKey = process.env.VESSEL_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      vessels: [],
      count: 0,
      connected: false,
      error: 'VESSEL_API_KEY not configured',
      timestamp: Date.now(),
      fallback: true,
      dataSource: null,
    });
  }

  const results = await Promise.allSettled(
    MAJOR_REGIONS.map(region => fetchRegion(apiKey, region)),
  );

  let allVessels: VesselAPIPosition[] = [];
  let dataSource = 'terrestrial';
  let hasErrors = false;
  const regionErrors: string[] = [];

  for (const result of results) {
    if (result.status === 'rejected') {
      hasErrors = true;
      continue;
    }
    const r = result.value;
    allVessels.push(...r.vessels);
    if (r.error) {
      hasErrors = true;
      regionErrors.push(r.error);
    }
    if (r.dataSource === 'satellite') {
      dataSource = 'satellite';
    }
  }

  const seen = new Set<number>();
  const deduped = allVessels.filter(v => {
    if (!v.mmsi) return false;
    if (seen.has(v.mmsi)) return false;
    seen.add(v.mmsi);
    return true;
  });

  const mapped = deduped.map(v => ({
    mmsi: v.mmsi!,
    name: v.vessel_name || `SAT-${v.mmsi}`,
    lat: v.latitude!,
    lng: v.longitude!,
    sog: v.sog ?? 0,
    cog: v.cog ?? 0,
    heading: v.heading ?? v.cog ?? 0,
    navStatus: v.nav_status ?? 0,
    rot: 0,
    type: 'unknown',
    dimension: { a: 0, b: 0, c: 0, d: 0 },
    draught: 0,
    destination: '',
    eta: '',
    callSign: '',
    imo: v.imo ? String(v.imo) : '',
    lastUpdate: parseTimestamp(v.timestamp),
    positionAge: computePositionAge(v.timestamp),
  }));

  return NextResponse.json({
    vessels: mapped,
    count: mapped.length,
    connected: true,
    error: hasErrors ? regionErrors.join('; ') : null,
    timestamp: Date.now(),
    fallback: hasErrors,
    dataSource,
  });
}
