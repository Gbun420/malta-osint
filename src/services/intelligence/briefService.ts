import type { MinisterBriefItem } from '@/intelligence/types';

export interface BriefResult {
  items: MinisterBriefItem[];
  total: number;
  sources: string[];
  warnings: string[];
  generatedAt: string;
}

export async function fetchIntelligenceBrief(view: string): Promise<BriefResult> {
  const params = new URLSearchParams();
  if (view === 'evening') params.set('since', 'today');
  if (view === 'since') params.set('since', 'yesterday');
  if (view === 'critical') {
    params.set('minRelevance', '80');
    params.set('minConfidence', '70');
  }

  const query = params.toString();
  const url = `/api/intelligence/brief${query ? `?${query}` : ''}`;

  let response: Response;
  try {
    response = await fetch(url, { cache: 'no-store' });
  } catch {
    throw new Error('Network error: unable to reach the intelligence service');
  }

  if (!response.ok) {
    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('Response was not valid JSON');
  }

  if (typeof body !== 'object' || body === null) {
    throw new Error('Invalid response from intelligence service');
  }

  const envelope = body as Record<string, unknown>;
  const data = (envelope.data ?? envelope) as Record<string, unknown>;
  const brief = Array.isArray(data.brief) ? (data.brief as MinisterBriefItem[]) : [];
  const total = typeof data.total === 'number' ? data.total : brief.length;
  const meta = envelope.meta as { sources?: string[]; warnings?: string[] } | undefined;
  const generatedAt = typeof envelope.generatedAt === 'string' ? envelope.generatedAt : new Date().toISOString();

  return {
    items: brief,
    total,
    sources: Array.isArray(meta?.sources) ? meta.sources : [],
    warnings: Array.isArray(meta?.warnings) ? meta.warnings : [],
    generatedAt,
  };
}
