'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MinisterBriefItem } from '@/intelligence/types';
import { SourceHealthBadge } from '@/components/intelligence/SourceHealthBadge';
import { VerificationBadge } from '@/components/intelligence/VerificationBadge';

interface BriefResponse {
  brief: MinisterBriefItem[];
  total: number;
}

interface ApiEnvelope {
  apiVersion: string;
  generatedAt: string;
  status: 'ok' | 'partial' | 'error';
  data: BriefResponse;
  meta: {
    sources: string[];
    recordCount: number;
    warnings: string[];
    cache: { state: string; ageSeconds: number };
  };
}

const VIEW_PARAMS: Record<string, string> = {
  morning: '',
  evening: '?since=today',
  since: '?since=yesterday',
  critical: '?minRelevance=80&minConfidence=70',
};

export default function MinisterBrief() {
  const [items, setItems] = useState<MinisterBriefItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ total: number; sources: string[]; warnings: string[]; generatedAt: string } | null>(null);
  const [view, setView] = useState<'morning' | 'evening' | 'since' | 'critical'>('morning');

  const load = useCallback(async (viewKey: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = VIEW_PARAMS[viewKey] || '';
      const res = await fetch(`/api/intelligence/brief${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as ApiEnvelope;
      const brief = json.data?.brief || [];
      setItems(brief);
      setMeta({
        total: json.data?.total || 0,
        sources: json.meta?.sources || [],
        warnings: json.meta?.warnings || [],
        generatedAt: json.generatedAt || '',
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load briefing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(view);
  }, [view, load]);

  const handleRetry = () => load(view);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="glass-panel p-12 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto mb-3" />
          <p className="text-white/50 text-sm">Loading Minister&apos;s Brief...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="glass-panel p-8 text-center">
          <p className="text-red-400 text-lg font-medium mb-2">Failed to load briefing</p>
          <p className="text-white/50 text-sm mb-4">{error}</p>
          {meta?.warnings?.length ? (
            <p className="text-yellow-400/60 text-xs mb-4">{meta.warnings[0]}</p>
          ) : null}
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-gold/20 text-gold rounded-lg text-sm hover:bg-gold/30 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-white">Minister&apos;s Brief</h1>
          <p className="text-sm text-white/50 mt-1">Intelligence briefing tailored for decision-makers</p>
        </header>
        <div className="glass-panel p-8 text-center">
          <BriefIcon />
          <p className="text-white/50 text-lg font-medium mb-1">No briefing items available</p>
          <p className="text-white/30 text-sm mb-4">
            {meta?.warnings?.[0] || 'No events matched the current filters. Try a different view or ingest intelligence events first.'}
          </p>
          {meta?.sources && meta.sources.length > 0 && (
            <p className="text-xs text-white/20">Sources: {meta.sources.join(', ')}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <header className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Minister&apos;s Brief</h1>
            <p className="text-sm text-white/50 mt-1">
              {items.length} {items.length === 1 ? 'item' : 'items'} · {meta?.generatedAt ? new Date(meta.generatedAt).toLocaleString() : ''}
            </p>
          </div>
          {meta?.sources?.length ? (
            <div className="text-xs text-white/20">Sources: {meta.sources.join(', ')}</div>
          ) : null}
        </div>
        <div className="flex gap-2 mt-4 flex-wrap">
          {(['morning', 'evening', 'since', 'critical'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 rounded-md text-sm transition-colors ${
                view === v
                  ? 'bg-gold/30 text-gold border border-gold/30'
                  : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
              }`}
            >
              {v === 'morning' ? 'Morning Brief' : v === 'evening' ? 'Evening Update' : v === 'since' ? 'Since Last Briefing' : 'Critical Only'}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-4">
        {items.map(item => (
          <div key={item.id} className="glass-panel p-5 hover:border-gold/30 transition-all duration-200">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">{item.headline}</h2>
                  {item.severity >= 4 && (
                    <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded font-bold">CRITICAL</span>
                  )}
                </div>
                <p className="text-sm text-white/60 mt-1">{item.executiveSummary}</p>
              </div>
              <div className="flex flex-col items-end gap-1 ml-4 shrink-0">
                <div className="flex items-center gap-1">
                  <span className="hud-label text-[10px]">Severity</span>
                  <span className="text-sm font-bold text-white">{item.severity}/5</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="hud-label text-[10px]">Confidence</span>
                  <span className={`text-xs font-medium ${
                    item.confidenceLabel === 'high' || item.confidenceLabel === 'confirmed'
                      ? 'text-green-400' : item.confidenceLabel === 'moderate'
                        ? 'text-yellow-400' : 'text-red-400'
                  }`}>{item.confidenceLabel}</span>
                </div>
                <VerificationBadge state={item.verificationState} />
              </div>
            </div>

            {item.whyItMattersToMalta.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <span className="text-xs font-medium text-green-400">Why it matters to Malta</span>
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  {item.whyItMattersToMalta.map((point, i) => (
                    <li key={i} className="text-sm text-white/60">{point}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-white/40">
              {item.eventTime && (
                <span>Occurred: {new Date(item.eventTime).toLocaleString()}</span>
              )}
              {item.countries?.length > 0 && (
                <span>Countries: {item.countries.map(c => c.name || c.alpha2).join(', ')}</span>
              )}
              {item.categories?.length > 0 && (
                <span>Categories: {item.categories.join(', ')}</span>
              )}
            </div>

            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.categories?.map(cat => (
                <span key={cat} className="text-xs px-2 py-0.5 bg-gold/10 text-gold/80 rounded">
                  {cat.replace(/-/g, ' ')}
                </span>
              ))}
            </div>

            {item.possibleFollowUp.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <span className="text-xs font-medium text-yellow-400">Possible Follow-Up</span>
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  {item.possibleFollowUp.map((f, i) => (
                    <li key={i} className="text-sm text-yellow-400/80">
                      {f.action}
                      {f.priority && (
                        <span className="ml-2 text-[10px] uppercase text-white/30">[{f.priority}]</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs text-white/30">
                <span>Observed: {new Date(item.firstObservedAt).toLocaleString()}</span>
                <span>Updated: {new Date(item.lastUpdatedAt).toLocaleString()}</span>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded font-medium uppercase ${
                item.humanReviewStatus === 'approved' ? 'bg-green-500/20 text-green-400'
                  : item.humanReviewStatus === 'rejected' ? 'bg-red-500/20 text-red-400'
                    : item.humanReviewStatus === 'changes-requested' ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-white/10 text-white/40'
              }`}>{item.humanReviewStatus.replace(/-/g, ' ')}</span>
            </div>
          </div>
        ))}
      </div>

      {meta?.warnings?.length ? (
        <div className="mt-4 text-xs text-yellow-400/60 text-center">{meta.warnings[0]}</div>
      ) : null}
    </div>
  );
}

function BriefIcon() {
  return (
    <svg className="w-12 h-12 mx-auto mb-3 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
