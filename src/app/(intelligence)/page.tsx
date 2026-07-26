'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Ship,
  Plane,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronRight,
  Radio,
  Shield,
} from 'lucide-react';
import { MaltaRelevanceBadge } from '@/components/intelligence/MaltaRelevanceBadge';
import { ConfidenceBadge } from '@/components/intelligence/ConfidenceBadge';
import { VerificationBadge } from '@/components/intelligence/VerificationBadge';
import { SourceHealthBadge } from '@/components/intelligence/SourceHealthBadge';
import type { IntelligenceEvent } from '@/intelligence/types';
import type { SourceHealthRecord } from '@/intelligence/schemas/registry';

const MOCK_EVENTS: IntelligenceEvent[] = [];

const MOCK_HEALTH: SourceHealthRecord[] = [];

export default function CommandCentre() {
  const [activeTab, setActiveTab] = useState<'critical' | 'malta' | 'eu' | 'global'>('critical');

  const criticalEvents = MOCK_EVENTS.filter(e => e.severity >= 3).slice(0, 5);
  const maltaEvents = MOCK_EVENTS.filter(e => e.maltaRelevanceScore >= 40).slice(0, 5);
  const euEvents = MOCK_EVENTS.filter(e => e.categories.includes('eu-policy')).slice(0, 5);
  const allEvents = MOCK_EVENTS.slice(0, 10);

  const events =
    activeTab === 'critical' ? criticalEvents :
    activeTab === 'malta' ? maltaEvents :
    activeTab === 'eu' ? euEvents :
    allEvents;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Command Centre</h1>
        <div className="flex items-center gap-2 text-sm text-white/50">
          <Clock className="h-3 w-3" />
          <span>{new Date().toLocaleString('en-MT', { timeZone: 'Europe/Malta' })}</span>
        </div>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gold">Operational Feed Status</h2>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4 lg:grid-cols-6">
          {[
            { state: 'healthy' as const, name: 'ADS-B', count: 1247 },
            { state: 'healthy' as const, name: 'AIS', count: 342 },
            { state: 'stale' as const, name: 'FIRMS', count: 0 },
            { state: 'unconfigured' as const, name: 'ReliefWeb', count: 0 },
            { state: 'degraded' as const, name: 'USGS', count: 3 },
            { state: 'healthy-empty' as const, name: 'EEAS', count: 0 },
          ].map(s => (
            <SourceHealthBadge key={s.name} state={s.state} sourceName={`${s.name} (${s.count})`} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-4 border-b border-gold/20">
          {(['critical', 'malta', 'eu', 'global'] as const).map(tab => (
            <button
              key={tab}
              className={`pb-2 text-sm font-medium capitalize ${
                activeTab === tab ? 'text-gold' : 'text-white/50 hover:text-white/80'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'critical' ? 'Critical' : tab === 'malta' ? 'Malta Relevance' : tab === 'eu' ? 'EU & Multilateral' : 'All Events'}
            </button>
          ))}
        </div>

        {events.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gold/20 bg-white/5 p-8 text-center text-white/40">
            <p className="text-lg font-medium">No events to display</p>
            <p className="text-sm">Run ingestion to populate the feed, or check source health to verify connectivity.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(event => (
              <div
                key={event.id}
                className="rounded-lg border border-gold/10 bg-white/5 p-4 hover:border-gold/30"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-white">{event.title}</h3>
                    <p className="mt-1 text-sm text-white/60">{event.summary}</p>
                  </div>
                  <div className="ml-4 flex flex-col items-end gap-1">
                    <MaltaRelevanceBadge score={event.maltaRelevanceScore} />
                    <ConfidenceBadge value={event.confidenceScore} label="moderate" />
                    <VerificationBadge state={event.verificationState} />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/40">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {new Date(event.lastObservedAt).toLocaleString('en-MT')}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.countries.length} countries</span>
                  <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> {event.categories.join(', ')}</span>
                  {event.evidenceIds.length > 0 && (
                    <span className="flex items-center gap-1"><Radio className="h-3 w-3" /> {event.evidenceIds.length} sources</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gold">Malta Relevance Breakdown</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {[
            { label: 'Immediate', count: 0, color: 'text-red-400' },
            { label: 'High', count: 0, color: 'text-orange-400' },
            { label: 'Monitor', count: 0, color: 'text-yellow-400' },
            { label: 'Background', count: 0, color: 'text-blue-400' },
            { label: 'General', count: 0, color: 'text-gray-400' },
          ].map(item => (
            <Link
              key={item.label}
              href={`/events?relevance=${item.label.toLowerCase()}`}
              className="rounded-lg border border-gold/10 bg-white/5 p-3 text-center hover:border-gold/30"
            >
              <div className={`text-2xl font-bold ${item.color}`}>{item.count}</div>
              <div className="text-xs text-white/50">{item.label}</div>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-gold">Pending Review</h2>
        <div className="rounded-lg border border-dashed border-gold/20 bg-white/5 p-6 text-center text-white/40">
          <Shield className="mx-auto mb-2 h-8 w-8" />
          <p>No items pending review</p>
        </div>
      </section>
    </div>
  );
}