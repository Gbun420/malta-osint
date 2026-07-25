'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CommandHeader } from '@/components/intelligence/CommandHeader';
import { StatusBadge } from '@/components/intelligence/StatusBadge';
import { ConfidenceBadge } from '@/components/intelligence/ConfidenceBadge';
import { VerificationBadge } from '@/components/intelligence/VerificationBadge';
import { SourceHealthBadge } from '@/components/intelligence/SourceHealthBadge';
import { MinisterBriefItem } from '@/intelligence/briefing/MinisterBriefItem';
import { IntelligenceEvent } from '@/intelligence/types';
import { SourceHealthRecord } from '@/intelligence/schemas/registry';

export default function GlobalEvents() {
  const [events, setEvents] = useState<IntelligenceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    // Simulate data loading
    const mockEvents: IntelligenceEvent[] = [
      {
        id: '1',
        title: 'Malta-EU Trade Agreement',
        summary: 'New trade agreement signed between Malta and EU',
        eventTime: '2024-06-15T10:00:00Z',
        firstObservedAt: '2024-06-14T08:00:00Z',
        lastUpdatedAt: '2024-06-15T14:30:00Z',
        countries: [
          { alpha2: 'MT', name: 'Malta', role: 'sovereign' },
          { alpha2: 'DE', name: 'Germany', role: 'trading partner' },
          { alpha2: 'FR', name: 'France', role: 'trading partner' }
        ],
        locations: [
          { lat: 35.9, lng: 14.4, type: 'country' },
          { lat: 48.8, lng: 2.3, type: 'country' }
        ],
        severity: 3,
        confidenceScore: 90,
        maltaRelevanceScore: 85,
        verificationState: 'multi-source',
        sourceCount: 3,
        officialSourceCount: 2,
        evidenceIds: ['ais-vessels-123', 'news-rss'],
        claimIds: [],
        status: 'active',
        provenance: {
          ingestedAt: '2024-06-15T10:00:00Z',
          sourceType: 'official-primary',
          verificationMethod: 'diplomatic-official'
        }
      },
      // ... more events
    ];

    setEvents(mockEvents);
    setLoading(false);
  }, []);
  
  return (
    <div className="space-y-6">
      <CommandHeader 
        sidebarOpen={false} 
        onToggleSidebar={() => setActiveTab('events')}
      />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Global Events</h1>
        <Link href="/" className="text-white/60 hover:text-white">
          <span className="text-sm">Command Centre</span>
        </Link>
        <Link href="/events" className="ml-4 text-white/60">Events</Link>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <StatusBadge status="live" />
          <ConfidenceBadge confidence={85} label="high" />
          <VerificationBadge state="multi-source" />
        </div>
      </div>
      
      <div className="flex justify-between">
        <div className="w-2/3">
          <h2 className="text-xl font-bold mb-4">Active Events</h2>
          {loading ? (
            <div className="text-center py-8">Loading events...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {events.map(event => (
                <article key={event.id} className="p-4 border rounded-lg shadow-sm">
                  <h3 className="text-lg font-bold">{event.title}</h3>
                  <p className="text-sm text-gray-500">{event.summary}</p>
                  <div className="mt-2 flex items-center">
                    <ConfidenceBadge confidence={event.confidenceScore} label={event.confidenceLabel} />
                    <VerificationBadge state={event.verificationState} />
                    <SourceHealthBadge 
                      state={event.state as any} 
                      sourceName={event.sourceId} 
                      lastAttemptAt={event.lastObservedAt} 
                      lastSuccessAt={event.lastUpdatedAt} 
                      cacheAgeSeconds={3600} 
                      latencyMs={event.latencyMs} 
                      recordCount={event.recordCount} 
                      providerHttpStatus={event.httpStatus} 
                      errorCode={event.errorCode} 
                      safeErrorMessage={event.errorMessage}
                    />
                  </div>
                </div>
              }
            }
          )}
        </div>
      </div>
    </div>
  );
}

function filterEvents(events: IntelligenceEvent[], filter: string): IntelligenceEvent[] {
  switch(filter) {
    case 'critical':
      return events.filter(e => e.severity >= 3);
    case 'malta':
      return events.filter(e => e.maltaRelevanceScore >= 60);
    case 'eu':
      return events.filter(e => e.categories.includes('eu-policy'));
    case 'all':
    default:
      return events;
  }
}

function loadEvents() {
  // Simulate API call
  setLoading(true);
  setTimeout(() => {
    setLoading(false);
    setEvents(mockEvents);
  }, 1000);
}

const mockEvents: IntelligenceEvent[] = [
  {
    id: '1',
    title: 'Malta-EU Trade Agreement',
    summary: 'New trade agreement signed between Malta and EU',
    eventTime: '2024-06-15T10:00:00Z',
    firstObservedAt: '2024-06-14T08:00:00Z',
    lastUpdatedAt: '2024-06-15T14:30:00Z',
    countries: [
      { alpha2: 'MT', name: 'Malta', role: 'sovereign' },
      { alpha2: 'DE', name: 'Germany', role: 'trading partner' },
      { alpha2: 'FR', name: 'France', role: 'trading partner' }
    ],
    locations: [
      { lat: 35.9, lng: 14.4, type: 'country' },
      { lat: 48.8, lng: 2.3, type: 'country' }
    ],
    severity: 4,
    confidenceScore: 90,
    maltaRelevanceScore: 85,
    verificationState: 'multi-source',
    sourceCount: 3,
    officialSourceCount: 2,
    evidenceIds: ['ais-vessels-123', 'news-rss'],
    claimIds: [],
    status: 'active',
    provenance: {
      ingestedAt: '2024-06-15T10:00:00Z',
      sourceType: 'official-primary',
      sourceTypeDetail: 'AISStream.io',
      verificationMethod: 'direct-observation'
    }
  },
  // ... more mock events
];

setEvents(mockEvents);