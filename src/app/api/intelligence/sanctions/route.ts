import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

export const dynamic = 'force-dynamic';

const parser = new Parser({
  timeout: 15000,
  headers: { 'User-Agent': 'Malta-OSINT/1.0' },
});

const EU_SANCTIONS_FEED = 'https://webgate.ec.europa.eu/fsd/fsf/public/rss';

export async function GET() {
  try {
    const feed = await parser.parseURL(EU_SANCTIONS_FEED);

    const sanctions = (feed.items || []).map((item, i) => ({
      id: `eu-sanction-${i}-${item.guid ? item.guid.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '') : i}`,
      name: item.title || 'Unknown',
      aliases: [],
      designation: '',
      programme: item.categories?.[0] || 'EU Restrictive Measures',
      euReference: item.link || '',
      reason: item.contentSnippet?.slice(0, 500) || item.content?.slice(0, 500) || '',
      dateListed: item.pubDate || null,
      nationalities: [],
      entityType: 'entity' as const,
    }));

    return NextResponse.json({
      sanctions,
      count: sanctions.length,
      total: sanctions.length,
      timestamp: new Date().toISOString(),
      source: 'EU Consolidated Sanctions List (RSS)',
      scope: 'global',
      coverageLabel: 'EU financial sanctions — persons, groups, entities',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
    });
  } catch (error) {
    console.error('[EU Sanctions] Fetch error:', error);
    return NextResponse.json({
      sanctions: [],
      count: 0,
      error: 'Failed to fetch EU sanctions list',
      timestamp: new Date().toISOString(),
      scope: 'global',
      coverageLabel: 'EU financial sanctions — persons, groups, entities',
    }, { status: 500 });
  }
}
