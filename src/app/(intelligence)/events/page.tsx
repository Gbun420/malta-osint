'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { CommandHeader } from '@/components/intelligence/CommandHeader';
import { StatusBadge } from '@/components/intelligence/StatusBadge';
import { ConfidenceBadge } from '@/components/intelligence/ConfidenceBadge';
import { VerificationBadge } from '@/components/intelligence/VerificationBadge';
import { SourceHealthBadge } from '@/components/intelligence/SourceHealthBadge';
import { IntelligenceEvent } from '@/intelligence/types';
import { fetchIntelligenceEvents } from '@/services/intelligence/eventsService';

interface FilterState {
  search: string;
  severity: string[];
  confidenceRange: [number, number];
  dateRange: { start: string; end: string };
  verificationStates: string[];
  eventTypes: string[];
  sources: string[];
  status: string[];
}

const SEVERITY_LABELS = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Critical',
  5: 'Severe'
};

const CONFIDENCE_LABELS = {
  0: 'Unverified',
  25: 'Low',
  50: 'Medium',
  75: 'High',
  90: 'Very High',
  100: 'Confirmed'
};

export default function GlobalEvents() {
  const [events, setEvents] = useState<IntelligenceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    severity: [],
    confidenceRange: [0, 100],
    dateRange: { start: '', end: '' },
    verificationStates: [],
    eventTypes: [],
    sources: [],
    status: []
  });

  // Available filter options derived from events
  const availableFilters = useMemo(() => ({
    severity: [...new Set(events.map(e => e.severity).filter(Boolean))].sort((a, b) => a - b),
    verificationStates: [...new Set(events.map(e => e.verificationState).filter(Boolean))],
    eventTypes: [...new Set(events.flatMap(e => e.categories || []).filter(Boolean))],
    sources: [...new Set(events.map(e => e.sourceId).filter(Boolean))],
    status: [...new Set(events.map(e => e.status).filter(Boolean))]
  }), [events]);

  // Apply filters to events
  const filteredEvents = useMemo(() => {
    return events.filter(event => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch = 
          event.title?.toLowerCase().includes(searchLower) ||
          event.summary?.toLowerCase().includes(searchLower) ||
          event.id?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Severity filter
      if (filters.severity.length > 0 && event.severity) {
        if (!filters.severity.includes(event.severity.toString())) return false;
      }

      // Confidence range filter
      if (event.confidenceScore !== undefined) {
        if (event.confidenceScore < filters.confidenceRange[0] || 
            event.confidenceScore > filters.confidenceRange[1]) return false;
      }

      // Date range filter
      if (filters.dateRange.start && event.eventTime) {
        if (new Date(event.eventTime) < new Date(filters.dateRange.start)) return false;
      }
      if (filters.dateRange.end && event.eventTime) {
        if (new Date(event.eventTime) > new Date(filters.dateRange.end)) return false;
      }

      // Verification state filter
      if (filters.verificationStates.length > 0 && event.verificationState) {
        if (!filters.verificationStates.includes(event.verificationState)) return false;
      }

      // Event type/category filter
      if (filters.eventTypes.length > 0 && event.categories) {
        const hasType = event.categories.some(cat => filters.eventTypes.includes(cat));
        if (!hasType) return false;
      }

      // Source filter
      if (filters.sources.length > 0 && event.sourceId) {
        if (!filters.sources.includes(event.sourceId)) return false;
      }

      // Status filter
      if (filters.status.length > 0 && event.status) {
        if (!filters.status.includes(event.status)) return false;
      }

      return true;
    });
  }, [events, filters]);

  // Load events
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const data = await fetchIntelligenceEvents();
        setEvents(data);
      } catch (error) {
        console.error('Failed to load events:', error);
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  // Handle filter changes
  const updateFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleFilterValue = (filterKey: keyof FilterState, value: string) => {
    setFilters(prev => {
      const current = prev[filterKey] as string[];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [filterKey]: updated };
    });
  };

  const clearAllFilters = () => {
    setFilters({
      search: '',
      severity: [],
      confidenceRange: [0, 100],
      dateRange: { start: '', end: '' },
      verificationStates: [],
      eventTypes: [],
      sources: [],
      status: []
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => 
    Array.isArray(v) ? v.length > 0 : v !== '' && v !== 0 && (typeof v === 'object' ? Object.values(v).some(val => val !== '') : true)
  );

  // Export functionality
  const exportEvents = (format: 'csv' | 'json') => {
    const data = filteredEvents.map(event => ({
      id: event.id,
      title: event.title,
      summary: event.summary,
      severity: event.severity,
      confidenceScore: event.confidenceScore,
      confidenceLabel: event.confidenceLabel,
      verificationState: event.verificationState,
      eventTime: event.eventTime,
      sourceId: event.sourceId,
      status: event.status,
      categories: event.categories?.join('; '),
      countries: event.countries?.map(c => c.name).join('; ')
    }));

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      downloadBlob(blob, `intelligence-events-${new Date().toISOString().split('T')[0]}.json`);
    } else {
      const headers = Object.keys(data[0] || {});
      const csv = [
        headers.join(','),
        ...data.map(row => headers.map(h => `"${(row as any)[h] || ''}"`).join(','))
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      downloadBlob(blob, `intelligence-events-${new Date().toISOString().split('T')[0]}.csv`);
    }
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Statistics
  const stats = useMemo(() => ({
    total: events.length,
    filtered: filteredEvents.length,
    critical: filteredEvents.filter(e => e.severity >= 4).length,
    highConfidence: filteredEvents.filter(e => (e.confidenceScore || 0) >= 80).length,
    verified: filteredEvents.filter(e => e.verificationState === 'verified' || e.verificationState === 'multi-source').length
  }), [events, filteredEvents]);

  return (
    <div className="space-y-6">
      <CommandHeader 
        sidebarOpen={false} 
        onToggleSidebar={() => {}}
      />
      
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Global Events</h1>
          <p className="text-white/60 text-sm mt-1">
            {stats.filtered} of {stats.total} events • 
            {stats.critical} critical • 
            {stats.highConfidence} high confidence • 
            {stats.verified} verified
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setFilterPanelOpen(!filterPanelOpen)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterPanelOpen 
                ? 'bg-white/20 text-white' 
                : 'bg-white/10 text-white/80 hover:bg-white/20'
            }`}
          >
            🔍 Filters {hasActiveFilters && <span className="ml-1 px-1.5 py-0.5 bg-red-500 text-xs rounded-full">{Object.values(filters).flatMap(v => Array.isArray(v) ? v : []).length}</span>}
          </button>
          
          <div className="flex gap-2">
            <button
              onClick={() => exportEvents('csv')}
              className="px-4 py-2 bg-white/10 text-white/80 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
            >
              📊 Export CSV
            </button>
            <button
              onClick={() => exportEvents('json')}
              className="px-4 py-2 bg-white/10 text-white/80 rounded-lg text-sm font-medium hover:bg-white/20 transition-colors"
            >
              📄 Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <div className={`${filterPanelOpen ? 'block' : 'hidden'} animate-slide-down`}>
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 mb-6 border border-white/10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white">Advanced Filters</h2>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-white/60 hover:text-white transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Search */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-white/80 mb-2">Search Events</label>
              <input
                type="text"
                placeholder="Search by title, summary, ID..."
                value={filters.search}
                onChange={(e) => updateFilter('search', e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            {/* Confidence Range */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                Confidence Range: {filters.confidenceRange[0]}% - {filters.confidenceRange[1]}%
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.confidenceRange[0]}
                  onChange={(e) => updateFilter('confidenceRange', [parseInt(e.target.value), filters.confidenceRange[1]])}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.confidenceRange[1]}
                  onChange={(e) => updateFilter('confidenceRange', [filters.confidenceRange[0], parseInt(e.target.value)])}
                  className="w-full h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Date Range</label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, start: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                />
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => updateFilter('dateRange', { ...filters.dateRange, end: e.target.value })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                />
              </div>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Severity</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableFilters.severity.map(sev => (
                  <label key={sev} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.severity.includes(sev.toString())}
                      onChange={() => toggleFilterValue('severity', sev.toString())}
                      className="w-4 h-4 rounded border-white/30 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-white/90">
                      {SEVERITY_LABELS[sev as keyof typeof SEVERITY_LABELS] || `Level ${sev}`}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Verification States */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Verification</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableFilters.verificationStates.map(state => (
                  <label key={state} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.verificationStates.includes(state)}
                      onChange={() => toggleFilterValue('verificationStates', state)}
                      className="w-4 h-4 rounded border-white/30 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-white/90 capitalize">{state.replace('-', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Event Types */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Event Types</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableFilters.eventTypes.map(type => (
                  <label key={type} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.eventTypes.includes(type)}
                      onChange={() => toggleFilterValue('eventTypes', type)}
                      className="w-4 h-4 rounded border-white/30 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-white/90 capitalize">{type.replace('-', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sources */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Data Sources</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableFilters.sources.map(source => (
                  <label key={source} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.sources.includes(source)}
                      onChange={() => toggleFilterValue('sources', source)}
                      className="w-4 h-4 rounded border-white/30 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-white/90 truncate">{source}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Status</label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableFilters.status.map(status => (
                  <label key={status} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(status)}
                      onChange={() => toggleFilterValue('status', status)}
                      className="w-4 h-4 rounded border-white/30 text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-sm text-white/90 capitalize">{status}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Active Events ({filteredEvents.length})</h2>
          {hasActiveFilters && (
            <span className="text-sm text-white/60">
              Filtered from {events.length} total
            </span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="p-4 border border-white/10 rounded-lg animate-pulse">
                <div className="h-6 bg-white/10 rounded w-3/4 mb-3"></div>
                <div className="h-4 bg-white/5 rounded w-full mb-2"></div>
                <div className="h-4 bg-white/5 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-white/40 text-4xl mb-4">🔍</div>
            <h3 className="text-white text-lg font-medium mb-2">No events match your filters</h3>
            <p className="text-white/50 mb-4">Try adjusting your filter criteria</p>
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredEvents.map(event => (
              <article 
                key={event.id} 
                className="p-4 border border-white/10 rounded-xl bg-white/5 hover:border-white/20 hover:bg-white/10 transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 pr-3">
                    <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-2">
                      {event.title}
                    </h3>
                    <p className="text-sm text-white/60 mt-1 line-clamp-2">{event.summary}</p>
                  </div>
                  {event.severity >= 4 && (
                    <span className="flex-shrink-0 ml-2 px-2 py-1 bg-red-500/20 text-red-400 text-xs font-bold rounded-full">
                      CRITICAL
                    </span>
                  )}
                </div>

                {/* Meta Info */}
                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-3 text-xs text-white/60">
                    {event.eventTime && (
                      <span>📅 {new Date(event.eventTime).toLocaleDateString()}</span>
                    )}
                    {event.sourceId && (
                      <span>📡 {event.sourceId}</span>
                    )}
                    {event.countries && event.countries.length > 0 && (
                      <span>🌍 {event.countries.slice(0, 2).map(c => c.name).join(', ')}</span>
                    )}
                  </div>

                  {event.categories && event.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {event.categories.slice(0, 3).map(cat => (
                        <span key={cat} className="px-2 py-0.5 bg-white/10 text-white/70 text-xs rounded">
                          {cat.replace('-', ' ')}
                        </span>
                      ))}
                      {event.categories.length > 3 && (
                        <span className="px-2 py-0.5 bg-white/10 text-white/50 text-xs rounded">
                          +{event.categories.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-white/10">
                  <ConfidenceBadge confidence={event.confidenceScore || 0} />
                  <VerificationBadge state={event.verificationState || 'unverified'} />
                  {event.status && (
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      event.status === 'active' ? 'bg-green-500/20 text-green-400' :
                      event.status === 'resolved' ? 'bg-blue-500/20 text-blue-400' :
                      event.status === 'investigating' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {event.status}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}