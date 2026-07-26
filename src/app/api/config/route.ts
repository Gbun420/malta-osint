import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const ENV_PATH = join(process.cwd(), '.env.local');

const CHECKED_PROVIDERS = [
  'aisstream',
  'vesselapi',
  'firms',
  'gemini',
  'redis',
  'elevenlabs',
  'opensky',
  'scanner',
  'ollama',
] as const;

const PROVIDER_ENV_MAP: Record<string, string[]> = {
  aisstream: ['AIS_API_KEY'],
  vesselapi: ['VESSEL_API_KEY'],
  firms: ['FIRMS_API_KEY'],
  gemini: ['GEMINI_API_KEY_1', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY_3', 'GEMINI_API_KEY_4',
           'GEMINI_API_KEY_5', 'GEMINI_API_KEY_6', 'GEMINI_API_KEY_7', 'GEMINI_API_KEY_8'],
  redis: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
  elevenlabs: ['ELEVENLABS_API_KEY'],
  opensky: ['OPENSKY_CLIENT_ID', 'OPENSKY_CLIENT_SECRET'],
  scanner: ['SCANNER_URL', 'SCANNER_KEY'],
  ollama: ['OLLAMA_HOST', 'OLLAMA_MODEL'],
};

function checkProvider(name: string): { configured: boolean } {
  const keys = PROVIDER_ENV_MAP[name];
  if (!keys) return { configured: false };
  return { configured: keys.every(k => !!process.env[k]) };
}

function parseEnvFile(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    result[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return result;
}

function patchEnvFile(raw: string, updates: Record<string, string>): string {
  const lines = raw.split('\n');
  const patched = new Set<string>();
  const result = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eq = trimmed.indexOf('=');
    if (eq === -1) return line;
    const key = trimmed.slice(0, eq).trim();
    if (key in updates) {
      patched.add(key);
      const val = updates[key];
      if (val === '') return `# ${key}=`;
      return `${key}=${val}`;
    }
    return line;
  });
  for (const [key, val] of Object.entries(updates)) {
    if (!patched.has(key) && val !== '') {
      result.push(`${key}=${val}`);
    }
  }
  return result.join('\n');
}

export async function GET() {
  const providers: Record<string, { configured: boolean }> = {};
  for (const name of CHECKED_PROVIDERS) {
    providers[name] = checkProvider(name);
  }
  return NextResponse.json({ providers });
}

export async function PATCH(req: NextRequest) {
  const allowedFingerprint = process.env.CONFIG_FINGERPRINT;
  const clientFingerprint = req.headers.get('x-device-fingerprint');

  if (allowedFingerprint && clientFingerprint !== allowedFingerprint) {
    return NextResponse.json({ error: 'Unauthorized — fingerprint mismatch' }, { status: 401 });
  }

  if (!existsSync(ENV_PATH)) {
    return NextResponse.json({ error: '.env.local not found — use Vercel environment variables for production' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const updates: Record<string, string> = {};
    const ALLOWED_KEYS = new Set(Object.values(PROVIDER_ENV_MAP).flat());

    for (const [key, val] of Object.entries(body)) {
      if (ALLOWED_KEYS.has(key)) {
        updates[key] = String(val).replace(/[\r\n]/g, '').trim();
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid env vars provided' }, { status: 400 });
    }

    const raw = readFileSync(ENV_PATH, 'utf-8');
    const patched = patchEnvFile(raw, updates);
    writeFileSync(ENV_PATH, patched, 'utf-8');

    return NextResponse.json({ ok: true, updated: Object.keys(updates), note: 'Restart dev server to apply' });
  } catch {
    return NextResponse.json({ error: 'Failed to update .env.local' }, { status: 500 });
  }
}
