'use client';

import { useState, useEffect, useRef } from 'react';
import type { MaltaLiveResponse, MaltaFlight, SourceMeta } from '@/lib/malta-live-types';

const MALTA_MED_BBOX = { north: 37, south: 34, east: 16, west: 12 };

function isInMaltaMed(f: MaltaFlight): boolean {
  return f.lat <= MALTA_MED_BBOX.north && f.lat >= MALTA_MED_BBOX.south &&
         f.lng <= MALTA_MED_BBOX.east && f.lng >= MALTA_MED_BBOX.west;
}

function formatAlt(m: number | null): string {
  if (m === null) return '—';
  if (m < 100) return 'GND';
  if (m < 1000) return `${m} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

function formatSpeed(kmh: number | null): string {
  if (kmh === null) return '—';
  return `${kmh} km/h`;
}

function staleAge(seen: number): number {
  return Math.floor((Date.now() - seen) / 1000);
}

export default function Aviation() {
  const [data, setData] = useState<MaltaLiveResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maltaRegion, setMaltaRegion] = useState(true);
  const [hideStale, setHideStale] = useState(false);
  const nowRef = useRef(Date.now());

  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        const res = await fetch('/api/malta/live');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        setData(json as MaltaLiveResponse);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load aviation data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const flights = data?.aviation?.flights || [];
  const filtered = flights.filter(f => {
    if (maltaRegion && !isInMaltaMed(f)) return false;
    if (hideStale && staleAge(f.seen) > 300) return false;
    return true;
  });

  const staleCount = filtered.filter(f => staleAge(f.seen) > 120).length;
  const aviationMeta: SourceMeta | undefined = data?.meta?.sources?.aviation;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Aviation Tracking</h1>
          <p className="text-sm text-white/50 mt-1">
            Global aircraft positions via ADSB.lol · {aviationMeta?.scope || 'multi-region'} scope
          </p>
        </div>
        <div className="flex items-center gap-2">
          {aviationMeta?.coverageLabel && (
            <span className="text-xs text-cyan-400/70 font-mono truncate max-w-[200px]" title={aviationMeta.coverageLabel}>
              {aviationMeta.coverageLabel}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setMaltaRegion(!maltaRegion)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            maltaRegion ? 'bg-gold/20 text-gold border border-gold/30' : 'bg-white/10 text-white/70 border border-white/10'
          }`}
        >
          {maltaRegion ? 'Malta-Med Region' : 'Global View'}
        </button>
        <button
          onClick={() => setHideStale(!hideStale)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            hideStale ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-white/10 text-white/70 border border-white/10'
          }`}
        >
          Hide Stale
        </button>
        <span className="text-xs text-white/30 ml-auto">
          {new Date(data?.timestamp || nowRef.current).toLocaleTimeString()}
        </span>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-panel p-4 animate-pulse">
              <div className="h-5 bg-white/10 rounded w-1/2 mb-3" />
              <div className="h-4 bg-white/5 rounded w-3/4 mb-2" />
              <div className="h-4 bg-white/5 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="glass-panel p-8 text-center">
          <p className="text-red-400 text-lg font-medium mb-2">Connection Error</p>
          <p className="text-white/50 text-sm mb-4">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); fetch('/api/malta/live').then(r => r.json()).then(d => setData(d as MaltaLiveResponse)).catch(e => setError(e.message)).finally(() => setLoading(false)); }}
            className="px-4 py-2 bg-gold/20 text-gold rounded-lg text-sm hover:bg-gold/30 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <PlaneIcon />
          <p className="text-white/50 text-lg font-medium mb-1">No aircraft in view</p>
          <p className="text-white/30 text-sm">
            {maltaRegion ? 'No flights currently tracked in the Malta-Med region. Switch to Global View.' : 'All aircraft filtered out.'}
          </p>
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="glass-panel p-4">
              <div className="hud-label">Aircraft Tracked</div>
              <div className="hud-value text-2xl">{filtered.length}</div>
            </div>
            <div className="glass-panel p-4">
              <div className="hud-label">Stale Tracks</div>
              <div className="hud-value text-lg text-orange-400">{staleCount}</div>
            </div>
            <div className="glass-panel p-4">
              <div className="hud-label">Source</div>
              <div className="hud-value text-lg capitalize">{aviationMeta?.status || 'unknown'}</div>
            </div>
            <div className="glass-panel p-4">
              <div className="hud-label">Latency</div>
              <div className="hud-value text-lg">{aviationMeta?.latencyMs != null ? `${aviationMeta.latencyMs}ms` : '—'}</div>
            </div>
          </div>

          <div className="space-y-2">
            {filtered.slice(0, 60).map(f => {
              const age = staleAge(f.seen);
              return (
                <div key={f.hex} className="glass-panel-sm p-3 flex items-center justify-between hover:border-gold/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">{f.flight || f.hex}</span>
                      <span className="text-xs text-white/40 font-mono">{f.hex.slice(0, 8)}</span>
                      {isInMaltaMed(f) && <span className="text-xs px-1.5 py-0.5 bg-gold/20 text-gold rounded">Med</span>}
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        f.category === 'A0' || f.category === 'A1' ? 'bg-blue-500/20 text-blue-400' :
                        f.category === 'A2' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-white/10 text-white/50'
                      }`}>
                        {f.category || 'unk'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-white/50 mt-0.5">
                      <span>{f.lat.toFixed(3)}, {f.lng.toFixed(3)}</span>
                      <span>Alt {formatAlt(f.alt)}</span>
                      <span>GS {formatSpeed(f.gs)}</span>
                      <span>HDG {f.track}°</span>
                      {f.reg && <span>{f.reg}</span>}
                      {f.type && <span className="text-white/30">{f.type}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <span className={`text-xs ${age > 120 ? 'text-orange-400' : 'text-white/40'}`}>
                      {age > 300 ? `${Math.floor(age / 60)}m ago` : `${age}s ago`}
                    </span>
                    {age > 300 && <span className="hud-label text-orange-400">STALE</span>}
                    {f.alt != null && f.alt < 100 && <span className="text-xs text-green-400">GND</span>}
                  </div>
                </div>
              );
            })}
            {filtered.length > 60 && (
              <p className="text-center text-white/30 text-sm pt-2">Showing 60 of {filtered.length} aircraft</p>
            )}
          </div>
        </div>
      )}

      <div className="text-xs text-white/30 flex items-center gap-4 pt-2 border-t border-white/5">
        <span>Scope: {maltaRegion ? 'Malta-Med (34-37N, 12-16E)' : 'Global (ADSB.lol 6-region sample)'}</span>
        <span>Source: /api/malta/live · aviation</span>
        {aviationMeta?.status === 'error' && <span className="text-red-400/60">Source degraded</span>}
      </div>
    </div>
  );
}

function PlaneIcon() {
  return (
    <svg className="w-12 h-12 mx-auto mb-3 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 19V5m0 0l-7 7m7-7l7 7" />
    </svg>
  );
}
