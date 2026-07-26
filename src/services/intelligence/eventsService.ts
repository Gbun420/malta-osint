import { ApiEnvelope } from '@/intelligence/schemas/api-envelope';
import { IntelligenceEvent } from '@/intelligence/types';

export interface EventsResult {
  events: IntelligenceEvent[];
  total: number;
  offset: number;
  limit: number;
  meta: {
    sources: string[];
    recordCount: number;
    warnings: string[];
    cache: { state: string; ageSeconds: number };
  };
}

export class EventsServiceError extends Error {
  constructor(
    message: string,
    public readonly code: 'HTTP_FAILURE' | 'API_ERROR' | 'MALFORMED_RESPONSE',
    public readonly status?: number,
    public readonly envelopeStatus?: string,
  ) {
    super(message);
    this.name = 'EventsServiceError';
  }
}

interface EventsData {
  events: unknown;
  total: unknown;
  offset: unknown;
  limit: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

export async function fetchIntelligenceEvents(
  page: number = 1,
  limit: number = 50,
): Promise<EventsResult> {
  const offset = Math.max(0, (page - 1) * limit);

  let response: Response;
  try {
    response = await fetch(`/api/intelligence/events?limit=${limit}&offset=${offset}`);
  } catch {
    throw new EventsServiceError(
      'Network error: unable to reach the intelligence service',
      'HTTP_FAILURE',
    );
  }

  if (!response.ok) {
    throw new EventsServiceError(
      `Server returned ${response.status}: ${response.statusText}`,
      'HTTP_FAILURE',
      response.status,
    );
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new EventsServiceError(
      'Response was not valid JSON',
      'MALFORMED_RESPONSE',
    );
  }

  if (!isRecord(body) || !isString((body as Record<string, unknown>).apiVersion) || !isString((body as Record<string, unknown>).status) || !isRecord((body as Record<string, unknown>).meta)) {
    throw new EventsServiceError(
      'Response does not match ApiEnvelope shape: missing apiVersion, status, or meta',
      'MALFORMED_RESPONSE',
    );
  }

  const envelope = body as unknown as ApiEnvelope<EventsData>;

  if (envelope.status === 'error') {
    const warning = Array.isArray(envelope.meta?.warnings) && envelope.meta.warnings.length > 0
      ? envelope.meta.warnings[0]
      : 'Intelligence service returned an error status';
    throw new EventsServiceError(warning, 'API_ERROR', undefined, 'error');
  }

  if (!isRecord(envelope.data)) {
    throw new EventsServiceError(
      'Response data is missing or null for non-error status',
      'MALFORMED_RESPONSE',
    );
  }

  if (!Array.isArray(envelope.data.events)) {
    throw new EventsServiceError(
      'Response is missing events array in data',
      'MALFORMED_RESPONSE',
    );
  }

  const events = envelope.data.events as IntelligenceEvent[];
  const total = isNumber(envelope.data.total) ? envelope.data.total : events.length;
  const resultOffset = isNumber(envelope.data.offset) ? envelope.data.offset : offset;
  const resultLimit = isNumber(envelope.data.limit) ? envelope.data.limit : limit;

  return {
    events,
    total,
    offset: resultOffset,
    limit: resultLimit,
    meta: {
      sources: Array.isArray(envelope.meta?.sources) ? envelope.meta.sources : [],
      recordCount: isNumber(envelope.meta?.recordCount) ? envelope.meta.recordCount : events.length,
      warnings: Array.isArray(envelope.meta?.warnings) ? envelope.meta.warnings : [],
      cache: isRecord(envelope.meta?.cache)
        ? envelope.meta.cache as { state: string; ageSeconds: number }
        : { state: 'miss', ageSeconds: 0 },
    },
  };
}
