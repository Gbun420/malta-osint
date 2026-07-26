'use client';

import { useState, useEffect, useCallback } from 'react';
import type { MinisterBriefItem, ConfidenceLabel } from '@/intelligence/types';
import { fetchIntelligenceBrief } from '@/services/intelligence/briefService';

type BriefView = 'morning' | 'evening' | 'since' | 'critical';

const VIEW_PARAMS: Record<BriefView, string> = {
  morning: '',
  evening: '?since=today',
  since: '?since=yesterday',
  critical: '?minRelevance=80&minConfidence=70',
};

const VIEW_LABELS: Record<BriefView, string> = {
  morning: 'Morning Brief',
  evening: 'Evening Update',
  since: 'Since Last Briefing',
  critical: 'Critical Only',
};

function confidenceBadge(label: ConfidenceLabel) {
  const map: Record<ConfidenceLabel, { bg: string; text: string; border: string; label: string }> = {
    confirmed: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30', label: '✓ Confirmed' },
    high: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: '◐ High' },
    moderate: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', label: '◑ Moderate' },
    low: { bg: 'bg-orange-500/20', text: 'text-orange-400', border: 'border-orange-500/30', label: '△ Low' },
    unverified: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', label: '! Unverified' },
  };
  const c = map[label];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${c.bg} ${c.text} border ${c.border}`}>
      {c.label}
    </span>
  );
}

function severityBadge(severity: number) {
  const colors: Record<number, string> = {
    5: 'bg-red-500/20 text-red-400 border-red-500/30',
    4: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    3: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    2: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    1: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  const labels: Record<number, string> = {
    5: 'Critical', 4: 'High', 3: 'Medium', 2: 'Low', 1: 'Informational',
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold border ${colors[severity] || colors[1]}`}>
      ▲ {labels[severity] || `Level ${severity}`}
    </span>
  );
}

function verificationBadge(state: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    'official-confirmation': { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: '✓ Official' },
    'multi-source': { bg: 'bg-blue-500/20', text: 'text-blue-400', label: '◐ Corroborated' },
    'single-source': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '◑ Single Source' },
    'conflicting': { bg: 'bg-red-500/20', text: 'text-red-400', label: '? Conflicting' },
    'retracted': { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'Retracted' },
  };
  const v = map[state] || map['single-source'];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${v.bg} ${v.text}`}>
      {v.label}
    </span>
  );
}

function followUpBadge(priority: string) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    'immediate': { bg: 'bg-red-500/20', text: 'text-red-400', label: 'IMMEDIATE' },
    'today': { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'TODAY' },
    'this-week': { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'THIS WEEK' },
    'monitor': { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'MONITOR' },
  };
  const b = map[priority] || map['monitor'];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${b.bg} ${b.text}`}>
      {b.label}
    </span>
  );
}

