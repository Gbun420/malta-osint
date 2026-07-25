import { NextResponse } from 'next/server';
import { fetchSourceHealth } from '@/services/intelligence/sourcesService';

export async function GET() {
  try {
    const sources = await fetchSourceHealth();
    return NextResponse.json({ sources });
  } catch (error) {
    console.error('Error in health data sources API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch source health data' },
      { status: 500 }
    );
  }
}