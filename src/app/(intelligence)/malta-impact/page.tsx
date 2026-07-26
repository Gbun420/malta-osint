'use client';

import { useState, useEffect } from 'react';
import { MaltaRelevanceBadge } from '@/components/intelligence/MaltaRelevanceBadge';
import { ConfidenceBadge } from '@/components/intelligence/ConfidenceBadge';
import { VerificationBadge } from '@/components/intelligence/VerificationBadge';

interface CountryRef {
  name: string;
  alpha2: string;
}

interface EvidenceRef {
  evidenceId: string;
  publisher: string;
  publicationTime?: string;
}

interface IntelligenceEvent {
  id: string;
  title: string;
  summary: string;
  severity: number;
  maltaRelevanceScore: number;
  maltaRelevanceFactors?: string[];
  confidenceScore: number;
  confidenceLabel: string;
  verificationState: string;
  eventTime: string;
  lastObservedAt: string;
  countries: CountryRef[];
  categories: string[];
  evidenceIds: string[];
  evidence: EvidenceRef[];
  status: string;
}

interface EventsEnvelope {
  data: {
    events: IntelligenceEvent[];
    total: number;
    offset: number;
    limit: number;
  };
  sources: string[];
  warnings: string[];
}

const RELEVANCE_TIERS = [
  { min: 80, label: 'Immediate', color: 'text-red-400' },
  { min: 60, label: 'High', color: 'text-orange-400' },
  { min: 40, label: 'Monitor', color: 'text-yellow-400' },
  { min: 20, label: 'Background', color: 'text-blue-400' },
  { min: 0, label: 'General', color: 'text-gray-400' },
];

export default function MaltaImpact() {
  const [events, setEvents] = useState<IntelligenceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ total: number; sources: string[]; warnings: string[] } | null>(null);
  const [minScore, setMinScore] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const params = minScore > 0 ? `?minMaltaRelevance=${minScore}` : '';
        const res = await fetch(`/api/intelligence/events${params}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as EventsEnvelope;
        const sorted = (json.data?.events || []).sort((a, b) => b.maltaRelevanceScore - a.maltaRelevanceScore);
        setEvents(sorted);
        setMeta({
          total: json.data?.total || 0,
          sources: json.sources || [],
          warnings: json.warnings || [],
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load events');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [minScore]);

  const tierCounts = RELEVANCE_TIERS.map(tier => ({
    ...tier,
    count: events.filter(e => e.maltaRelevanceScore >= tier.min).length,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Malta Impact Assessment</h1>
          <p className="text-sm text-white/50 mt-1">
            Global events ranked through the Malta lens · {events.length} events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hud-label">Min Relevance</span>
          <input
            type="range"
            min={0}
            max={100}
            step={10}
            value={minScore}
            onChange={e => setMinScore(Number(e.target.value))}
            className="w-24 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-white/60 w-6">{minScore}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {tierCounts.map(t => (
          <div key={t.label} className="glass-panel p-3 text-center">
            <div className={`text-xl font-bold ${t.color}`}>{t.count}</div>
            <div className="hud-label">{t.label}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="glass-panel p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto mb-3" />
          <p className="text-white/50 text-sm">Loading impact events...</p>
        </div>
      ) : error ? (
        <div className="glass-panel p-8 text-center">
          <p className="text-red-400 text-lg font-medium mb-2">Failed to load events</p>
          <p className="text-white/50 text-sm mb-4">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); setMinScore(0); }}
            className="px-4 py-2 bg-gold/20 text-gold rounded-lg text-sm hover:bg-gold/30 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : events.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <ImpactIcon />
          <p className="text-white/50 text-lg font-medium mb-1">No impact events available</p>
          <p className="text-white/30 text-sm mb-4">
            {meta?.warnings?.[0] || 'No events with Malta relevance scoring found. Run intelligence ingestion first.'}
          </p>
          {meta?.sources && meta.sources.length > 0 && (
            <p className="text-xs text-white/20">Sources: {meta.sources.join(', ')}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {events.map(event => (
            <div key={event.id} className="glass-panel p-5 hover:border-gold/30 transition-all duration-200">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-white">{event.title}</h3>
                    {event.severity >= 4 && (
                      <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded font-bold">CRITICAL</span>
                    )}
                  </div>
                  <p className="text-sm text-white/60 mt-1 line-clamp-2">{event.summary}</p>
                </div>
                <div className="flex flex-col items-end gap-1 ml-4">
                  <MaltaRelevanceBadge score={event.maltaRelevanceScore} />
                  <ConfidenceBadge value={event.confidenceScore} label={event.confidenceLabel as "low" | "high" | "confirmed" | "moderate" | "unverified"} />
                  <VerificationBadge state={event.verificationState} />
                </div>
              </div>

              {event.maltaRelevanceFactors && event.maltaRelevanceFactors.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10">
                  <div className="hud-label mb-1">Relevance Factors</div>
                  <div className="flex flex-wrap gap-1.5">
                    {event.maltaRelevanceFactors.map((f, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-gold/10 text-gold/80 rounded">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/40">
                {event.eventTime && (
                  <span>Occurred: {new Date(event.eventTime).toLocaleString()}</span>
                )}
                {event.countries?.length > 0 && (
                  <span>Countries: {event.countries.map(c => c.name).join(', ')}</span>
                )}
                {event.categories?.length > 0 && (
                  <span>Categories: {event.categories.join(', ')}</span>
                )}
                {event.evidence?.length > 0 && (
                  <span>Evidence: {event.evidence.map(e => e.publisher).join(', ')}</span>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                {event.categories?.map(cat => (
                  <span key={cat} className="gotham-tag">{cat.replace(/-/g, ' ')}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="text-xs text-white/30 flex items-center gap-4 pt-2 border-t border-white/5">
        <span>API: /api/intelligence/events?minMaltaRelevance={minScore || '(none)'}</span>
        {meta?.sources?.length ? <span>Sources: {meta.sources.join(', ')}</span> : null}
        {meta?.warnings?.length ? <span className="text-yellow-400/60">{meta.warnings[0]}</span> : null}
      </div>
    </div>
  );
}

function ImpactIcon() {
  return (
    <svg className="w-12 h-12 mx-auto mb-3 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
