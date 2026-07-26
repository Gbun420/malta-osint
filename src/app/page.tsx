'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Ship, Plane, Activity, Newspaper, RefreshCw, Zap, Menu, X, Map, Globe, Radio, Shield, Briefcase, Headphones, FileText, AlertTriangle } from 'lucide-react';

import { useAISStream } from '@/hooks/useAISStream';
import MaltaLayerPanel from '@/components/malta/MaltaLayerPanel';
import SmartSystemPanel from '@/components/SmartSystemPanel';
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
  const [showSmartSystem, setShowSmartSystem] = useState(false);
  const [showNav, setShowNav] = useState(false);

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
      console.error('[Malta OSINT] Live-data fetch failed:', err);
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

  const timeStr = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('en-US', { hour12: false })
    : '--:--:--';

  return (
    <main className="fixed inset-0 w-full h-full bg-[var(--bg-void)] overflow-hidden">
      {showSplash && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 z-[999] flex flex-col items-center justify-center bg-[var(--bg-void)]"
        >
          <div className="relative flex items-center justify-center mb-8">
            <div className="splash-ring splash-ring--outer" />
            <div className="splash-ring splash-ring--mid" />
            <div className="splash-ring splash-ring--inner" />
            <div className="splash-ring splash-ring--core" />
          </div>
          <div className="splash-scanline" />
          <h1 className="text-xl font-bold tracking-[0.4em] text-[var(--gold-primary)] font-mono mb-3 gotham-enter">
            MALTA OSINT
          </h1>
          <div className="w-48 splash-progress-bar mb-3" />
          <p className="text-[10px] font-mono tracking-[0.3em] text-[var(--text-muted)] gotham-enter gotham-enter-delay-1">
            GLOBAL INTELLIGENCE — MALTA FOCUS
          </p>
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

      <header className="absolute top-0 left-0 right-0 z-[300] gotham-command-bar">
        <div className="gotham-command-bar__section">
          <button
            onClick={() => setShowNav(s => !s)}
            className="gotham-command-bar__action mr-2"
            title="Navigation menu"
          >
            {showNav ? <X className="w-3.5 h-3.5" /> : <Menu className="w-3.5 h-3.5" />}
          </button>
          <span className="gotham-command-bar__title">MALTA OSINT</span>
          <span className="text-[9px] text-[var(--text-muted)] font-mono tracking-[0.15em]">
            GLOBAL INTELLIGENCE
          </span>
        </div>
        <div className="gotham-command-bar__section">
          <div className="flex items-center gap-1.5">
            <div className={`w-1.5 h-1.5 rounded-full ${
              aisWsStatus === 'connected' ? 'bg-[var(--alert-green)]' :
              aisWsStatus === 'connecting' ? 'bg-[var(--alert-orange)] animate-pulse' :
              'bg-[var(--alert-red)]'
            }`} />
            <span className="text-[9px] font-mono text-[var(--text-secondary)]">
              AIS: {aisWsStatus === 'disabled' ? 'N/A' : aisWsStatus.toUpperCase()}
            </span>
          </div>
          <span className="text-[9px] font-mono text-[var(--text-secondary)]">
            VESSELS: <span className="text-[var(--cyan-primary)]">{vesselsArray.length}</span>
          </span>
          <span className="text-[9px] font-mono text-[var(--text-secondary)]">
            FEEDS: <span className="text-[var(--gold-primary)]">{Object.values(activeLayers).filter(Boolean).length}</span>
          </span>
          <span className="text-[9px] font-mono text-[var(--text-muted)] tabular-nums">{timeStr} UTC</span>
          <button
            onClick={() => setShowSmartSystem(s => !s)}
            className={`gotham-command-bar__action ${showSmartSystem ? '!border-[var(--gold-primary)] !text-[var(--gold-primary)] !shadow-[0_0_12px_rgba(212,175,55,0.15)]' : ''}`}
            title="Smart System AI"
          >
            <Zap className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={fetchMaltaData}
            className="gotham-command-bar__action"
            title="Refresh data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {showNav && (
          <motion.nav
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute top-[44px] left-2 z-[300] glass-panel p-2 w-48"
          >
            {(() => {
              const navItems = [
                { href: '/dashboard', label: 'Command Centre', icon: Map },
                { href: '/brief', label: "Minister's Brief", icon: FileText },
                { href: '/malta-impact', label: 'Malta Impact', icon: Shield },
                { hr: true },
                { href: '/events', label: 'Global Events', icon: Radio },
                { href: '/countries', label: 'Countries', icon: Globe },
                { hr: true },
                { href: '/maritime', label: 'Maritime', icon: Ship },
                { href: '/aviation', label: 'Aviation', icon: Plane },
                { hr: true },
                { href: '/sanctions', label: 'Sanctions', icon: Activity },
                { hr: true },
                { href: '/sources', label: 'Source Health', icon: Globe },
                { href: '/review', label: 'Review Queue', icon: Briefcase },
                { href: '/audio', label: 'Audio Intel', icon: Headphones },
                { href: '/docs', label: 'API Docs', icon: FileText },
              ];
              return navItems.map((item: any, idx: number) =>
                item.hr ? (
                  <div key={idx} className="border-t border-[var(--border-secondary)] my-1" />
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowNav(false)}
                    className="flex items-center gap-2 px-3 py-2 text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded transition-colors"
                  >
                    <item.icon className="w-3 h-3 text-[var(--gold-primary)]" />
                    {item.label}
                  </Link>
                )
              );
            })()}
          </motion.nav>
        )}
      </AnimatePresence>

      <MaltaLayerPanel activeLayers={activeLayers} onToggle={toggleLayer} />

      <motion.aside
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7 }}
        className="absolute top-[60px] right-4 z-[200] glass-panel p-3 w-56"
      >
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Ship className="w-3 h-3 text-[var(--cyan-primary)]" />
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                {sourceMeta?.marine?.coverageLabel ? `${sourceMeta.marine.coverageLabel.toUpperCase()} VESSELS` : 'VESSELS'}
              </span>
            </div>
            <span className="text-[13px] font-mono font-bold text-[var(--cyan-primary)]">{vesselsArray.length}</span>
          </div>
          <div className="flex items-center justify-between" title={`Source: ${formatSourceStatus('aviation').label}`}>
            <div className="flex items-center gap-1.5">
              <Plane className="w-3 h-3 text-[var(--gold-primary)]" />
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                {sourceMeta?.aviation?.coverageLabel ? `${sourceMeta.aviation.coverageLabel.toUpperCase()} AIRCRAFT` : 'AIRCRAFT'}
              </span>
            </div>
            <span className="text-[13px] font-mono font-bold text-[var(--gold-primary)]">{flights.length}</span>
          </div>
          <div className="flex items-center justify-between" title={`Source: ${formatSourceStatus('seismic').label}`}>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-[var(--alert-orange)]" />
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                {sourceMeta?.seismic?.coverageLabel ? `${sourceMeta.seismic.coverageLabel.toUpperCase()} SEISMIC` : 'SEISMIC'}
              </span>
            </div>
            <span className="text-[13px] font-mono font-bold text-[var(--alert-orange)]">{earthquakes.length}</span>
          </div>
          <div className="flex items-center justify-between" title={`Source: ${formatSourceStatus('fires').label}`}>
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-[var(--alert-red)]" />
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                {sourceMeta?.fires?.coverageLabel ? `${sourceMeta.fires.coverageLabel.toUpperCase()} FIRES` : 'FIRES'}
              </span>
            </div>
            <span className="text-[13px] font-mono font-bold text-[var(--alert-red)]">{fires.length}</span>
          </div>
          <div className="flex items-center justify-between" title={`Source: ${formatSourceStatus('news').label}`}>
            <div className="flex items-center gap-1.5">
              <Newspaper className="w-3 h-3 text-[var(--text-muted)]" />
              <span className="text-[10px] font-mono text-[var(--text-muted)]">
                {sourceMeta?.news?.coverageLabel ? `${sourceMeta.news.coverageLabel.toUpperCase()} NEWS` : 'NEWS'}
              </span>
            </div>
            <span className="text-[13px] font-mono font-bold text-[var(--text-muted)]">{news.length}</span>
          </div>
          <div className="border-t border-[var(--border-secondary)] pt-2 mt-2">
            <div className="text-[8px] font-mono text-[var(--text-muted)] tracking-widest">
              UPDATED {timeStr} UTC
            </div>
          </div>
        </div>
      </motion.aside>

      {showSmartSystem && (
        <div className="absolute top-[60px] right-4 z-[250]" style={{ width: '340px' }}>
          <SmartSystemPanel />
        </div>
      )}

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

      {news.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 z-[200] glass-panel-sm rounded-none border-x-0 border-b-0 px-4 py-1.5 overflow-hidden pointer-events-none">
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-[8px] font-mono tracking-[0.2em] text-[var(--gold-primary)]">NEWS</span>
            <div className="overflow-hidden flex-1">
              <div className="animate-ticker flex gap-12 whitespace-nowrap">
                <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                  {news.map((a: any) => a.title).filter(Boolean).join('  ●  ')}
                </span>
                <span className="text-[10px] font-mono text-[var(--text-secondary)]">
                  {news.map((a: any) => a.title).filter(Boolean).join('  ●  ')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
