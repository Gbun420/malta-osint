const SECRET_PATTERNS = [
  /(api[_-]?key['"]?\s*[:=]\s*)['"][^'"]+['"]/gi,
  /(secret['"]?\s*[:=]\s*)['"][^'"]+['"]/gi,
  /(token['"]?\s*[:=]\s*)['"][^'"]+['"]/gi,
  /(password['"]?\s*[:=]\s*)['"][^'"]+['"]/gi,
  /(auth['"]?\s*[:=]\s*)['"][^'"]+['"]/gi,
  /(credential['"]?\s*[:=]\s*)['"][^'"]+['"]/gi,
  /(authorization['"]?\s*[:=]\s*)['"][^'"]+['"]/gi,
  /(x-api-key['"]?\s*[:=]\s*)['"][^'"]+['"]/gi,
];

export function redactSecrets(text: string): string {
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, '$1[REDACTED]');
  }
  return result;
}

export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const sensitive = new Set([
    'authorization', 'x-api-key', 'cookie', 'set-cookie',
    'x-auth-token', 'api-key', 'api_key',
  ]);
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    result[key] = sensitive.has(key.toLowerCase()) ? '[REDACTED]' : value;
  }
  return result;
}

export function createSafeDiagnosticSnapshot(): Record<string, string> {
  const env = { ...process.env };
  const keys = Object.keys(env);
  const safe: Record<string, string> = {};
  for (const key of keys) {
    const lower = key.toLowerCase();
    if (
      lower.includes('key') || lower.includes('secret') ||
      lower.includes('token') || lower.includes('password') ||
      lower.includes('credential')
    ) {
      safe[key] = '[REDACTED]';
    } else {
      safe[key] = env[key] || '';
    }
  }
  return safe;
}
