import { NextResponse } from 'next/server';
import { fetchReliefWeb } from '@/intelligence/adapters/humanitarian/reliefweb';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await fetchReliefWeb();
    return NextResponse.json({
      events: result.records,
      total: result.acceptedCount,
      status: result.status,
      timestamp: result.completedAt,
      scope: 'global',
      coverageLabel: 'ReliefWeb — humanitarian reports and situation updates',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300' },
    });
  } catch (e) {
    return NextResponse.json({ events: [], error: e instanceof Error ? e.message : 'Unknown' }, { status: 500 });
  }
}
