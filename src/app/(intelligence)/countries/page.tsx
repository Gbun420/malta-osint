'use client';

import { useState, useEffect } from 'react';

interface CountryProfile {
  name: string;
  alpha2: string;
  alpha3: string;
  region: string;
  maltaBilateralScore?: number;
  recentEvents: number;
  lastEventAt: string | null;
}

interface Envelope<T> {
  data: T;
  sources: string[];
  warnings: string[];
  cached: boolean;
}

export default function Countries() {
  const [profiles, setProfiles] = useState<Envelope<CountryProfile[]> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'relevance' | 'events'>('name');

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const res = await fetch('/api/intelligence/countries');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setProfiles(json as Envelope<CountryProfile[]>);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load country data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const isEmpty = profiles?.data?.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Country Index</h1>
          <p className="text-sm text-white/50 mt-1">Country profiles with Malta bilateral relevance tracking</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          placeholder="Search countries..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-gold/30"
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none"
        >
          <option value="name">Sort by Name</option>
          <option value="relevance">Sort by Malta Relevance</option>
          <option value="events">Sort by Event Count</option>
        </select>
      </div>

      {loading ? (
        <div className="glass-panel p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto mb-3" />
          <p className="text-white/50 text-sm">Loading country profiles...</p>
        </div>
      ) : error ? (
        <div className="glass-panel p-8 text-center">
          <p className="text-red-400 text-lg font-medium mb-2">Failed to load countries</p>
          <p className="text-white/50 text-sm mb-4">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); fetch('/api/intelligence/countries').then(r => r.json()).then(setProfiles).catch(e => setError(e.message)).finally(() => setLoading(false)); }}
            className="px-4 py-2 bg-gold/20 text-gold rounded-lg text-sm hover:bg-gold/30 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : isEmpty ? (
        <div className="glass-panel p-8 text-center">
          <GlobeIcon />
          <p className="text-white/50 text-lg font-medium mb-1">Country profiles not yet populated</p>
          <p className="text-white/30 text-sm mb-4">
            {profiles?.warnings?.[0] || 'Run intelligence ingestion to populate country profiles.'}
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-white/30">
            <span>API: /api/intelligence/countries</span>
            {profiles?.sources?.length ? <span>Sources: {profiles.sources.join(', ')}</span> : null}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {profiles!.data
            .filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()))
            .sort((a, b) => {
              if (sortBy === 'relevance') return (b.maltaBilateralScore || 0) - (a.maltaBilateralScore || 0);
              if (sortBy === 'events') return b.recentEvents - a.recentEvents;
              return a.name.localeCompare(b.name);
            })
            .map(c => (
              <div key={c.alpha2} className="glass-panel p-4 hover:border-gold/30 transition-all duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-bold ${c.maltaBilateralScore && c.maltaBilateralScore >= 60 ? 'text-gold' : 'text-white'}`}>
                      {c.name}
                    </span>
                    <span className="text-xs text-white/30 font-mono">{c.alpha2}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {c.maltaBilateralScore != null && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.maltaBilateralScore >= 60 ? 'bg-gold/20 text-gold' :
                        c.maltaBilateralScore >= 30 ? 'bg-blue-500/20 text-blue-400' :
                        'bg-white/10 text-white/50'
                      }`}>
                        Malta Score: {c.maltaBilateralScore}/100
                      </span>
                    )}
                    <span className="text-xs text-white/40">{c.recentEvents} events</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-xs text-white/40">{c.region}</span>
                  {c.lastEventAt && (
                    <span className="text-xs text-white/30">Latest: {new Date(c.lastEventAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
        </div>
      )}

      <div className="text-xs text-white/30 flex items-center gap-4 pt-2 border-t border-white/5">
        <span>API: /api/intelligence/countries</span>
        {profiles?.sources?.length ? <span>Sources: {profiles.sources.join(', ')}</span> : null}
        {profiles?.warnings?.length ? <span className="text-yellow-400/60">Warning: {profiles.warnings[0]}</span> : null}
      </div>
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg className="w-12 h-12 mx-auto mb-3 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
