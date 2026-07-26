'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { CommandHeader } from '@/components/intelligence/CommandHeader';
import { StatusBadge } from '@/components/intelligence/StatusBadge';
import { ConfidenceBadge } from '@/components/intelligence/ConfidenceBadge';
import { VerificationBadge } from '@/components/intelligence/VerificationBadge';
import { SourceHealthBadge } from '@/components/intelligence/SourceHealthBadge';
import { MinisterBriefItem } from '@/intelligence/types';
import { IntelligenceEvent } from '@/intelligence/types';
import { SourceHealthRecord } from '@/intelligence/schemas/registry';
import { fetchSourceHealth } from '@/services/intelligence/sourcesService';

export default function SourceHealth() {
  const [healthData, setHealthData] = useState<SourceHealthRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSourceHealth = async () => {
      try {
        const data = await fetchSourceHealth();
        setHealthData(data);
      } catch (error) {
        console.error('Failed to load source health data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSourceHealth();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Source Health</h1>
        <div className="flex items-center">
          <StatusBadge status="green" label="Healthy" />
          <ConfidenceBadge value={85} label="high" />
          <VerificationBadge state="multi-source" />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Data Source Health Status</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-8">Loading source health...</div>
          ) : (
            healthData.map(source => (
              <div key={source.sourceId} className="p-4 border rounded-md shadow-sm">
                <SourceHealthBadge 
                  state={source.state as any} 
                  sourceName={source.sourceId} 
                  lastAttemptAt="5 min ago" 
                  lastSuccessAt="3 min ago" 
                  cacheAgeSeconds={120} 
                  latencyMs={150} 
                  recordCount={5} 
                  providerHttpStatus={200} 
                  errorCode={null} 
                  safeErrorMessage={null}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}