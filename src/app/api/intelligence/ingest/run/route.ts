import { NextResponse } from 'next/server';
import { runIngestion } from '@/intelligence/ingestion/pipeline';
import { createEnvelope } from '@/intelligence/schemas/api-envelope';

export async function POST() {
  try {
    const result = await runIngestion();

    return NextResponse.json(createEnvelope(
      { ingestion: result.results, totalAccepted: result.totalAccepted },
      result.results.map(r => r.sourceId),
    ));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e), results: [], totalAccepted: 0 },
      { status: 500 },
    );
  }
}
