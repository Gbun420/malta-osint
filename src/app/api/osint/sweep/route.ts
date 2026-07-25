import { NextResponse } from 'next/server';
import { parseIPv4, isPrivateOrReserved } from '@/lib/osint-utils';

export const dynamic = 'force-dynamic';

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 5;

function checkRateLimit(requesterIp: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(requesterIp);

  if (!entry) {
    rateLimitMap.set(requesterIp, { timestamps: [now] });
    return true;
  }

  entry.timestamps = entry.timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (entry.timestamps.length >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.timestamps.push(now);
  return true;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // --- 1. IP Validation ---
  const ip = searchParams.get('ip');
  if (!ip) {
    return NextResponse.json({ error: 'Missing ip parameter' }, { status: 400 });
  }

  const octets = parseIPv4(ip);
  if (!octets) {
    return NextResponse.json({ error: 'Invalid IPv4 address format' }, { status: 400 });
  }

  if (isPrivateOrReserved(octets)) {
    return NextResponse.json(
      { error: 'Private and reserved IP ranges are not allowed' },
      { status: 400 },
    );
  }

  const cidrParam = searchParams.get('cidr');
  let cidr = 24;
  if (cidrParam) {
    cidr = parseInt(cidrParam, 10);
    if (isNaN(cidr) || cidr < 24 || cidr > 32) {
      return NextResponse.json(
        { error: 'CIDR must be between 24 and 32' },
        { status: 400 },
      );
    }
  }

  // --- 2. Rate Limiting ---
  const forwarded = req.headers.get('x-forwarded-for');
  const requesterIp = forwarded?.split(',')[0]?.trim() || '127.0.0.1';

  if (!checkRateLimit(requesterIp)) {
    return NextResponse.json(
      { error: 'Rate limit exceeded.' },
      { status: 429 },
    );
  }

  try {
    // --- 3. Geolocation ---
    const geoRes = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,isp,org,as,proxy,hosting`,
      { signal: AbortSignal.timeout(5000) },
    );

    if (!geoRes.ok) {
      return NextResponse.json(
        { error: 'Geolocation service unavailable' },
        { status: 502 },
      );
    }

    const geoData = await geoRes.json();
    if (geoData.status === 'fail') {
      return NextResponse.json(
        { error: `Geolocation failed: ${geoData.message || 'Unknown error'}` },
        { status: 422 },
      );
    }

    const center = {
      lat: geoData.lat as number,
      lng: geoData.lon as number,
      city: geoData.city as string,
      region: geoData.regionName as string,
      country: geoData.country as string,
      countryCode: geoData.countryCode as string,
      isp: geoData.isp as string,
      asn: (geoData.as as string) || '',
      org: (geoData.org as string) || '',
    };

    // --- 4. Port Scan via local scanner (if configured) ---
    let scanResult = null;
    const scannerUrl = process.env.SCANNER_URL;
    const scannerKey = process.env.SCANNER_KEY;
    if (scannerUrl && scannerKey) {
      try {
        const scanRes = await fetch(`${scannerUrl}/scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Scanner-Key': scannerKey,
          },
          body: JSON.stringify({ host: ip }),
          signal: AbortSignal.timeout(15000),
        });
        if (scanRes.ok) {
          scanResult = await scanRes.json();
        }
      } catch {
        // Scanner unreachable — skip scan
      }
    }

    return NextResponse.json({
      center,
      target_ip: ip,
      cidr,
      ...(scanResult && { scan: { open_ports: scanResult.open, closed_ports: scanResult.closed, scanned_at: scanResult.timestamp } }),
    }, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (err) {
    console.error('[THIRD EYE] Sweep Init error:', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'Sweep initialization failed' }, { status: 500 });
  }
}
