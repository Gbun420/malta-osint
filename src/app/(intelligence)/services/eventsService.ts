import { IntelligenceEvent } from '@/intelligence/types';

export async function fetchIntelligenceEvents(): Promise<IntelligenceEvent[]> {
  try {
    const response = await fetch('/api/events');
    if (!response.ok) {
      throw new Error('Failed to fetch events');
    }
    const data = await response.json();
    return data.events || [];
  } catch (error) {
    console.error('Error fetching events:', error);
    return [];
  }
}