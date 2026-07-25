import { NextRequest, NextResponse } from 'next/server';
import { globalRepository } from '@/intelligence/repository/memory';
import { createEnvelope } from '@/intelligence/schemas/api-envelope';
import { generateBriefing } from '@/intelligence/briefing';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const allEvents = await globalRepository.getEvents({ limit: 500 });

  const brief = generateBriefing(allEvents.items, {
    maxItems: Number(searchParams.get('maxItems')) || 20,
    minRelevance: Number(searchParams.get('minRelevance')) || 0,
    minConfidence: Number(searchParams.get('minConfidence')) || 0,
    categories: searchParams.get('categories')?.split(',').filter(Boolean),
    since: searchParams.get('since') || undefined,
  });

  return NextResponse.json(createEnvelope(
    { brief, total: brief.length },
    ['intelligence-briefing'],
  ));
}