export default function MinisterBrief() {
  const [items, setItems] = useState<MinisterBriefItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ total: number; sources: string[]; warnings: string[]; generatedAt: string } | null>(null);
  const [view, setView] = useState<BriefView>('morning');

  const load = useCallback(async (viewKey: BriefView) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchIntelligenceBrief(viewKey);
      setItems(result.items);
      setMeta({
        total: result.total,
        sources: result.sources,
        warnings: result.warnings,
        generatedAt: result.generatedAt,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load briefing');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(view); }, [view]);
  useEffect(() => { load(view); }, []);

  const handleRetry = () => load(view);

  /* Metadata row */
  const metaRow = meta ? (
    <div className="brief-meta-row">
      <span className="brief-meta-item">
        <span className="brief-meta-label">Generated</span>
        <span className="brief-meta-value">
          {meta.generatedAt ? new Date(meta.generatedAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Malta' }) : '—'}
        </span>
      </span>
      <span className="brief-meta-item">
        <span className="brief-meta-label">Items</span>
        <span className="brief-meta-value">{meta.total} unique</span>
      </span>
      <span className="brief-meta-item">
        <span className="brief-meta-label">Sources</span>
        <span className="brief-meta-value">{meta.sources.length}</span>
      </span>
      <span className="brief-meta-item">
        <span className="brief-meta-label">Needs review</span>
        <span className="brief-meta-value">{items.filter(i => i.humanReviewStatus === 'pending' || i.humanReviewStatus === 'changes-requested').length}</span>
      </span>
    </div>
  ) : null;

  return (
    <div className="brief-page">
      <header className="brief-header">
        <h1 className="brief-title">Minister&apos;s Brief</h1>
        <p className="brief-subtitle">Morning intelligence briefing</p>
        {metaRow}
      </header>

      {/* Briefing controls */}
      <nav className="brief-controls" aria-label="Briefing view selector">
        {(Object.entries(VIEW_LABELS) as [BriefView, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setView(key)}
            aria-selected={view === key}
            role="tab"
            className={`brief-tab ${view === key ? 'brief-tab--active' : ''}`}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Loading */}
      {loading && (
        <div className="brief-loading">
          <div className="brief-loading-bar" aria-label="Loading briefing" role="progressbar" />
          <p className="brief-loading-text">Loading briefing…</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="brief-error" role="alert">
          <p className="brief-error-title">Failed to load briefing</p>
          <p className="brief-error-text">{error}</p>
          {meta?.warnings?.length ? (
            <p className="brief-error-warning">{meta.warnings[0]}</p>
          ) : null}
          <button onClick={handleRetry} className="brief-retry-btn" type="button">Retry</button>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && items.length === 0 && (
        <div className="brief-empty" role="status">
          <p className="brief-empty-title">No briefing items available</p>
          <p className="brief-empty-text">
            {meta?.warnings?.[0] || 'No events matched the current filters.'}
          </p>
          {meta?.sources && meta.sources.length > 0 && (
            <p className="brief-empty-sources">Sources: {meta.sources.join(', ')}</p>
          )}
        </div>
      )}

      {/* Briefing items */}
      {!loading && !error && items.length > 0 && (
        <div className="brief-items">
          {items.map(item => (
            <article key={item.id} className="brief-card" aria-labelledby={`brief-title-${item.id}`}>
              {/* Header row */}
              <div className="brief-card-header">
                <div className="brief-card-header-left">
                  <h2 id={`brief-title-${item.id}`} className="brief-card-title">{item.headline}</h2>
                  <div className="brief-card-badges">
                    {severityBadge(item.severity)}
                    {confidenceBadge(item.confidenceLabel)}
                    {verificationBadge(item.verificationState)}
                  </div>
                </div>
              </div>

              {/* Executive summary */}
              <p className="brief-card-summary">{item.executiveSummary}</p>

              {/* Why it matters */}
              {item.whyItMattersToMalta.length > 0 && (
                <div className="brief-card-section">
                  <h3 className="brief-card-section-title">Impact Assessment</h3>
                  <ul className="brief-card-list">
                    {item.whyItMattersToMalta.map((point, i) => (
                      <li key={i} className="brief-card-list-item">{point}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Follow-up actions */}
              {item.possibleFollowUp.length > 0 && (
                <div className="brief-card-section">
                  <h3 className="brief-card-section-title">Recommended Actions</h3>
                  <ul className="brief-card-list">
                    {item.possibleFollowUp.map((f, i) => (
                      <li key={i} className="brief-card-followup">
                        <span className="brief-card-followup-action">{f.action}</span>
                        <span className="brief-card-followup-meta">
                          {followUpBadge(f.priority)}
                          {f.rationale && (
                            <span className="brief-card-followup-rationale">{f.rationale}</span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Metadata footer */}
              <div className="brief-card-footer">
                <div className="brief-card-meta">
                  {item.eventTime && (
                    <span className="brief-meta-item">
                      <span className="brief-meta-label">Occurred</span>
                      <span className="brief-meta-value">{new Date(item.eventTime).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Malta' })}</span>
                    </span>
                  )}
                  {item.countries && item.countries.length > 0 && (
                    <span className="brief-meta-item">
                      <span className="brief-meta-label">Countries</span>
                      <span className="brief-meta-value">{item.countries.map(c => c.name || c.alpha2).join(', ')}</span>
                    </span>
                  )}
                  {item.categories && item.categories.length > 0 && (
                    <span className="brief-meta-item">
                      <span className="brief-meta-label">Categories</span>
                      <span className="brief-meta-value">{item.categories.map(c => c.replace(/-/g, ' ')).join(', ')}</span>
                    </span>
                  )}
                </div>
                <div className="brief-card-status">
                  <span className={`brief-review-badge brief-review-badge--${item.humanReviewStatus}`}>
                    {item.humanReviewStatus.replace(/-/g, ' ')}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Warnings */}
      {meta?.warnings?.length ? (
        <div className="brief-warnings" role="status">
          {meta.warnings.map((w, i) => (
            <p key={i} className="brief-warning-text">{w}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}