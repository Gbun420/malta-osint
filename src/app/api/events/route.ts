import { NextResponse } from 'next/server';
import { fetchIntelligenceEvents } from '@/services/intelligence/eventsService';

export async function GET() {
  try {
    const events = await fetchIntelligenceEvents();
    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error in events API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}