import { NextResponse } from 'next/server';
import { globalRepository } from '@/intelligence/repository/memory';
import { createEnvelope } from '@/intelligence/schemas/api-envelope';

export async function GET() {
  return NextResponse.json(createEnvelope(
    [],
    ['intelligence-repository'],
    ['Country profiles not yet populated — run /api/intelligence/ingest/run'],
  ));
}
