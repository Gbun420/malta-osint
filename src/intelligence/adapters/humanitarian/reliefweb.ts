import { createHash } from 'crypto';
import { safeFetch } from '@/intelligence/ingestion/fetch';
import { getSourceDefinition } from '@/intelligence/schemas/source-registry';
import type { AdapterResult } from '@/intelligence/schemas/registry';
import type { IntelligenceEvent } from '@/intelligence/types';
import { classify } from '@/intelligence/classification';

export async function fetchReliefWeb(): Promise<AdapterResult<IntelligenceEvent>> {
  const sourceId = 'reliefweb';
  const attemptedAt = new Date().toISOString();
  const start = Date.now();
  const errors: { code: string; message: string; retryable: boolean }[] = [];
  const warnings: string[] = [];

  const appName = process.env.RELIEFWEB_APP_NAME || '';

  if (!process.env.RELIEFWEB_APP_NAME) {
    const elapsed = Date.now() - start;
    return {
      sourceId,
      attemptedAt,
      completedAt: new Date().toISOString(),
      status: 'unconfigured',
      records: [],
      rawCount: 0,
      acceptedCount: 0,
      rejectedCount: 0,
      deduplicatedCount: 0,
      latencyMs: elapsed,
      errors: [{ code: 'UNCONFIGURED', message: 'RELIEFWEB_APP_NAME not set — register at https://apidoc.reliefweb.int/parameters#appname', retryable: false }],
      warnings: ['Set RELIEFWEB_APP_NAME in environment to enable ReliefWeb'],
    };
  }

  try {
    const url = `https://api.reliefweb.int/v2/reports?appname=${appName}&limit=50&sort[]=date:desc&fields[include][]=title&fields[include][]=body&fields[include][]=date&fields[include][]=url&fields[include][]=source`;
    const fetchResult = await safeFetch({
      url,
      timeoutMs: 15000,
      maxRetries: 2,
      expectedContentType: ['application/json'],
    });

    if (!fetchResult.ok) {
      return {
        sourceId,
        attemptedAt,
        completedAt: new Date().toISOString(),
        status: 'error',
        records: [],
        rawCount: 0,
        acceptedCount: 0,
        rejectedCount: 0,
        deduplicatedCount: 0,
        latencyMs: fetchResult.latencyMs,
        errors: [{ code: 'HTTP_ERROR', message: fetchResult.error || 'Unknown', retryable: true }],
        warnings: [],
      };
    }

    const data = JSON.parse(fetchResult.body);
    const items = data.data || [];

    const events: IntelligenceEvent[] = [];
    let rejectedCount = 0;

    for (const item of items) {
      const fields = item.fields || {};
      const title = (fields.title || '').trim();
      if (!title) { rejectedCount++; continue; }

      const body = fields.body || '';
      const pubDate = fields.date?.created || fields.date?.original || '';
      const link = fields.url?.href || fields.url || '';
      const source = fields.source?.name || 'ReliefWeb';

      const categories = classify(undefined, title + ' ' + (typeof body === 'string' ? body : ''));
      const catNames = categories.map(c => c.category);

      const id = `reliefweb-${item.id || createHash('sha256').update(link).digest('hex').slice(0, 20)}`;

      events.push({
        id,
        canonicalKey: `reliefweb-${pubDate}-${title.slice(0, 40)}`,
        title,
        summary: typeof body === 'string' ? body.slice(0, 300) : title,
        categories: catNames.length ? catNames as any : ['humanitarian'],
        subcategories: [],
        eventTime: pubDate || null,
        timePrecision: pubDate ? 'day' : 'unknown',
        firstObservedAt: new Date().toISOString(),
        lastObservedAt: new Date().toISOString(),
        ingestedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        locations: [],
        countries: fields.country?.map((c: any) => ({
          alpha2: (c.shortname || '').toLowerCase(),
          name: c.name || c.shortname,
        })) || [],
        regions: [],
        actors: [],
        linkedEntities: [],
        linkedAssets: [],
        severity: 2,
        confidenceScore: 85,
        maltaRelevanceScore: 30,
        verificationState: 'single-source',
        sourceCount: 1,
        officialSourceCount: source.toLowerCase().includes('un') || source.toLowerCase().includes('ocha') ? 1 : 0,
        evidenceIds: [],
        claimIds: [],
        status: 'active',
        provenance: { ingestedAt: new Date().toISOString(), ingestionMethod: 'polling', adapterId: sourceId, parserVersion: '1' },
      });
    }

    const elapsed = Date.now() - start;
    return {
      sourceId,
      attemptedAt,
      completedAt: new Date().toISOString(),
      status: events.length > 0 ? 'ok' : 'empty',
      records: events,
      rawCount: items.length,
      acceptedCount: events.length,
      rejectedCount,
      deduplicatedCount: 0,
      latencyMs: elapsed,
      errors: [],
      warnings: [],
    };
  } catch (e) {
    const elapsed = Date.now() - start;
    return {
      sourceId,
      attemptedAt,
      completedAt: new Date().toISOString(),
      status: 'error',
      records: [],
      rawCount: 0,
      acceptedCount: 0,
      rejectedCount: 0,
      deduplicatedCount: 0,
      latencyMs: elapsed,
      errors: [{ code: 'FETCH_ERROR', message: e instanceof Error ? e.message : String(e), retryable: true }],
      warnings: [],
    };
  }
}
