import { NextRequest, NextResponse } from 'next/server';
import { globalRepository } from '@/intelligence/repository/memory';
import { createEnvelope } from '@/intelligence/schemas/api-envelope';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const event = await globalRepository.getEvent(id);

  if (!event) {
    return NextResponse.json(
      { error: 'Event not found' },
      { status: 404 },
    );
  }

  return NextResponse.json(createEnvelope(event, ['intelligence-repository']));
}
