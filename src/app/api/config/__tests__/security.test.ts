import { describe, it, expect } from 'vitest';

const SECRET_PATTERNS = [
  /AIza/i,
  /sk-[a-zA-Z0-9]/i,
  /[Aa]pi[_-]?[Kk]ey/i,
  /[Bb]earer/i,
  /[Ss]ecret/,
  /^db72/,
  /^sk_/,
];

const MASKED_PATTERNS = [
  /^\w{4}\*{4}\w{4}$/,
  /^\*{8}$/,
  /^\w{2,}.*\*{4}.*\w{2,}$/,
];

const SECRET_KEY_NAMES = [
  'AIS_API_KEY',
  'AISSTREAM_API_KEY',
  'VESSEL_API_KEY',
  'FIRMS_API_KEY',
  'GEMINI_API_KEY',
  'OPENSKY_CLIENT_SECRET',
  'SCANNER_KEY',
  'ELEVENLABS_API_KEY',
  'UPSTASH_REDIS_REST_TOKEN',
  'SDK_INGEST_KEY',
];

describe('GET /api/config security', () => {
  it('returns only provider status, no secret values', async () => {
    const { GET } = await import('../route');
    const response = await GET();
    const body = await response.json();

    expect(body).not.toHaveProperty('values');
    expect(body).not.toHaveProperty('keys');
    expect(body).not.toHaveProperty('masked');
    expect(body).toHaveProperty('providers');

    for (const provider of Object.values(body.providers) as any[]) {
      expect(provider).toHaveProperty('configured');
      expect(Object.keys(provider)).toEqual(['configured']);
    }
  });

  it('does not contain any key names in the response', async () => {
    const { GET } = await import('../route');
    const response = await GET();
    const body = JSON.stringify(await response.json());

    for (const keyName of SECRET_KEY_NAMES) {
      expect(body).not.toContain(keyName);
    }
  });

  it('does not return masked credential values', async () => {
    const { GET } = await import('../route');
    const response = await GET();
    const body = JSON.stringify(await response.json());

    for (const pattern of MASKED_PATTERNS) {
      expect(body).not.toMatch(pattern);
    }
  });

  it('does not contain any value resembling a secret', async () => {
    const { GET } = await import('../route');
    const response = await GET();
    const body = JSON.stringify(await response.json());

    for (const pattern of SECRET_PATTERNS) {
      expect(body).not.toMatch(pattern);
    }
  });

  it('providers object has correct shape', async () => {
    const { GET } = await import('../route');
    const response = await GET();
    const { providers } = await response.json();

    const expectedProviders = [
      'aisstream', 'vesselapi', 'firms', 'gemini',
      'redis', 'elevenlabs', 'opensky', 'scanner', 'ollama',
    ];

    for (const name of expectedProviders) {
      expect(providers).toHaveProperty(name);
      expect(providers[name]).toHaveProperty('configured');
      expect(typeof providers[name].configured).toBe('boolean');
    }
  });
});

describe('POST /api/config does not exist', () => {
  it('POST handler is not exported', async () => {
    const mod = await import('../route');
    expect((mod as any).POST).toBeUndefined();
  });
});

describe('PATCH /api/config returns appropriate errors', () => {
  it('rejects unauthorised requests when CONFIG_FINGERPRINT is set', async () => {
    const prev = process.env.CONFIG_FINGERPRINT;
    process.env.CONFIG_FINGERPRINT = 'test-fingerprint';

    const { PATCH } = await import('../route');

    const req = new Request('http://localhost/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-device-fingerprint': 'wrong' },
      body: JSON.stringify({ AIS_API_KEY: 'test' }),
    });
    const response = await PATCH(req as any);
    expect(response.status).toBe(401);

    process.env.CONFIG_FINGERPRINT = prev;
  });

  it('accepts authorised requests when CONFIG_FINGERPRINT matches', async () => {
    const prev = process.env.CONFIG_FINGERPRINT;
    process.env.CONFIG_FINGERPRINT = 'test-fingerprint';

    const { PATCH } = await import('../route');

    const req = new Request('http://localhost/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-device-fingerprint': 'test-fingerprint' },
      body: JSON.stringify({ AIS_API_KEY: 'test' }),
    });
    const response = await PATCH(req as any);
    expect([200, 400]).toContain(response.status);

    process.env.CONFIG_FINGERPRINT = prev;
  });
});
