'use client';

import { useState, useEffect } from 'react';

interface Vessel {
  mmsi: number;
  name: string;
  lat: number;
  lng: number;
  sog: number;
  cog: number;
  heading: number;
  navStatus: number;
  lastUpdate: number;
  positionAge: number;
  imo: string;
}

interface VesselsResponse {
  vessels: Vessel[];
  count: number;
  connected: boolean;
  error: string | null;
  timestamp: number;
  fallback: boolean;
  dataSource: string | null;
}

const MALTA_BBOX = { latMin: 35.6, latMax: 36.2, lngMin: 14.0, lngMax: 14.8 };

function isInMaltaBbox(v: Vessel): boolean {
  return v.lat >= MALTA_BBOX.latMin && v.lat <= MALTA_BBOX.latMax &&
         v.lng >= MALTA_BBOX.lngMin && v.lng <= MALTA_BBOX.lngMax;
}

function formatAge(seconds: number): string {
  if (seconds < 0) return 'unknown';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

const NAV_STATUS: Record<number, string> = {
  0: 'Under way',
  1: 'At anchor',
  2: 'Not under command',
  3: 'Restricted',
  4: 'Constrained',
  5: 'Moored',
  6: 'Aground',
  7: 'Fishing',
  8: 'Sailing',
};

export default function Maritime() {
  const [data, setData] = useState<VesselsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maltaOnly, setMaltaOnly] = useState(true);
  const [ageSeconds, setAgeSeconds] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const res = await fetch('/api/ais/vessels');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load vessel data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!data?.timestamp) return;
    setAgeSeconds(Math.floor((Date.now() - data.timestamp) / 1000));
  }, [data]);

  const vessels = data?.vessels || [];
  const filtered = maltaOnly ? vessels.filter(isInMaltaBbox) : vessels;
  const staleVessels = filtered.filter(v => v.positionAge > 3600);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Maritime Domain Awareness</h1>
          <p className="text-sm text-white/50 mt-1">
            Global vessel positions via AIS · {data?.dataSource || 'terrestrial'} source
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMaltaOnly(!maltaOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              maltaOnly ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-white/10 text-white/70 border border-white/10'
            }`}
          >
            {maltaOnly ? 'Malta Zone' : 'Global View'}
          </button>
          {data?.timestamp && (
            <span className="text-xs text-white/40 font-mono">
              {new Date(data.timestamp).toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-panel p-4 animate-pulse">
              <div className="h-5 bg-white/10 rounded w-3/4 mb-3" />
              <div className="h-4 bg-white/5 rounded w-1/2 mb-2" />
              <div className="h-4 bg-white/5 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="glass-panel p-8 text-center">
          <p className="text-red-400 text-lg font-medium mb-2">Connection Error</p>
          <p className="text-white/50 text-sm mb-4">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); fetch('/api/ais/vessels').then(r => r.json()).then(setData).catch(e => setError(e.message)).finally(() => setLoading(false)); }}
            className="px-4 py-2 bg-gold/20 text-gold rounded-lg text-sm hover:bg-gold/30 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 && !maltaOnly ? (
        <div className="glass-panel p-8 text-center">
          <ShipIcon />
          <p className="text-white/50 text-lg font-medium mb-1">No vessel data available</p>
          <p className="text-white/30 text-sm">{data?.error || 'Vessel API returned empty results'}</p>
        </div>
      ) : filtered.length === 0 && maltaOnly ? (
        <div className="glass-panel p-8 text-center">
          <ShipIcon />
          <p className="text-white/50 text-lg font-medium mb-1">No vessels in Malta zone</p>
          <p className="text-white/30 text-sm">Switch to Global View to see all tracked vessels</p>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="glass-panel p-4">
              <div className="hud-label">Total Vessels</div>
              <div className="hud-value text-2xl">{filtered.length}</div>
            </div>
            <div className="glass-panel p-4">
              <div className="hud-label">Data Source</div>
              <div className="hud-value text-lg capitalize">{data?.dataSource || 'unknown'}</div>
            </div>
            <div className="glass-panel p-4">
              <div className="hud-label">Freshness</div>
              <div className="hud-value text-lg">{ageSeconds !== null ? formatAge(ageSeconds) : '-'}</div>
            </div>
            <div className="glass-panel p-4">
              <div className="hud-label">Stale Tracks</div>
              <div className="hud-value text-lg text-orange-400">{staleVessels.length}</div>
            </div>
          </div>

          <div className="space-y-2">
            {filtered.slice(0, 50).map(v => (
              <div key={v.mmsi} className="glass-panel-sm p-3 flex items-center justify-between hover:border-gold/30 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white truncate">{v.name}</span>
                    <span className="text-xs text-white/40 font-mono">MMSI {v.mmsi}</span>
                    {isInMaltaBbox(v) && <span className="text-xs px-1.5 py-0.5 bg-gold/20 text-gold rounded">Malta</span>}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-white/50 mt-0.5">
                    <span>{v.lat.toFixed(3)}N, {v.lng.toFixed(3)}E</span>
                    <span>SOG {v.sog.toFixed(1)} kn</span>
                    <span>COG {v.cog.toFixed(0)}°</span>
                    <span>{NAV_STATUS[v.navStatus] || `Status ${v.navStatus}`}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <span className={`text-xs ${v.positionAge > 3600 ? 'text-orange-400' : 'text-white/40'}`}>
                    {formatAge(v.positionAge)}
                  </span>
                  {v.positionAge > 3600 && <span className="hud-label text-orange-400">STALE</span>}
                </div>
              </div>
            ))}
            {filtered.length > 50 && (
              <p className="text-center text-white/30 text-sm pt-2">Showing 50 of {filtered.length} vessels</p>
            )}
          </div>
        </div>
      )}

      <div className="text-xs text-white/30 flex items-center gap-4 pt-2 border-t border-white/5">
        <span>Scope: {maltaOnly ? 'Malta zone (35.6-36.2N, 14.0-14.8E)' : 'Global (configured choke points)'}</span>
        <span>API: /api/ais/vessels</span>
        {data?.error && <span className="text-yellow-400/60">Warning: {data.error}</span>}
      </div>
    </div>
  );
}

function ShipIcon() {
  return (
    <svg className="w-12 h-12 mx-auto mb-3 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  );
}
