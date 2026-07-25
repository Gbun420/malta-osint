import { NextResponse } from 'next/server';
import Parser from 'rss-parser';
import { createEnvelope } from '@/intelligence/schemas/api-envelope';
import { globalRepository } from '@/intelligence/repository/memory';
import { createSourceHealthRecord } from '@/intelligence/source-health';

const FEEDS = [
  { name: 'Lovin Malta', url: 'https://lovinmalta.com/feed/' },
  { name: 'Newsbook', url: 'https://newsbook.com.mt/feed/' },
  { name: 'TVM News', url: 'https://tvmnews.mt/feed/' },
];

export async function GET() {
  const sourceIds = ['lovin-malta', 'newsbook', 'tvm-news'];
  const attemptedAt = new Date().toISOString();
  const start = Date.now();
  const parser = new Parser({
    timeout: 5000,
    headers: { 'User-Agent': 'Third-Eye-Intelligence/1.0' },
  });

  const allItems: any[] = [];
  const seenGuids = new Set<string>();
  let rejectedCount = 0;

  for (const feed of FEEDS) {
    try {
      const parsed = await parser.parseURL(feed.url);
      if (!parsed.items?.length) {
        const retry = await parser.parseURL(feed.url);
        parsed.items = retry.items || [];
      }
      for (const item of parsed.items || []) {
        const title = (item.title || '').trim();
        if (!title) { rejectedCount++; continue; }
        const guid = item.guid || item.link || '';
        if (guid && seenGuids.has(guid)) continue;
        if (guid) seenGuids.add(guid);
        allItems.push({
          title,
          description: item.contentSnippet || item.content || '',
          link: item.link || '',
          pubDate: item.isoDate || item.pubDate || '',
          source: feed.name,
          guid,
        });
      }
    } catch {
      rejectedCount++;
    }
  }

  allItems.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  const latency = Date.now() - start;

  for (const sourceId of sourceIds) {
    const health = createSourceHealthRecord({
      sourceId,
      lastAttemptAt: attemptedAt,
      lastSuccessAt: attemptedAt,
      lastRecordTimestamp: allItems.length > 0 ? allItems[0].pubDate : null,
      httpStatus: 200,
      latencyMs: latency,
      recordsFetched: allItems.length + rejectedCount,
      recordsAccepted: allItems.length,
      recordsRejected: rejectedCount,
      recordsDeduplicated: 0,
      schemaFailures: 0,
      consecutiveFailures: 0,
      authenticationState: 'valid',
      rateLimitState: 'ok',
      errorMessage: null,
    });
    await globalRepository.updateSourceHealth(health);
  }

  return NextResponse.json(createEnvelope(
    { news: allItems, total: allItems.length },
    sourceIds,
  ), {
    headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
  });
}
