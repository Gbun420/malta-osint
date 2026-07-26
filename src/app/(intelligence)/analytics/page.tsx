'use client';

import { useState, useEffect, useMemo } from 'react';
import { CommandHeader } from '@/components/intelligence/CommandHeader';
import { StatusBadge } from '@/components/intelligence/StatusBadge';
import { ConfidenceBadge } from '@/components/intelligence/ConfidenceBadge';
import { VerificationBadge } from '@/components/intelligence/VerificationBadge';
import { IntelligenceEvent } from '@/intelligence/types';
import { fetchIntelligenceEvents } from '@/services/intelligence/eventsService';
import { fetchSourceHealth } from '@/services/intelligence/sourcesService';
import { SourceHealthRecord } from '@/intelligence/schemas/registry';
import { fetchAnalytics } from '@/services/intelligence/analyticsService';

interface AnalyticsData {
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

export function AnalyticsDashboard() {
  const [events, setEvents] = useState<IntelligenceEvent[]>([]);
  const [sourceHealth, setSourceHealth] = useState<SourceHealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | '90d'>('7d');
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  // Compute analytics from events and source health
  const localAnalytics = useMemo((): AnalyticsData => {
    const now = new Date();
    const filteredEvents = events; // For now use all events
    
    const eventsLast24h = events.filter(e => e.eventTime && new Date(e.eventTime) >= new Date(now.getTime() - 24 * 60 * 60 * 1000)).length;
    const eventsLast7d = events.filter(e => e.eventTime && new Date(e.eventTime) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)).length;
    const eventsLast30d = events.filter(e => e.eventTime && new Date(e.eventTime) >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)).length;
    const criticalEvents = filteredEvents.filter(e => e.severity >= 4).length;
    const highConfidenceEvents = filteredEvents.filter(e => (e.confidenceScore || 0) >= 80).length;
    const verifiedEvents = filteredEvents.filter(e => e.verificationState === 'multi-source' || e.verificationState === 'official-confirmation').length;

    const activeSources = sourceHealth.length;
    const healthySources = sourceHealth.filter(s => s.state === 'healthy').length;
    const degradedSources = sourceHealth.filter(s => s.state === 'degraded' || s.state === 'error' || s.state === 'stale').length;

    // Trends
    const eventsByDayMap = new Map<string, number>();
    filteredEvents.forEach(e => {
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
    filteredEvents.forEach(e => {
      if (e.severity) {
        severityCounts.set(e.severity, (severityCounts.get(e.severity) || 0) + 1);
      }
    });
    const eventsBySeverity = Array.from(severityCounts.entries())
      .sort(([a], [b]) => a - b)
      .map(([severity, count]) => ({ severity, count }));

    const categoryCounts = new Map<string, number>();
    filteredEvents.forEach(e => {
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
      const count = filteredEvents.filter(e => {
        const score = e.confidenceScore || 0;
        return score >= min && score <= max;
      }).length;
      return { range, count };
    });

    const verificationCounts = new Map<string, number>();
    filteredEvents.forEach(e => {
      const status = e.verificationState || 'unverified';
      verificationCounts.set(status, (verificationCounts.get(status) || 0) + 1);
    });
    const verificationStatus = Array.from(verificationCounts.entries())
      .map(([status, count]) => ({ status, count }));

    const sourceHealthDetails = sourceHealth.map(s => ({
      source: s.sourceId,
      healthy: s.state === 'healthy',
      total: 1,
      avgLatency: s.latencyMs || 0
    }));

    const sourceEventCounts = new Map<string, number>();
    filteredEvents.forEach(e => {
      const sourceName = e.provenance?.sourceName;
      if (sourceName) {
        sourceEventCounts.set(sourceName, (sourceEventCounts.get(sourceName) || 0) + 1);
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

    const avgConfidence = filteredEvents.length > 0
      ? filteredEvents.reduce((sum, e) => sum + (e.confidenceScore || 0), 0) / filteredEvents.length
      : 0;

    const hourCounts = new Map<number, number>();
    filteredEvents.forEach(e => {
      if (e.eventTime) {
        const hour = new Date(e.eventTime).getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      }
    });
    const peakActivityHour = Array.from(hourCounts.entries())
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 0;

    const criticalEventRate = eventsLast7d > 0 
      ? (events.filter(e => e.severity >= 4 && e.eventTime && new Date(e.eventTime) >= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)).length / eventsLast7d) * 100 
      : 0;

    return {
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
    };
  }, [events, sourceHealth]);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [eventsData, sourcesData, analyticsData] = await Promise.all([
          fetchIntelligenceEvents(),
          fetchSourceHealth(),
          fetchAnalytics()
        ]);
        setEvents(eventsData);
        setSourceHealth(sourcesData);
        setAnalytics(analyticsData);
      } catch (error) {
        console.error('Failed to load analytics data:', error);
        setAnalyticsError('Failed to load analytics from API. Using local computation.');
        // Fallback: compute locally
        const [eventsData, sourcesData] = await Promise.all([
          fetchIntelligenceEvents(),
          fetchSourceHealth()
        ]);
        setEvents(eventsData);
        setSourceHealth(sourcesData);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const data = analytics || localAnalytics;

  if (loading) {
    return (
      <div className="space-y-6">
        <CommandHeader sidebarOpen={false} onToggleSidebar={() => {}} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="p-6 bg-white/5 rounded-xl border border-white/10 animate-pulse">
              <div className="h-8 bg-white/10 rounded w-1/2 mb-4"></div>
              <div className="h-12 bg-white/10 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const { overview, trends, insights } = data;

  return (
    <div className="space-y-6">
      <CommandHeader sidebarOpen={false} onToggleSidebar={() => {}} />
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
          <p className="text-white/60 text-sm mt-1">Intelligence insights and trend analysis</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {analyticsError && (
            <span className="text-amber-400 text-sm mr-4">⚠️ {analyticsError}</span>
          )}
          <div className="flex gap-2">
            {['24h', '7d', '30d', '90d'].map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeRange === range
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-white/5 text-white/70 hover:bg-white/10'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Overview Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard 
          title="Total Events" 
          value={overview.totalEvents.toLocaleString()} 
          trend="+12% vs last period"
          trendPositive={true}
          icon="📊"
        />
        <StatCard 
          title="Last 24h" 
          value={overview.eventsLast24h.toLocaleString()} 
          trend={`${overview.eventsLast24h > 0 ? '+' : ''}${overview.eventsLast24h - Math.floor(overview.eventsLast7d/7)} vs avg`}
          trendPositive={overview.eventsLast24h >= Math.floor(overview.eventsLast7d/7)}
          icon="🕐"
        />
        <StatCard 
          title="Critical Events" 
          value={overview.criticalEvents.toLocaleString()} 
          trend={`${overview.criticalEvents > 0 ? '⚠️' : '✅'} Active alerts`}
          trendPositive={overview.criticalEvents === 0}
          icon="🚨"
        />
        <StatCard 
          title="High Confidence" 
          value={`${overview.eventsLast7d > 0 ? Math.round((overview.highConfidenceEvents / overview.eventsLast7d) * 100) : 0}%`} 
          trend={`${overview.highConfidenceEvents} of ${overview.eventsLast7d} events`}
          trendPositive={true}
          icon="✅"
        />
        <StatCard 
          title="Verified Events" 
          value={overview.verifiedEvents.toLocaleString()} 
          trend={`${overview.eventsLast7d > 0 ? Math.round((overview.verifiedEvents / overview.eventsLast7d) * 100) : 0}% verified`}
          trendPositive={true}
          icon="🔍"
        />
        <StatCard 
          title="Active Sources" 
          value={overview.activeSources} 
          trend={`${overview.healthySources} healthy • ${overview.degradedSources} degraded`}
          trendPositive={overview.degradedSources === 0}
          icon="📡"
        />
        <StatCard 
          title="Source Health" 
          value={`${overview.activeSources > 0 ? Math.round((overview.healthySources / overview.activeSources) * 100) : 0}%`} 
          trend={`${overview.healthySources}/${overview.activeSources} operational`}
          trendPositive={overview.degradedSources === 0}
          icon="💚"
        />
        <StatCard 
          title="Avg Confidence" 
          value={`${insights.avgConfidence}%`} 
          trend={`Peak hour: ${insights.peakActivityHour}:00`}
          trendPositive={insights.avgConfidence >= 70}
          icon="📈"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Events Timeline" icon="📈">
          <SimpleChart 
            data={trends.eventsByDay.slice(-30)} 
            xKey="date" 
            yKey="count"
            color="blue"
          />
        </ChartCard>
        
        <ChartCard title="Events by Severity" icon="⚠️">
          <BarChart 
            data={trends.eventsBySeverity} 
            xKey="severity" 
            yKey="count"
            labelFormatter={(d) => `Level ${d.severity}`}
            colors={['#22c55e', '#eab308', '#f97316', '#ef4444', '#7f1d1d']}
          />
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Top Event Categories" icon="🏷️">
          <HorizontalBarChart 
            data={trends.eventsByCategory} 
            xKey="category" 
            yKey="count"
            color="purple"
          />
        </ChartCard>
        
        <ChartCard title="Confidence Distribution" icon="🎯">
          <BarChart 
            data={trends.confidenceDistribution} 
            xKey="range" 
            yKey="count"
            color="green"
          />
        </ChartCard>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard title="Verification Status" icon="🔍">
          <DonutChart 
            data={trends.verificationStatus} 
            labelKey="status" 
            valueKey="count"
          />
        </ChartCard>
        
        <ChartCard title="Source Health Status" icon="📡">
          <SourceHealthChart 
            data={trends.sourceHealth} 
          />
        </ChartCard>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <InsightCard 
          title="Most Active Source" 
          value={insights.mostActiveSource}
          description="Highest event volume"
          icon="📡"
        />
        <InsightCard 
          title="Top Category" 
          value={insights.mostCommonCategory}
          description="Most frequent event type"
          icon="🏷️"
        />
        <InsightCard 
          title="Average Confidence" 
          value={`${insights.avgConfidence}%`}
          description="Overall reliability score"
          icon="🎯"
        />
        <InsightCard 
          title="Peak Activity" 
          value={`${insights.peakActivityHour}:00`}
          description="Busiest hour (UTC)"
          icon="⏰"
        />
        <InsightCard 
          title="Critical Rate" 
          value={`${insights.criticalEventRate}%`}
          description="Critical events / total (7d)"
          icon="🚨"
          warning={insights.criticalEventRate > 10}
        />
      </div>
    </div>
  );
}

// Helper Components
function StatCard({ title, value, trend, trendPositive, icon }: {
  title: string;
  value: string;
  trend: string;
  trendPositive: boolean;
  icon: string;
}) {
  return (
    <div className="p-5 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/60 text-sm font-medium">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          <p className={`text-sm mt-2 ${trendPositive ? 'text-green-400' : 'text-red-400'}`}>
            {trend}
          </p>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </div>
  );
}

function ChartCard({ title, icon, children }: { 
  title: string; 
  icon: string; 
  children: React.ReactNode 
}) {
  return (
    <div className="p-5 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 h-full">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{icon}</span>
        <h3 className="text-lg font-bold text-white">{title}</h3>
      </div>
      <div className="h-64">{children}</div>
    </div>
  );
}

function SimpleChart({ data, xKey, yKey, color }: { 
  data: any[]; 
  xKey: string; 
  yKey: string; 
  color: string;
}) {
  if (!data.length) return <div className="h-full flex items-center justify-center text-white/40">No data</div>;
  
  const maxValue = Math.max(...data.map(d => d[yKey]));
  const minValue = Math.min(...data.map(d => d[yKey]));
  const range = maxValue - minValue || 1;
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500'
  };
  const barColor = colorMap[color] || 'bg-blue-500';
  
  return (
    <div className="h-full flex items-end gap-1 px-2">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center min-w-0">
          <div 
            className={`${barColor} rounded-t transition-all hover:opacity-80`}
            style={{ 
              height: `${Math.max((d[yKey] / maxValue) * 100, 4)}%`,
              minHeight: '4px'
            }}
            title={`${d[xKey]}: ${d[yKey]}`}
          />
          <span className="text-xs text-white/40 mt-1 transform -rotate-45 origin-top whitespace-nowrap" style={{width: '60px'}}>
            {d[xKey].length > 10 ? d[xKey].slice(5) : d[xKey]}
          </span>
        </div>
      ))}
    </div>
  );
}

function BarChart({ data, xKey, yKey, labelFormatter, color, colors }: { 
  data: any[]; 
  xKey: string; 
  yKey: string; 
  labelFormatter?: (d: any) => string;
  color?: string;
  colors?: string[];
}) {
  if (!data.length) return <div className="h-full flex items-center justify-center text-white/40">No data</div>;
  
  const maxValue = Math.max(...data.map(d => d[yKey]));
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500'
  };
  
  return (
    <div className="h-full flex items-end gap-2 px-2 pb-8">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center min-w-0">
          <div 
            className={`${colors ? colors[i % colors.length] : (colorMap[color || 'blue'])} rounded-t transition-all hover:opacity-80`}
            style={{ 
              height: `${Math.max((d[yKey] / maxValue) * 100, 4)}%`,
              minHeight: '4px'
            }}
            title={`${labelFormatter ? labelFormatter(d) : d[xKey]}: ${d[yKey]}`}
          />
          <span className="text-xs text-white/40 mt-1 whitespace-nowrap">
            {labelFormatter ? labelFormatter(d) : d[xKey]}
          </span>
          <span className="text-xs text-white/70 font-bold">{d[yKey]}</span>
        </div>
      ))}
    </div>
  );
}

