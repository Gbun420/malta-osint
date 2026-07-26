import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchIntelligenceEvents, EventsServiceError } from '../eventsService';
import type { ApiEnvelope } from '@/intelligence/schemas/api-envelope';
import type { IntelligenceEvent } from '@/intelligence/types';

function makeEvent(overrides: Partial<IntelligenceEvent> = {}): IntelligenceEvent {
  return {
    id: 'evt-001',
    canonicalKey: 'test-event',
    title: 'Test Event',
    summary: 'A test intelligence event',
    categories: ['security'],
    subcategories: [],
    eventTime: '2026-01-01T00:00:00Z',
    timePrecision: 'day',
    firstObservedAt: '2026-01-01T00:00:00Z',
    lastObservedAt: '2026-01-01T00:00:00Z',
    ingestedAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    locations: [],
    countries: [],
    regions: [],
    actors: [],
    linkedEntities: [],
    linkedAssets: [],
    severity: 1,
    confidenceScore: 50,
    maltaRelevanceScore: 50,
    verificationState: 'single-source',
    sourceCount: 1,
    officialSourceCount: 0,
    evidenceIds: [],
    claimIds: [],
    status: 'active',
    provenance: {
      ingestedAt: '2026-01-01T00:00:00Z',
      ingestionMethod: 'polling',
      adapterId: 'test-adapter',
      parserVersion: '1.0',
    },
    ...overrides,
  };
}

