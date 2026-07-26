import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface VesselAPIVessel {
  mmsi?: number;
  MMSI?: number;
  lat?: number;
  latitude?: number;
  lng?: number;
  longitude?: number;
  sog?: number;
  speed?: number;
  cog?: number;
  heading?: number;
  type?: string;
  ship_type?: string;
  name?: string;
  ship_name?: string;
  destination?: string;
  flag?: string;
  callSign?: string;
  call_sign?: string;
  imo?: string;
  IMO?: string;
  draught?: number;
  eta?: string;
  ship_type_id?: number;
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
    const res = await fetch(
      `https://api.vesselapi.com/v1/tracking?bbox=-90,-180,90,180&limit=500`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(15000),
      }
    );

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
    const rawVessels: VesselAPIVessel[] = data?.vessels || data?.data || [];

    const vessels = rawVessels
      .filter((v: VesselAPIVessel) => {
        const mmsi = v.mmsi || v.MMSI;
        const lat = v.lat ?? v.latitude;
        const lng = v.lng ?? v.longitude;
        return mmsi && lat != null && lng != null;
      })
      .map((v: VesselAPIVessel) => {
        const mmsi = v.mmsi || v.MMSI!;
        return {
          mmsi,
          name: v.name || v.ship_name || `SAT-${mmsi}`,
          lat: v.lat ?? v.latitude!,
          lng: v.lng ?? v.longitude!,
          sog: v.sog ?? v.speed ?? 0,
          cog: v.cog ?? v.heading ?? 0,
          heading: v.cog ?? v.heading ?? 0,
          navStatus: 0,
          rot: 0,
          type: v.type || v.ship_type || 'unknown',
          dimension: { a: 0, b: 0, c: 0, d: 0 },
          draught: v.draught ?? 0,
          destination: v.destination || '',
          eta: v.eta || '',
          callSign: v.callSign || v.call_sign || '',
          imo: v.imo ? String(v.imo) : (v.IMO ? String(v.IMO) : ''),
          lastUpdate: Date.now(),
          positionAge: 0,
        };
      });

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
