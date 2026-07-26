import { NextResponse } from 'next/server';
import Parser from 'rss-parser';

export const dynamic = 'force-dynamic';

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Malta-OSINT/1.0' },
});

const EU_SANCTIONS_FEED = 'https://data.europa.eu/api/hub/store/data/consolidated-list-of-persons-groups-and-entities-subject-to-eu-financial-sanctions.rdf';

interface SanctionEntry {
  id: string;
  name: string;
  aliases: string[];
  designation: string;
  programme: string;
  euReference: string;
  reason: string;
  dateListed: string | null;
  nationalities: string[];
  entityType: 'person' | 'entity' | 'vessel' | 'aircraft';
}

export async function GET() {
  try {
    const res = await fetch(EU_SANCTIONS_FEED, {
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      return NextResponse.json({
        sanctions: [],
        count: 0,
        error: `EU sanctions feed returned ${res.status}`,
        timestamp: new Date().toISOString(),
        source: 'EU Consolidated Sanctions List',
        scope: 'global',
        coverageLabel: 'EU financial sanctions — persons, groups, entities',
      });
    }

    const xml = await res.text();
    const sanctions: SanctionEntry[] = [];

    const entries = xml.match(/<Description[\s\S]*?<\/Description>/gi) || [];
    for (const entry of entries) {
      const nameMatch = entry.match(/<Name>(.*?)<\/Name>/i);
      const programmeMatch = entry.match(/<Programme>(.*?)<\/Programme>/i);
      const reasonMatch = entry.match(/<Reason>(.*?)<\/Reason>/i);
      const typeMatch = entry.match(/<EntityType>(.*?)<\/EntityType>/i);

      if (!nameMatch) continue;

      const name = nameMatch[1].trim();
      const id = Buffer.from(name).toString('base64').slice(0, 20).replace(/[^a-zA-Z0-9]/g, '');

      sanctions.push({
        id: `eu-sanction-${id}`,
        name,
        aliases: [],
        designation: '',
        programme: programmeMatch ? programmeMatch[1].trim() : 'EU Restrictive Measures',
        euReference: '',
        reason: reasonMatch ? reasonMatch[1].trim() : '',
        dateListed: null,
        nationalities: [],
        entityType: (typeMatch?.[1]?.trim() as any) || 'entity',
      });
    }

    return NextResponse.json({
      sanctions,
      count: sanctions.length,
      total: sanctions.length,
      timestamp: new Date().toISOString(),
      source: 'EU Consolidated Sanctions List',
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
    }, { status: 500 });
  }
}