function buildEnvelope(overrides: Partial<ApiEnvelope<{ events: unknown; total: unknown; offset: unknown; limit: unknown }>> = {}): ApiEnvelope<{ events: unknown; total: unknown; offset: unknown; limit: unknown }> {
  return {
    apiVersion: '1',
    generatedAt: '2026-07-26T12:00:00.000Z',
    status: 'ok',
    data: {
      events: [],
      total: 0,
      offset: 0,
      limit: 50,
    },
    meta: {
      sources: ['intelligence-repository'],
      recordCount: 0,
      warnings: [],
      cache: { state: 'fresh', ageSeconds: 0 },
    },
    ...overrides,
  };
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('fetchIntelligenceEvents', () => {
  it('parses a successful event response', async () => {
    const event = makeEvent();
    const envelope = buildEnvelope({
      data: { events: [event], total: 1, offset: 0, limit: 50 },
      meta: { sources: ['intelligence-repository'], recordCount: 1, warnings: [], cache: { state: 'fresh', ageSeconds: 0 } },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(envelope),
    } as Response);

    const result = await fetchIntelligenceEvents();

    expect(result.events).toHaveLength(1);
    expect(result.events[0].id).toBe('evt-001');
    expect(result.total).toBe(1);
    expect(result.offset).toBe(0);
    expect(result.limit).toBe(50);
  });

  it('parses envelope fields (apiVersion, generatedAt, meta)', async () => {
    const event = makeEvent();
    const envelope = buildEnvelope({
      data: { events: [event], total: 1, offset: 0, limit: 50 },
      meta: { sources: ['intelligence-repository', 'satellite'], recordCount: 1, warnings: ['partial coverage'], cache: { state: 'stale', ageSeconds: 120 } },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(envelope),
    } as Response);

    const result = await fetchIntelligenceEvents();

    expect(result.meta.sources).toEqual(['intelligence-repository', 'satellite']);
    expect(result.meta.recordCount).toBe(1);
    expect(result.meta.warnings).toEqual(['partial coverage']);
    expect(result.meta.cache.state).toBe('stale');
    expect(result.meta.cache.ageSeconds).toBe(120);
  });

  it('handles empty repository (data.events is [])', async () => {
    const envelope = buildEnvelope();

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(envelope),
    } as Response);

    const result = await fetchIntelligenceEvents();

    expect(result.events).toEqual([]);
    expect(result.total).toBe(0);
    expect(result.meta.recordCount).toBe(0);
  });

  it('throws EventsServiceError for malformed response (missing data.events)', async () => {
    const envelope = buildEnvelope();
    (envelope.data as any).events = undefined;

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(envelope),
    } as Response);

    await expect(fetchIntelligenceEvents()).rejects.toThrow(EventsServiceError);
    await expect(fetchIntelligenceEvents()).rejects.toThrow('missing events array');
  });

  it('throws EventsServiceError for HTTP failure (network error)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'));

    await expect(fetchIntelligenceEvents()).rejects.toThrow(EventsServiceError);
    await expect(fetchIntelligenceEvents()).rejects.toThrow('Network error');
  });

  it('throws EventsServiceError for non-200 HTTP status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    await expect(fetchIntelligenceEvents()).rejects.toThrow(EventsServiceError);
    await expect(fetchIntelligenceEvents()).rejects.toThrow('500');
  });

  it('throws EventsServiceError for envelope status error', async () => {
    const envelope = buildEnvelope({ status: 'error', data: null as any });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(envelope),
    } as Response);

    await expect(fetchIntelligenceEvents()).rejects.toThrow(EventsServiceError);
    await expect(fetchIntelligenceEvents()).rejects.toThrow('error');
  });

  it('throws EventsServiceError for envelope status error with custom warning', async () => {
    const envelope = buildEnvelope({
      status: 'error',
      data: null as any,
      meta: { sources: [], recordCount: 0, warnings: ['Database connection failed'], cache: { state: 'miss', ageSeconds: 0 } },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(envelope),
    } as Response);

    await expect(fetchIntelligenceEvents()).rejects.toThrow('Database connection failed');
  });

  it('throws EventsServiceError for non-JSON response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.reject(new SyntaxError('Unexpected token')),
    } as Response);

    await expect(fetchIntelligenceEvents()).rejects.toThrow(EventsServiceError);
    await expect(fetchIntelligenceEvents()).rejects.toThrow('not valid JSON');
  });

  it('passes pagination parameters correctly', async () => {
    const event = makeEvent();
    const envelope = buildEnvelope({
      data: { events: [event], total: 25, offset: 50, limit: 25 },
    });

    let capturedUrl = '';
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(envelope),
      } as Response);
    });

    await fetchIntelligenceEvents(3, 25);

    expect(capturedUrl).toContain('limit=25');
    expect(capturedUrl).toContain('offset=50');
  });

  it('defaults to page 1, limit 50 when no pagination given', async () => {
    const envelope = buildEnvelope();

    let capturedUrl = '';
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      capturedUrl = url;
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(envelope),
      } as Response);
    });

    await fetchIntelligenceEvents();

    expect(capturedUrl).toContain('limit=50');
    expect(capturedUrl).toContain('offset=0');
  });

  it('includes partial-data warnings from meta', async () => {
    const event = makeEvent();
    const envelope = buildEnvelope({
      data: { events: [event], total: 1, offset: 0, limit: 50 },
      meta: {
        sources: ['intelligence-repository'],
        recordCount: 1,
        warnings: ['Satellite feed degraded - data may be incomplete'],
        cache: { state: 'fresh', ageSeconds: 0 },
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(envelope),
    } as Response);

    const result = await fetchIntelligenceEvents();

    expect(result.meta.warnings).toHaveLength(1);
    expect(result.meta.warnings[0]).toContain('Satellite feed degraded');
  });

  it('handles partial status with valid data', async () => {
    const event = makeEvent();
    const envelope = buildEnvelope({
      status: 'partial',
      data: { events: [event], total: 1, offset: 0, limit: 50 },
      meta: {
        sources: ['intelligence-repository'],
        recordCount: 1,
        warnings: ['Some sources unavailable'],
        cache: { state: 'stale', ageSeconds: 300 },
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(envelope),
    } as Response);

    const result = await fetchIntelligenceEvents();

    expect(result.events).toHaveLength(1);
    expect(result.meta.warnings).toContain('Some sources unavailable');
  });

  it('throws EventsServiceError for completely non-object response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve('this is a string, not an envelope'),
    } as Response);

    await expect(fetchIntelligenceEvents()).rejects.toThrow(EventsServiceError);
    await expect(fetchIntelligenceEvents()).rejects.toThrow('ApiEnvelope');
  });

  it('throws EventsServiceError for 404', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response);

    await expect(fetchIntelligenceEvents()).rejects.toThrow('404');
    await expect(fetchIntelligenceEvents()).rejects.toThrow('Not Found');
  });
});
