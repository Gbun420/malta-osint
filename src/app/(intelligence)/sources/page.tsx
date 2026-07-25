'use client';

import { useState } from 'react';
import { RefreshCw, Copy, Filter } from 'lucide-react';
import { SourceHealthBadge } from '@/components/intelligence/SourceHealthBadge';

const SOURCE_HEALTH_DATA = [
  { state: 'healthy' as const, name: 'ADS-B (adsb-lol)', latency: 120, records: 1247, lastSuccess: '2 min ago' },
  { state: 'healthy' as const, name: 'AIS (aisstream)', latency: 340, records: 89, lastSuccess: '1 min ago' },
  { state: 'stale' as const, name: 'FIRMS (nasa-firms)', latency: 0, records: 0, lastSuccess: '45 min ago' },
  { state: 'unconfigured' as const, name: 'ReliefWeb (reliefweb)', latency: 0, records: 0, lastSuccess: null },
  { state: 'degraded' as const, name: 'USGS Earthquakes (usgs-earthquake)', latency: 890, records: 3, lastSuccess: '12 min ago' },
  { state: 'healthy-empty' as const, name: 'EEAS (eeas)', latency: 210, records: 0, lastSuccess: '20 min ago' },
];

export default function SourceHealth() {
  const [filter, setFilter] = useState<'all' | 'healthy' | 'stale' | 'error' | 'unconfigured'>('all');

  const filtered = filter === 'all' ? SOURCE_HEALTH_DATA : SOURCE_HEALTH_DATA.filter(s => s.state === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Source Health</h1>
        <div className="flex gap-2">
          <button className="flex items-center gap-1 rounded-md bg-gold/10 px-3 py-1.5 text-xs text-gold hover:bg-gold/20">
            <RefreshCw className="h-3 w-3" /> Refresh All
          </button>
          <button className="flex items-center gap-1 rounded-md bg-gold/10 px-3 py-1.5 text-xs text-gold hover:bg-gold/20" onClick={() => {
            const text = SOURCE_HEALTH_DATA.map(s => `${s.name}: ${s.state} (${s.records} records, ${s.latency}ms)`).join('\n');
            navigator.clipboard.writeText(text);
          }}>
            <Copy className="h-3 w-3" /> Copy Diagnostic
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {(['all', 'healthy', 'stale', 'error', 'unconfigured'] as const).map(f => (
          <button
            key={f}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${filter === f ? 'bg-gold/20 text-gold' : 'bg-white/5 text-white/50 hover:text-white/80'}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(source => (
          <div key={source.name} className="flex items-center justify-between rounded-lg border border-gold/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <SourceHealthBadge state={source.state} sourceName={source.name} />
              {source.lastSuccess && (
                <span className="text-xs text-white/40">Last success: {source.lastSuccess}</span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-white/40">
              <span>{source.records} records</span>
              <span>{source.latency}ms</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}