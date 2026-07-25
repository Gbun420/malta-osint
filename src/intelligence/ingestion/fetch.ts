import { isUrlAllowed } from '@/lib/security/url-allowlist';

export interface FetchOptions {
  url: string;
  timeoutMs?: number;
  maxRetries?: number;
  headers?: Record<string, string>;
  expectedContentType?: string[];
}

export interface FetchResult {
  ok: boolean;
  status: number;
  body: string;
  contentType: string;
  latencyMs: number;
  error: string | null;
}

export async function safeFetch(options: FetchOptions): Promise<FetchResult> {
  const start = Date.now();
  const timeoutMs = options.timeoutMs ?? 10000;
  const maxRetries = options.maxRetries ?? 1;

  if (!isUrlAllowed(options.url)) {
    return { ok: false, status: 0, body: '', contentType: '', latencyMs: Date.now() - start, error: `URL not in allowlist: ${options.url.slice(0, 80)}` };
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(options.url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          'User-Agent': 'Third-Eye-Intelligence/1.0',
          ...options.headers,
        },
      });

      const contentType = response.headers.get('content-type') || '';
      const body = await response.text();
      const latency = Date.now() - start;

      if (options.expectedContentType && options.expectedContentType.length > 0) {
        const matched = options.expectedContentType.some(t => contentType.includes(t));
        if (!matched) {
          if (attempt < maxRetries) continue;
          return { ok: false, status: response.status, body, contentType, latencyMs: latency, error: `Unexpected content type: ${contentType}` };
        }
      }

      return {
        ok: response.ok,
        status: response.status,
        body,
        contentType,
        latencyMs: latency,
        error: response.ok ? null : `HTTP ${response.status}`,
      };
    } catch (e) {
      const isLastAttempt = attempt >= maxRetries;
      if (isLastAttempt) {
        return {
          ok: false, status: 0, body: '', contentType: '',
          latencyMs: Date.now() - start,
          error: e instanceof Error ? e.message : String(e),
        };
      }
    }
  }

  return { ok: false, status: 0, body: '', contentType: '', latencyMs: Date.now() - start, error: 'Max retries exceeded' };
}
