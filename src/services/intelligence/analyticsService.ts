export interface AnalyticsData {
  overview: {
    totalEvents: number;
    eventsLast24h: number;
    eventsLast7d: number;
    eventsLast30d: number;
    criticalEvents: number;
    highConfidenceEvents: number;
    verifiedEvents: number;
    activeSources: number;
    healthySources: number;
    degradedSources: number;
  };
  trends: {
    eventsByDay: { date: string; count: number }[];
    eventsBySeverity: { severity: number; count: number }[];
    eventsByCategory: { category: string; count: number }[];
    confidenceDistribution: { range: string; count: number }[];
    verificationStatus: { status: string; count: number }[];
    sourceHealth: { source: string; healthy: boolean; total: number; avgLatency: number }[];
  };
  insights: {
    mostActiveSource: string;
    mostCommonCategory: string;
    avgConfidence: number;
    peakActivityHour: number;
    criticalEventRate: number;
  };
}

export async function fetchAnalytics(): Promise<AnalyticsData> {
  try {
    const response = await fetch('/api/analytics');
    if (!response.ok) {
      throw new Error('Failed to fetch analytics');
    }
    return response.json();
  } catch (error) {
    console.error('Failed to load analytics:', error);
    // Return empty data as fallback
    return {
      overview: {
        totalEvents: 0,
        eventsLast24h: 0,
        eventsLast7d: 0,
        eventsLast30d: 0,
        criticalEvents: 0,
        highConfidenceEvents: 0,
        verifiedEvents: 0,
        activeSources: 0,
        healthySources: 0,
        degradedSources: 0
      },
      trends: {
        eventsByDay: [],
        eventsBySeverity: [],
        eventsByCategory: [],
        confidenceDistribution: [],
        verificationStatus: [],
        sourceHealth: []
      },
      insights: {
        mostActiveSource: 'N/A',
        mostCommonCategory: 'N/A',
        avgConfidence: 0,
        peakActivityHour: 0,
        criticalEventRate: 0
      }
    };
  }
}