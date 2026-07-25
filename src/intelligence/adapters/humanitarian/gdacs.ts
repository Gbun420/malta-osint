import { createHash } from 'crypto';
import Parser from 'rss-parser';
import { getSourceDefinition } from '@/intelligence/schemas/source-registry';
import type { AdapterResult } from '@/intelligence/schemas/registry';
import type { IntelligenceEvent } from '@/intelligence/types';
import { classify } from '@/intelligence/classification';

const parser = new Parser({
  timeout: 10000,
  headers: { 'User-Agent': 'Third-Eye-Intelligence/1.0' },
});

const FEEDS = [
  { name: 'GDACS Events', url: 'https://www.gdacs.org/rss.aspx' },
];

const CATEGORY_MAP: Record<string, string> = {
  'earthquake': 'natural-disaster',
  'flood': 'natural-disaster',
  'tropical cyclone': 'natural-disaster',
  'volcano': 'natural-disaster',
  'wildfire': 'natural-disaster',
  'drought': 'natural-disaster',
};

export async function fetchGDACS(): Promise<AdapterResult<IntelligenceEvent>> {
  const sourceId = 'gdacs';
  const attemptedAt = new Date().toISOString();
  const start = Date.now();
  const errors: { code: string; message: string; retryable: boolean }[] = [];
  const warnings: string[] = [];

  const events: IntelligenceEvent[] = [];
  let rawCount = 0;
  let rejectedCount = 0;

  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      const items = parsed.items || [];
      rawCount += items.length;

      for (const item of items) {
        const title = (item.title || '').trim();
        if (!title) { rejectedCount++; continue; }
        const link = item.link || '';
        const pubDate = item.isoDate || item.pubDate || '';
        const content = item.contentSnippet || '';

        const categories = classify(undefined, content + ' ' + title);
        const catNames = categories.map(c => c.category);
        const gdacsCategory = CATEGORY_MAP[catNames.find(c => c in CATEGORY_MAP) || ''] || 'natural-disaster';
        const allCats = [...new Set([...(catNames as string[]), gdacsCategory])];

        const id = `gdacs-${createHash('sha256').update(link).digest('hex').slice(0, 20)}`;

        events.push({
          id,
          canonicalKey: `gdacs-${pubDate}-${title.slice(0, 40)}`,
          title,
          summary: content.slice(0, 300) || title,
          description: content,
          categories: allCats as any,
          subcategories: [],
          eventTime: pubDate || null,
          timePrecision: pubDate ? 'day' : 'unknown',
          firstObservedAt: new Date().toISOString(),
          lastObservedAt: new Date().toISOString(),
          ingestedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          locations: [],
          countries: [],
          regions: [],
          actors: [],
          linkedEntities: [],
          linkedAssets: [],
          severity: 3,
          confidenceScore: 85,
          maltaRelevanceScore: 30,
          verificationState: 'single-source',
          sourceCount: 1,
          officialSourceCount: 1,
          evidenceIds: [],
          claimIds: [],
          status: 'active',
          provenance: { ingestedAt: new Date().toISOString(), ingestionMethod: 'polling', adapterId: sourceId, parserVersion: '1' },
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push({ code: 'FETCH_ERROR', message: `${feed.name}: ${msg}`, retryable: true });
    }
  }

  const elapsed = Date.now() - start;

  return {
    sourceId,
    attemptedAt,
    completedAt: new Date().toISOString(),
    status: events.length > 0 ? 'ok' : errors.length === FEEDS.length ? 'error' : 'partial',
    records: events,
    rawCount,
    acceptedCount: events.length,
    rejectedCount,
    deduplicatedCount: 0,
    latencyMs: elapsed,
    errors,
    warnings,
  };
}
