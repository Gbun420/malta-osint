import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface VesselAPIPosition {
  mmsi?: number;
  lat?: number;
  lon?: number;
  sog?: number;
  cog?: number;
  heading?: number;
  shipType?: number;
  name?: string;
  destination?: string;
  callSign?: string;
  imo?: number;
  draught?: number;
  eta?: string;
  timestamp?: string;
  status?: number;
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
    });
  }

  try {
    const params = new URLSearchParams({
      'filter.lonLeft': '-180',
      'filter.latBottom': '-90',
      'filter.lonRight': '180',
      'filter.latTop': '90',
      'pagination.limit': '50',
    });

    const res = await fetch(
      `https://api.vesselapi.com/v1/location/vessels/bounding-box?${params}`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15000),
      }
    );

    if (res.status === 402) {
      return NextResponse.json({
        vessels: [],
        count: 0,
        connected: false,
        error: 'VesselAPI satellite credits exhausted',
        timestamp: Date.now(),
      });
    }

    if (!res.ok) {
      return NextResponse.json({
        vessels: [],
        count: 0,
        connected: false,
        error: `VesselAPI returned ${res.status}`,
        timestamp: Date.now(),
      });
    }

    const data = await res.json();
    const rawPositions: VesselAPIPosition[] = data?.vesselPositions || [];

    const vessels = rawPositions
      .filter((v: VesselAPIPosition) => v.mmsi && v.lat != null && v.lon != null)
      .map((v: VesselAPIPosition) => ({
        mmsi: v.mmsi!,
        name: v.name || `SAT-${v.mmsi}`,
        lat: v.lat!,
        lng: v.lon!,
        sog: v.sog ?? 0,
        cog: v.cog ?? 0,
        heading: v.heading ?? v.cog ?? 0,
        navStatus: v.status ?? 0,
        rot: 0,
        type: v.shipType != null ? String(v.shipType) : 'unknown',
        dimension: { a: 0, b: 0, c: 0, d: 0 },
        draught: v.draught ?? 0,
        destination: v.destination || '',
        eta: v.eta || '',
        callSign: v.callSign || '',
        imo: v.imo ? String(v.imo) : '',
        lastUpdate: Date.now(),
        positionAge: 0,
      }));

    return NextResponse.json({
      vessels,
      count: vessels.length,
      connected: true,
      error: null,
      timestamp: Date.now(),
    });
  } catch (e) {
    return NextResponse.json({
      vessels: [],
      count: 0,
      connected: false,
      error: e instanceof Error ? e.message : 'Failed to fetch VesselAPI',
      timestamp: Date.now(),
    });
  }
}
