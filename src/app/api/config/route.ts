import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const ENV_PATH = join(process.cwd(), '.env.local');

const EXPOSED_KEYS = [
  'GEMINI_API_KEY_1',
  'GEMINI_API_KEY_2',
  'GEMINI_API_KEY_3',
  'GEMINI_API_KEY_4',
  'GEMINI_API_KEY_5',
  'GEMINI_API_KEY_6',
  'GEMINI_API_KEY_7',
  'GEMINI_API_KEY_8',
  'FIRMS_API_KEY',
  'AIS_API_KEY',
  'VESSEL_API_KEY',
  'OPENSKY_CLIENT_ID',
  'OPENSKY_CLIENT_SECRET',
  'SCANNER_URL',
  'SCANNER_KEY',
  'OLLAMA_HOST',
  'OLLAMA_MODEL',
];

const SECRET_KEYS = new Set([
  'GEMINI_API_KEY_1', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY_3', 'GEMINI_API_KEY_4',
  'GEMINI_API_KEY_5', 'GEMINI_API_KEY_6', 'GEMINI_API_KEY_7', 'GEMINI_API_KEY_8',
  'FIRMS_API_KEY', 'AIS_API_KEY', 'VESSEL_API_KEY', 'OPENSKY_CLIENT_SECRET',
  'SCANNER_KEY',
]);

function maskValue(key: string, value: string): string {
  if (!value) return '';
  if (SECRET_KEYS.has(key)) {
    if (value.length <= 8) return '********';
    return value.slice(0, 4) + '****' + value.slice(-4);
  }
  return value;
}

function parseEnvFile(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    result[key] = val;
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
  const values: Record<string, string> = {};
  for (const key of EXPOSED_KEYS) {
    values[key] = process.env[key] ?? '';
  }
  try {
    const raw = readFileSync(ENV_PATH, 'utf-8');
    const fileVals = parseEnvFile(raw);
    for (const key of EXPOSED_KEYS) {
      if (fileVals[key]) values[key] = fileVals[key];
    }
  } catch {

  }

  const masked: Record<string, string> = {};
  for (const key of EXPOSED_KEYS) {
    masked[key] = maskValue(key, values[key]);
  }

  const status: Record<string, boolean> = {};
  for (const key of EXPOSED_KEYS) {
    status[key] = !!values[key];
  }

  return NextResponse.json({ values: masked, keys: EXPOSED_KEYS, status });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updates: Record<string, string> = {};

    for (const key of EXPOSED_KEYS) {
      if (key in body) {
        updates[key] = String(body[key]).replace(/[\r\n]/g, '').trim();
      }
    }

    const raw = readFileSync(ENV_PATH, 'utf-8');
    const patched = patchEnvFile(raw, updates);
    writeFileSync(ENV_PATH, patched, 'utf-8');

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Could not write .env.local' }, { status: 500 });
  }
}
