'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Ship, Plane, Activity, Newspaper, RefreshCw } from 'lucide-react';

import { useAISStream } from '@/hooks/useAISStream';
import MaltaLayerPanel from '@/components/malta/MaltaLayerPanel';
import type { MaltaLiveResponse, SourceMeta } from '@/lib/malta-live-types';

const MaltaMap = dynamic(() => import('@/components/malta/MaltaMap'), { ssr: false });

export default function MaltaDashboard() {
  const [activeLayers, setActiveLayers] = useState<Record<string, boolean>>({
    vessels: true,
    omrg: false,
    flights: false,
    marine_weather: false,
    earthquakes: true,
    fires: false,
    news: true,
  });

  const [flights, setFlights] = useState<any[]>([]);
  const [earthquakes, setEarthquakes] = useState<any[]>([]);
  const [fires, setFires] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [sourceMeta, setSourceMeta] = useState<Record<string, SourceMeta> | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const lastGoodDataRef = useRef({
    flights: [] as any[],
    earthquakes: [] as any[],
    fires: [] as any[],
    news: [] as any[],
  });

  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [showSplash, setShowSplash] = useState(true);

  const { vessels: vesselsMap, vesselCount, isConnected, status: aisWsStatus } = useAISStream({
    enabled: activeLayers.vessels,
  });

  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const fetchMaltaData = useCallback(async () => {
    try {
      const res = await fetch('/api/malta/live', { cache: 'no-store' });
      if (!res.ok) {
        throw new Error(`Malta live API returned ${res.status}`);
      }
      const data: MaltaLiveResponse = await res.json();

      const newFlights = data.aviation?.flights ?? [];
      const newEarthquakes = data.environment?.seismic ?? [];
      const newFires = data.environment?.fires ?? [];
      const newNews = data.intelligence?.news ?? [];

      setFlights(newFlights);
      setEarthquakes(newEarthquakes);
      setFires(newFires);
      setNews(newNews);
      setSourceMeta(data.meta?.sources ?? null);
      setLastUpdated(data.timestamp ?? new Date().toISOString());

      lastGoodDataRef.current = {
        flights: newFlights.length ? newFlights : lastGoodDataRef.current.flights,
        earthquakes: newEarthquakes.length ? newEarthquakes : lastGoodDataRef.current.earthquakes,
        fires: newFires.length ? newFires : lastGoodDataRef.current.fires,
        news: newNews.length ? newNews : lastGoodDataRef.current.news,
      };
    } catch (err) {
      console.error('[Malta Dashboard] Live-data fetch failed:', err);
      const cached = lastGoodDataRef.current;
      setFlights(cached.flights);
      setEarthquakes(cached.earthquakes);
      setFires(cached.fires);
      setNews(cached.news);
    }
  }, []);

  useEffect(() => {
    fetchMaltaData();
    const interval = setInterval(fetchMaltaData, 60000);
    return () => clearInterval(interval);
  }, [fetchMaltaData]);

  const toggleLayer = useCallback((key: string) => {
    setActiveLayers(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const vesselsArray = Array.from(vesselsMap.values());

  const formatSourceStatus = (key: string): { label: string; color: string } => {
    const meta = sourceMeta?.[key];
    if (!meta) return { label: 'UNKNOWN', color: 'var(--text-muted)' };
    switch (meta.status) {
      case 'ok': return { label: `OK (${meta.count})`, color: 'var(--alert-green)' };
      case 'empty': return { label: 'EMPTY', color: 'var(--alert-orange)' };
      case 'error': return { label: 'ERROR', color: 'var(--alert-red)' };
      case 'unconfigured': return { label: 'N/A', color: 'var(--text-muted)' };
    }
  };

  return (
    <main className="fixed inset-0 w-full h-full bg-[var(--bg-void)] overflow-hidden">
      {showSplash && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 z-[999] flex flex-col items-center justify-center bg-[var(--bg-void)]"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-full border-2 border-[var(--gold-primary)] flex items-center justify-center">
              <Activity className="w-8 h-8 text-[var(--gold-primary)]" />
            </div>
            <h1 className="text-xl font-bold tracking-[0.4em] text-[var(--gold-primary)] font-mono mb-2">
              MALTA OSINT
            </h1>
            <p className="text-[10px] font-mono tracking-[0.3em] text-[var(--text-muted)]">
              INITIALIZING SYSTEMS...
            </p>
          </motion.div>
        </motion.div>
      )}

      <MaltaMap
        data={{
          environment: {
            seismic: earthquakes,
            fires: fires,
          },
          aviation: {
            flights: flights,
          },
        }}
        vessels={vesselsMap}
        vesselCount={vesselCount}
        isAISConnected={isConnected}
        activeLayers={activeLayers}
        onEntityClick={setSelectedEntity}
      />

      <MaltaLayerPanel activeLayers={activeLayers} onToggle={toggleLayer} />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute top-4 left-4 z-[200] pointer-events-none"
      >
        <div className="flex items-baseline gap-2">
          <h1 className="text-xl font-bold tracking-[0.4em] text-[var(--gold-primary)] font-mono">
            MALTA OSINT
          </h1>
          <span className="text-[10px] text-[var(--text-muted)] font-mono tracking-[0.15em]">
            LIVE INTELLIGENCE
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute top-4 right-4 z-[200] pointer-events-none flex items-center gap-4 text-[9px] font-mono tracking-widest text-[var(--text-muted)]"
      >
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${
            aisWsStatus === 'connected' ? 'bg-[var(--alert-green)]' :
            aisWsStatus === 'connecting' ? 'bg-[var(--alert-orange)] animate-pulse' :
            'bg-[var(--alert-red)]'
          }`} />
          <span>AIS: {aisWsStatus === 'disabled' ? 'N/A' : aisWsStatus.toUpperCase()}</span>
        </div>
        <span>VESSELS: <span className="text-[var(--cyan-primary)] font-bold">{vesselsArray.length}</span></span>
        <span>FEEDS: <span className="text-[var(--gold-primary)] font-bold">{Object.values(activeLayers).filter(Boolean).length}</span></span>
        {lastUpdated && (
          <span className="text-[8px] opacity-60">
            {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7 }}
        className="absolute top-20 right-4 z-[200] glass-panel p-3 w-48"
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Ship className="w-3 h-3 text-[var(--cyan-primary)]" />
              <span className="text-[9px] font-mono text-[var(--text-muted)]">VESSELS</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-[var(--cyan-primary)]">{vesselsArray.length}</span>
          </div>
          <div className="flex items-center justify-between" title={`Source: ${formatSourceStatus('aviation').label}`}>
            <div className="flex items-center gap-1.5">
              <Plane className="w-3 h-3 text-[var(--gold-primary)]" />
              <span className="text-[9px] font-mono text-[var(--text-muted)]">FLIGHTS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono font-bold text-[var(--gold-primary)]">{flights.length}</span>
              {sourceMeta?.aviation && sourceMeta.aviation.status !== 'ok' && (
                <span className="text-[7px] font-mono px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-surface)', color: formatSourceStatus('aviation').color }}>
                  {formatSourceStatus('aviation').label}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between" title={`Source: ${formatSourceStatus('seismic').label}`}>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-[var(--alert-orange)]" />
              <span className="text-[9px] font-mono text-[var(--text-muted)]">EARTHQUAKES</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono font-bold text-[var(--alert-orange)]">{earthquakes.length}</span>
              {sourceMeta?.seismic && sourceMeta.seismic.status !== 'ok' && (
                <span className="text-[7px] font-mono px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-surface)', color: formatSourceStatus('seismic').color }}>
                  {formatSourceStatus('seismic').label}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between" title={`Source: ${formatSourceStatus('fires').label}`}>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-[var(--alert-red)]" />
              <span className="text-[9px] font-mono text-[var(--text-muted)]">FIRES</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono font-bold text-[var(--alert-red)]">{fires.length}</span>
              {sourceMeta?.fires && sourceMeta.fires.status !== 'ok' && (
                <span className="text-[7px] font-mono px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-surface)', color: formatSourceStatus('fires').color }}>
                  {formatSourceStatus('fires').label}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between" title={`Source: ${formatSourceStatus('news').label}`}>
            <div className="flex items-center gap-1.5">
              <Newspaper className="w-3 h-3 text-[var(--text-muted)]" />
              <span className="text-[9px] font-mono text-[var(--text-muted)]">NEWS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono font-bold text-[var(--text-muted)]">{news.length}</span>
              {sourceMeta?.news && sourceMeta.news.status !== 'ok' && (
                <span className="text-[7px] font-mono px-1 py-0.5 rounded" style={{ backgroundColor: 'var(--bg-surface)', color: formatSourceStatus('news').color }}>
                  {formatSourceStatus('news').label}
                </span>
              )}
            </div>
          </div>
          <div className="border-t border-[var(--border-subtle)] pt-2 mt-2">
            <div className="text-[8px] font-mono text-[var(--text-muted)] tracking-widest">
              {lastUpdated ? `UPDATED ${new Date(lastUpdated).toLocaleTimeString()}` : 'LOADING...'}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={fetchMaltaData}
        className="absolute bottom-4 right-4 z-[200] glass-panel p-3 hover:border-[var(--gold-primary)]/40 transition-colors"
      >
        <RefreshCw className="w-4 h-4 text-[var(--gold-primary)]" />
      </motion.button>

      {selectedEntity && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="absolute bottom-4 left-4 z-[200] glass-panel p-4 w-72"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono tracking-[0.15em] text-[var(--text-muted)]">
              {selectedEntity.type?.toUpperCase() || 'ENTITY'}
            </span>
            <button
              onClick={() => setSelectedEntity(null)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              ×
            </button>
          </div>
          <div className="space-y-1">
            {selectedEntity.name && (
              <div className="text-[11px] font-mono text-[var(--text-primary)]">{selectedEntity.name}</div>
            )}
            {selectedEntity.callsign && (
              <div className="text-[9px] font-mono text-[var(--cyan-primary)]">CALLSIGN: {selectedEntity.callsign}</div>
            )}
            {selectedEntity.mmsi && (
              <div className="text-[9px] font-mono text-[var(--cyan-primary)]">MMSI: {selectedEntity.mmsi}</div>
            )}
            {selectedEntity.speed !== undefined && (
              <div className="text-[9px] font-mono text-[var(--text-muted)]">SPEED: {selectedEntity.speed} kn</div>
            )}
            {selectedEntity.heading !== undefined && (
              <div className="text-[9px] font-mono text-[var(--text-muted)]">HDG: {selectedEntity.heading}°</div>
            )}
            {selectedEntity.magnitude && (
              <div className="text-[9px] font-mono text-[var(--alert-orange)]">MAG: {selectedEntity.magnitude}</div>
            )}
            {selectedEntity.title && (
              <div className="text-[9px] font-mono text-[var(--text-secondary)] line-clamp-2">{selectedEntity.title}</div>
            )}
          </div>
        </motion.div>
      )}
    </main>
  );
}
