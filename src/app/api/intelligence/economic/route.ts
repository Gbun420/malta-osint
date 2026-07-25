import { NextResponse } from 'next/server';
import { createEnvelope } from '@/intelligence/schemas/api-envelope';

export async function GET() {
  return NextResponse.json(createEnvelope(
    { indicators: [], trade: [] },
    [],
    ['Economic adapters not yet implemented — World Bank, Eurostat, UN Comtrade pending'],
  ));
}
