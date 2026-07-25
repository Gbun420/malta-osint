import { NextResponse } from 'next/server';

export async function GET() {
  const results: any[] = [];
  for (const url of [
    'https://www.consilium.europa.eu/en/press/press-releases/?feed=rss&category=foreign-affairs',
    'https://www.eeas.europa.eu/delegations/malta_en?format=rss',
    'https://news.un.org/feed/subscribe/en/news/all/rss.xml',
    'https://www.gdacs.org/xml/rss_20.xml',
    'https://api.reliefweb.int/v1/reports?appname=test&limit=1',
  ]) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const text = await resp.text();
      results.push({
        url: url.slice(0, 60),
        status: resp.status,
        contentType: resp.headers.get('content-type'),
        length: text.length,
        first200: text.slice(0, 200).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ''),
      });
    } catch (e: any) {
      results.push({ url: url.slice(0, 60), error: e?.message || String(e) });
    }
  }
  return NextResponse.json({ redis: !!process.env.UPSTASH_REDIS_REST_URL, results });
}