function HorizontalBarChart({ data, xKey, yKey, color }: { data: any[]; xKey: string; yKey: string; color?: string }) {
  if (!data.length) return <div className="h-full flex items-center justify-center text-white/40">No data</div>;
  
  const maxValue = Math.max(...data.map(d => d[yKey]));
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    red: 'bg-red-500'
  };
  const barColor = colorMap[color || 'purple'] || 'bg-purple-500';
  
  return (
    <div className="h-full flex flex-col gap-2 py-2">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="text-xs text-white/70 w-28 text-right truncate pr-2">
            {d[xKey].length > 18 ? d[xKey].slice(0, 15) + '...' : d[xKey]}
          </span>
          <div className="flex-1 h-5 bg-white/10 rounded overflow-hidden">
            <div 
              className={`${barColor} h-full rounded transition-all hover:opacity-80`}
              style={{ width: `${(d[yKey] / maxValue) * 100}%` }}
              title={`${d[xKey]}: ${d[yKey]}`}
            />
          </div>
          <span className="text-xs text-white/50 w-12 text-right">{d[yKey]}</span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ data, labelKey, valueKey }: { data: any[]; labelKey: string; valueKey: string }) {
  if (!data.length) return <div className="h-full flex items-center justify-center text-white/40">No data</div>;
  
  const colors = ['#3b82f6', '#22c55e', '#eab308', '#f97316', '#ef4444', '#a855f7', '#ec4899'];
  const total = data.reduce((sum, d) => sum + d[valueKey], 0);
  
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative w-48 h-48">
        <div className="absolute inset-0 rounded-full border-8 border-transparent" style={{
          background: `conic-gradient(${data.map((d, i) => `${colors[i % colors.length]} ${(d[valueKey] / total) * 100}%`).join(', ')})`
        }} />
        <div className="absolute inset-8 rounded-full bg-gray-900 flex items-center justify-center">
          <span className="text-white font-bold text-sm">{total}</span>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: colors[i % colors.length] }} />
            <span className="text-white/80">{d[labelKey]}: {Math.round(d[valueKey] / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SourceHealthChart({ data }: { data: { source: string; healthy: boolean; total: number; avgLatency: number }[] }) {
  if (!data.length) return <div className="h-full flex items-center justify-center text-white/40">No source data</div>;
  
  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/10 text-white/60">
            <th className="text-left p-2">Source</th>
            <th className="text-right p-2">Status</th>
            <th className="text-right p-2">Latency</th>
          </tr>
        </thead>
        <tbody>
          {data.map(s => (
            <tr key={s.source} className="border-b border-white/5 hover:bg-white/5">
              <td className="p-2 text-white/90 truncate max-w-[150px]">{s.source}</td>
              <td className="p-2 text-right">
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  s.healthy ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {s.healthy ? 'Healthy' : 'Degraded'}
                </span>
              </td>
              <td className="p-2 text-right text-white/60 font-mono">
                {s.avgLatency}ms
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InsightCard({ title, value, description, icon, warning }: { 
  title: string; 
  value: string; 
  description: string; 
  icon: string;
  warning?: boolean;
}) {
  return (
    <div className={`p-5 bg-white/5 backdrop-blur-sm rounded-xl border ${warning ? 'border-red-500/30' : 'border-white/10'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <h4 className="text-sm font-medium text-white/70">{title}</h4>
      </div>
      <p className={`text-2xl font-bold ${warning ? 'text-red-400' : 'text-white'}`}>{value}</p>
      <p className="text-xs text-white/50 mt-1">{description}</p>
    </div>
  );
}

// Page wrapper for Next.js routing
export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}