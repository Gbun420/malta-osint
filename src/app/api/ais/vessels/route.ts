import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const scannerUrl = process.env.SCANNER_URL;
  const scannerKey = process.env.SCANNER_KEY;

  if (!scannerUrl || !scannerKey) {
    return NextResponse.json({
      vessels: [],
      count: 0,
      connected: false,
      error: 'Scanner not configured',
      timestamp: Date.now(),
    });
  }

  try {
    const res = await fetch(`${scannerUrl}/ais/vessels`, {
      headers: { 'X-Scanner-Key': scannerKey },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({
        vessels: [],
        count: 0,
        connected: false,
        error: `Scanner returned ${res.status}`,
        timestamp: Date.now(),
      });
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
  } catch (e) {
    return NextResponse.json({
      vessels: [],
      count: 0,
      connected: false,
      error: e instanceof Error ? e.message : 'Failed to reach scanner',
      timestamp: Date.now(),
    });
  }
}
