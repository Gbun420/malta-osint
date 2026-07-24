'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Ship, Plane, Waves, Newspaper, Activity, RefreshCw } from 'lucide-react';

import { useAISStream } from '@/hooks/useAISStream';
import MaltaLayerPanel from '@/components/malta/MaltaLayerPanel';

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
  const [marineWeather, setMarineWeather] = useState<any>(null);
  const [earthquakes, setEarthquakes] = useState<any[]>([]);
  const [fires, setFires] = useState<any[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [omrg, setOmrg] = useState<any>(null);
  const [aisStatus, setAisStatus] = useState<'connecting' | 'connected' | 'error' | 'disabled'>('disabled');
  const [selectedEntity, setSelectedEntity] = useState<any>(null);
  const [showSplash, setShowSplash] = useState(true);

  // AIS WebSocket for vessels
  const { vessels: vesselsMap, vesselCount, isConnected, status: aisWsStatus } = useAISStream({
    enabled: activeLayers.vessels,
  });

  useEffect(() => {
    setAisStatus(isConnected ? 'connected' : aisWsStatus);
  }, [isConnected, aisWsStatus]);

  // Splash screen
  useEffect(() => {
    const timer = setTimeout(() => setShowSplash(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Fetch data from Malta API
  const fetchMaltaData = useCallback(async () => {
    try {
      const res = await fetch('/api/malta/live');
      if (res.ok) {
        const data = await res.json();
        if (data.flights) setFlights(data.flights);
        if (data.marine) setMarineWeather(data.marine);
        if (data.earthquakes) setEarthquakes(data.earthquakes);
        if (data.fires) setFires(data.fires);
        if (data.news) setNews(data.news);
        if (data.omrg) setOmrg(data.omrg);
      }
    } catch (err) {
      console.warn('Failed to fetch Malta data:', err);
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

  // Convert Map to array for rendering
  const vesselsArray = Array.from(vesselsMap.values());

  // Combine vessel data for map
  const allVessels = vesselsArray.map(v => ({
    ...v,
    type: 'vessel',
    icon: 'ship',
  }));

  const allFlights = flights.map(f => ({
    ...f,
    type: 'flight',
    icon: 'plane',
  }));

  const allEntities = [
    ...allVessels,
    ...allFlights,
    ...earthquakes.map(e => ({ ...e, type: 'earthquake', icon: 'fire' })),
    ...fires.map(f => ({ ...f, type: 'fire', icon: 'fire' })),
    ...news.map(n => ({ ...n, type: 'news', icon: 'news' })),
  ];

  return (
    <main className="fixed inset-0 w-full h-full bg-[var(--bg-void)] overflow-hidden">
      {/* Splash Screen */}
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

      {/* Map */}
      <MaltaMap
        vessels={allVessels}
        flights={allFlights}
        earthquakes={earthquakes}
        fires={fires}
        news={news}
        marineWeather={marineWeather}
        omrg={omrg}
        activeLayers={activeLayers}
        onEntityClick={setSelectedEntity}
      />

      {/* Layer Panel */}
      <MaltaLayerPanel activeLayers={activeLayers} onToggle={toggleLayer} />

      {/* Header */}
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

      {/* Status Bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute top-4 right-4 z-[200] pointer-events-none flex items-center gap-4 text-[9px] font-mono tracking-widest text-[var(--text-muted)]"
      >
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${
            aisStatus === 'connected' ? 'bg-[var(--alert-green)]' :
            aisStatus === 'connecting' ? 'bg-[var(--alert-orange)] animate-pulse' :
            'bg-[var(--alert-red)]'
          }`} />
          <span>AIS: {aisStatus.toUpperCase()}</span>
        </div>
        <span>VESSELS: <span className="text-[var(--cyan-primary)] font-bold">{vesselsArray.length}</span></span>
        <span>FEEDS: <span className="text-[var(--gold-primary)] font-bold">{Object.values(activeLayers).filter(Boolean).length}</span></span>
      </motion.div>

      {/* Quick Stats */}
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Plane className="w-3 h-3 text-[var(--gold-primary)]" />
              <span className="text-[9px] font-mono text-[var(--text-muted)]">FLIGHTS</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-[var(--gold-primary)]">{flights.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-[var(--alert-orange)]" />
              <span className="text-[9px] font-mono text-[var(--text-muted)]">EARTHQUAKES</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-[var(--alert-orange)]">{earthquakes.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Newspaper className="w-3 h-3 text-[var(--alert-red)]" />
              <span className="text-[9px] font-mono text-[var(--text-muted)]">NEWS</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-[var(--alert-red)]">{news.length}</span>
          </div>
        </div>
      </motion.div>

      {/* Refresh Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        onClick={fetchMaltaData}
        className="absolute bottom-4 right-4 z-[200] glass-panel p-3 hover:border-[var(--gold-primary)]/40 transition-colors"
      >
        <RefreshCw className="w-4 h-4 text-[var(--gold-primary)]" />
      </motion.button>

      {/* Entity Detail Panel */}
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
