import { NextRequest, NextResponse } from 'next/server';
import { runIngestion } from '@/intelligence/ingestion/pipeline';
import { createEnvelope } from '@/intelligence/schemas/api-envelope';

export async function POST(request: NextRequest) {
  const validKey = process.env.SDK_INGEST_KEY || 'thirdeye-dev-key';
  const authKey = request.headers.get('x-sdk-key') || request.headers.get('authorization')?.replace('Bearer ', '');

  if (!authKey || authKey !== validKey) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
