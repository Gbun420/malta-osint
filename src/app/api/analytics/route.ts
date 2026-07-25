import { NextResponse } from 'next/server';
import { fetchIntelligenceEvents } from '@/services/intelligence/eventsService';
import { fetchSourceHealth } from '@/services/intelligence/sourcesService';

export async function GET() {
  try {
    const [events, sources] = await Promise.all([
      fetchIntelligenceEvents(),
      fetchSourceHealth()
    ]);

    const now = new Date();
    const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const cutoff30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const cutoff24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const eventsLast24h = events.filter(e => e.eventTime && new Date(e.eventTime) >= cutoff24h).length;
    const eventsLast7d = events.filter(e => e.eventTime && new Date(e.eventTime) >= cutoff7d).length;
    const eventsLast30d = events.filter(e => e.eventTime && new Date(e.eventTime) >= cutoff30d).length;
    const criticalEvents = events.filter(e => e.severity >= 4).length;
    const highConfidenceEvents = events.filter(e => (e.confidenceScore || 0) >= 80).length;
    const verifiedEvents = events.filter(e => e.verificationState === 'verified' || e.verificationState === 'multi-source').length;

    const activeSources = sources.length;
    const healthySources = sources.filter(s => s.state === 'healthy').length;
    const degradedSources = sources.filter(s => s.state === 'degraded' || s.state === 'unhealthy').length;

    // Trends
    const eventsByDayMap = new Map<string, number>();
    events.forEach(e => {
      if (e.eventTime) {
        const day = new Date(e.eventTime).toISOString().split('T')[0];
        eventsByDayMap.set(day, (eventsByDayMap.get(day) || 0) + 1);
      }
    });
    const eventsByDay = Array.from(eventsByDayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-30)
      .map(([date, count]) => ({ date, count }));

    const severityCounts = new Map<number, number>();
    events.forEach(e => {
      if (e.severity) {
        severityCounts.set(e.severity, (severityCounts.get(e.severity) || 0) + 1);
      }
    });
    const eventsBySeverity = Array.from(severityCounts.entries())
      .sort(([a], [b]) => a - b)
      .map(([severity, count]) => ({ severity, count }));

    const categoryCounts = new Map<string, number>();
    events.forEach(e => {
      e.categories?.forEach(cat => {
        categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
      });
    });
    const eventsByCategory = Array.from(categoryCounts.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([category, count]) => ({ category, count }));

    const confidenceRanges = ['0-20', '21-40', '41-60', '61-80', '81-100'];
    const confidenceDistribution = confidenceRanges.map(range => {
      const [min, max] = range.split('-').map(Number);
      const count = events.filter(e => {
        const score = e.confidenceScore || 0;
        return score >= min && score <= max;
      }).length;
      return { range, count };
    });

    const verificationCounts = new Map<string, number>();
    events.forEach(e => {
      const status = e.verificationState || 'unverified';
      verificationCounts.set(status, (verificationCounts.get(status) || 0) + 1);
    });
    const verificationStatus = Array.from(verificationCounts.entries())
      .map(([status, count]) => ({ status, count }));

    const sourceHealthDetails = sources.map(s => ({
      source: s.sourceId,
      healthy: s.state === 'healthy',
      total: 1,
      avgLatency: s.latencyMs || 0
    }));

    const sourceEventCounts = new Map<string, number>();
    events.forEach(e => {
      if (e.sourceId) {
        sourceEventCounts.set(e.sourceId, (sourceEventCounts.get(e.sourceId) || 0) + 1);
      }
    });
    const mostActiveSource = Array.from(sourceEventCounts.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    const categoryTotalCounts = new Map<string, number>();
    events.forEach(e => {
      e.categories?.forEach(cat => {
        categoryTotalCounts.set(cat, (categoryTotalCounts.get(cat) || 0) + 1);
      });
    });
    const mostCommonCategory = Array.from(categoryTotalCounts.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';

    const avgConfidence = events.length > 0
      ? events.reduce((sum, e) => sum + (e.confidenceScore || 0), 0) / events.length
      : 0;

    const hourCounts = new Map<number, number>();
    events.forEach(e => {
      if (e.eventTime) {
        const hour = new Date(e.eventTime).getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }
    });
    const peakActivityHour = Array.from(hourCounts.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 0;

    const criticalEventRate = eventsLast7d > 0 
      ? (events.filter(e => e.severity >= 4 && e.eventTime && new Date(e.eventTime) >= cutoff7d).length / eventsLast7d) * 100 
      : 0;

    return NextResponse.json({
      overview: {
        totalEvents: events.length,
        eventsLast24h,
        eventsLast7d,
        eventsLast30d,
        criticalEvents,
        highConfidenceEvents,
        verifiedEvents,
        activeSources,
        healthySources,
        degradedSources
      },
      trends: {
        eventsByDay,
        eventsBySeverity,
        eventsByCategory,
        confidenceDistribution,
        verificationStatus,
        sourceHealth: sourceHealthDetails
      },
      insights: {
        mostActiveSource,
        mostCommonCategory,
        avgConfidence: Math.round(avgConfidence),
        peakActivityHour,
        criticalEventRate: Math.round(criticalEventRate * 10) / 10
      }
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to compute analytics' },
      { status: 500 }
    );
  }
}