import { NextResponse } from 'next/server';
import { globalRepository } from '@/intelligence/repository/memory';
import { createEnvelope } from '@/intelligence/schemas/api-envelope';

export async function GET() {
  const events = await globalRepository.getEvents({
    categories: ['eu-policy', 'multilateral', 'sanctions'],
    limit: 50,
  });

  return NextResponse.json(createEnvelope(
    { events: events.items, total: events.total },
    ['intelligence-repository'],
  ));
}
