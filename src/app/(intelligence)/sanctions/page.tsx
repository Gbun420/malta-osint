'use client';

import { useState, useEffect } from 'react';

interface Sanction {
  id: string;
  name: string;
  aliases: string[];
  designation: string;
  programme: string;
  euReference: string;
  reason: string;
  dateListed: string | null;
  nationalities: string[];
  entityType: 'entity' | 'person';
}

interface SanctionsResponse {
  sanctions: Sanction[];
  count: number;
  total: number;
  timestamp: string;
  source: string;
  scope: string;
  coverageLabel: string;
  error?: string;
}

export default function Sanctions() {
  const [data, setData] = useState<SanctionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [reviewMode, setReviewMode] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const res = await fetch('/api/intelligence/sanctions');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load sanctions data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const sanctions = data?.sanctions || [];
  const filtered = search
    ? sanctions.filter(s =>
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.programme.toLowerCase().includes(search.toLowerCase()) ||
        s.reason.toLowerCase().includes(search.toLowerCase())
      )
    : sanctions;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Sanctions Intelligence</h1>
          <p className="text-sm text-white/50 mt-1">{data?.coverageLabel || 'EU Consolidated Sanctions List'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hud-label">{data?.source || 'EU RSS Feed'}</span>
          <span className="text-xs text-white/30">{data?.scope || 'global'}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search sanctions by name, programme, or reason..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30"
        />
        <button
          onClick={() => setReviewMode(!reviewMode)}
          className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            reviewMode ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 'bg-white/10 text-white/70 border border-white/10'
          }`}
        >
          Review Mode {reviewMode ? 'ON' : 'OFF'}
        </button>
      </div>

      {loading ? (
        <div className="glass-panel p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto mb-3" />
          <p className="text-white/50 text-sm">Loading EU sanctions list...</p>
        </div>
      ) : error ? (
        <div className="glass-panel p-8 text-center">
          <p className="text-red-400 text-lg font-medium mb-2">Failed to load sanctions</p>
          <p className="text-white/50 text-sm mb-4">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); fetch('/api/intelligence/sanctions').then(r => r.json()).then(setData).catch(e => setError(e.message)).finally(() => setLoading(false)); }}
            className="px-4 py-2 bg-gold/20 text-gold rounded-lg text-sm hover:bg-gold/30 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 && search ? (
        <div className="glass-panel p-8 text-center">
          <p className="text-white/50 text-lg mb-1">No sanctions match &ldquo;{search}&rdquo;</p>
          <p className="text-white/30 text-sm">Try a different search term</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <p className="text-white/50 text-lg mb-1">Sanctions list unavailable</p>
          <p className="text-white/30 text-sm">{data?.error || 'The EU sanctions feed returned no entries'}</p>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="glass-panel p-4">
              <div className="hud-label">Total Entries</div>
              <div className="hud-value text-2xl">{filtered.length}</div>
            </div>
            <div className="glass-panel p-4">
              <div className="hud-label">Last Updated</div>
              <div className="hud-value text-lg">{data?.timestamp ? new Date(data.timestamp).toLocaleDateString() : '—'}</div>
            </div>
            <div className="glass-panel p-4">
              <div className="hud-label">Source Status</div>
              <div className="hud-value text-lg text-green-400">{data?.error ? 'Degraded' : 'Live'}</div>
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map(s => (
              <div key={s.id} className="glass-panel p-4 hover:border-gold/30 transition-all duration-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{s.name}</h3>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        s.entityType === 'person' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {s.entityType}
                      </span>
                      {reviewMode && (
                        <span className="text-xs px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">PENDING REVIEW</span>
                      )}
                    </div>
                    {s.aliases.length > 0 && (
                      <p className="text-xs text-white/40 mt-1">AKA: {s.aliases.join(', ')}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                      <span className="gotham-tag gotham-tag--medium">{s.programme}</span>
                      {s.nationalities.map((n, i) => (
                        <span key={i} className="gotham-tag gotham-tag--info">{n}</span>
                      ))}
                      {s.designation && <span className="gotham-tag">{s.designation}</span>}
                    </div>
                    {s.reason && (
                      <p className="text-xs text-white/50 mt-2 line-clamp-2">{s.reason}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 ml-4">
                    {s.euReference && (
                      <a
                        href={s.euReference}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-cyan-400/70 hover:text-cyan-400 underline"
                      >
                        EU Reference ↗
                      </a>
                    )}
                    {s.dateListed && (
                      <span className="text-xs text-white/30">{new Date(s.dateListed).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                {reviewMode && (
                  <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
                    <span className="text-xs text-white/40">Human review required for fuzzy matches</span>
                    <button className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30">Confirm</button>
                    <button className="px-2 py-1 bg-red-500/20 text-red-400 rounded text-xs hover:bg-red-500/30">Flag</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs text-white/30 flex items-center gap-4 pt-2 border-t border-white/5">
        <span>Source: {data?.source || 'EU Consolidated Sanctions List'}</span>
        <span>Scope: {data?.scope || 'global'}</span>
        {data?.timestamp && <span>Fetched: {new Date(data.timestamp).toLocaleString()}</span>}
      </div>
    </div>
  );
}
