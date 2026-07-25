import { NextResponse } from 'next/server';
import { globalRepository } from '@/intelligence/repository/memory';
import { SOURCE_REGISTRY } from '@/intelligence/schemas/source-registry';
import { createEnvelope } from '@/intelligence/schemas/api-envelope';
import { redactSecrets } from '@/lib/security/redact';

export async function GET() {
  const records = await globalRepository.getSourceHealth();
  const registry = SOURCE_REGISTRY.map(def => ({
    id: def.id,
    name: def.name,
    publisher: def.publisher,
    category: def.category,
    tier: def.costProfile.tier,
    requiredKeys: def.requiredEnvironmentVariables.map(k => k.toLowerCase().includes('key') ? `${k}=${process.env[k] ? '[SET]' : '[NOT SET]'}` : k),
    pollingIntervalSeconds: def.pollingIntervalSeconds,
  }));

  const healthMap = new Map(records.map(r => [r.sourceId, r]));
  const merged = registry.map(r => ({
    ...r,
    health: healthMap.get(r.id) || { state: 'unconfigured' as const },
  }));

  return NextResponse.json(createEnvelope(
    { sources: merged },
    ['source-registry'],
  ));
}
