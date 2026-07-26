'use client';

import { useState, useEffect } from 'react';
import { SourceHealthRecord } from '@/intelligence/schemas/registry';
import { fetchSourceHealth } from '@/services/intelligence/sourcesService';

function computeOverallStatus(sources: SourceHealthRecord[]): { label: string; tone: 'green' | 'red' | 'orange' | 'muted' } {
  if (sources.length === 0) return { label: 'No data', tone: 'muted' };
  const healthy = sources.filter(s => s.state === 'healthy').length;
  const degraded = sources.filter(s => s.state === 'degraded' || s.state === 'rate-limited').length;
  const error = sources.filter(s => s.state === 'error' || s.state === 'authentication-required' || s.state === 'unconfigured').length;
  if (error > 0) return { label: `${error} failing`, tone: 'red' };
  if (degraded > 0) return { label: `${degraded} degraded`, tone: 'orange' };
  return { label: `${healthy} healthy`, tone: 'green' };
}

export default function SourceHealth() {
  const [healthData, setHealthData] = useState<SourceHealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSourceHealth = async () => {
      try {
        setError(null);
        const data = await fetchSourceHealth();
        setHealthData(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    loadSourceHealth();
  }, []);

  const overall = computeOverallStatus(healthData);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Source Health</h1>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-[10px] font-mono border ${
            overall.tone === 'green' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
            overall.tone === 'red' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
            overall.tone === 'orange' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
            'bg-white/10 text-white/40 border-white/10'
          }`}>
            {overall.label}
          </span>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded border border-red-500/30 bg-red-500/10 text-red-400 text-sm font-mono">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Data Source Health Status</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8 text-white/40">Loading source health…</div>
          ) : healthData.length === 0 ? (
            <div className="col-span-full text-center py-8 text-white/40">No source health data available</div>
          ) : (
            healthData.map(source => (
              <div key={source.sourceId} className="p-4 border rounded-md bg-black/30 border-[var(--border-secondary)]">
                <div className="text-[10px] font-mono text-[var(--text-muted)] uppercase tracking-wider mb-2">{source.sourceId}</div>
                <div className="text-[12px] font-mono text-[var(--text-secondary)] mb-1">{source.state}</div>
                {source.lastRecordTimestamp && (
                  <div className="text-[9px] font-mono text-[var(--text-muted)]">
                    Last record: {new Date(source.lastRecordTimestamp).toLocaleTimeString()}
                  </div>
                )}
                {source.latencyMs != null && (
                  <div className="text-[9px] font-mono text-[var(--text-muted)]">
                    Latency: {source.latencyMs}ms
                  </div>
                )}
                {source.errorMessage && (
                  <div className="text-[9px] font-mono text-red-400 mt-1">{source.errorMessage}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}