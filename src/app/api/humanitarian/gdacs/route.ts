import { NextResponse } from 'next/server';
import { fetchGDACS } from '@/intelligence/adapters/humanitarian/gdacs';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await fetchGDACS();
    return NextResponse.json({
      events: result.records,
      total: result.acceptedCount,
      status: result.status,
      timestamp: result.completedAt,
      scope: 'global',
      coverageLabel: 'GDACS — global disaster alerts and warnings',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300' },
    });
  } catch (e) {
    return NextResponse.json({ events: [], error: e instanceof Error ? e.message : 'Unknown' }, { status: 500 });
  }
}
