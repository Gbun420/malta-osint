import { SourceHealthRecord } from '@/intelligence/schemas/registry';

export async function fetchSourceHealth(): Promise<SourceHealthRecord[]> {
  try {
    const response = await fetch('/api/health/data-sources');
    if (!response.ok) {
      throw new Error('Failed to fetch source health data');
    }
    const data = await response.json();
    return data.sources || [];
  } catch (error) {
    console.error('Error fetching source health:', error);
    return [];
  }
}