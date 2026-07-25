import { NextRequest, NextResponse } from 'next/server';
import { globalRepository } from '@/intelligence/repository/memory';
import { createEnvelope } from '@/intelligence/schemas/api-envelope';
import { validatePagination } from '@/lib/security/sanitize';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const { limit, offset } = validatePagination(
    Number(searchParams.get('limit')) || undefined,
    Number(searchParams.get('offset')) || undefined,
  );

  const query = {
    limit,
    offset,
    countries: searchParams.get('countries')?.split(',').filter(Boolean),
    categories: searchParams.get('categories')?.split(',').filter(Boolean),
    minSeverity: searchParams.get('minSeverity') ? Number(searchParams.get('minSeverity')) : undefined,
    minConfidence: searchParams.get('minConfidence') ? Number(searchParams.get('minConfidence')) : undefined,
    minMaltaRelevance: searchParams.get('minMaltaRelevance') ? Number(searchParams.get('minMaltaRelevance')) : undefined,
    status: searchParams.get('status') || undefined,
    timeFrom: searchParams.get('timeFrom') || undefined,
    timeTo: searchParams.get('timeTo') || undefined,
    locationOnly: searchParams.get('locationOnly') === 'true' || undefined,
    sanctionsRelated: searchParams.get('sanctionsRelated') === 'true' || undefined,
    maritimeRelated: searchParams.get('maritimeRelated') === 'true' || undefined,
    consularRelevance: searchParams.get('consularRelevance') === 'true' || undefined,
  };

  const result = await globalRepository.getEvents(query);

  return NextResponse.json(createEnvelope(
    { events: result.items, total: result.total, offset: result.offset, limit: result.limit },
    ['intelligence-repository'],
  ));
}
