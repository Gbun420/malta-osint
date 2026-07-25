'use client';

import { useState } from 'react';
import { Link } from 'next/link';
import { SourceHealthBadge } from '@/components/intelligence/SourceHealthBadge';
import { DataSourceHealthReport } from '@/intelligence/schemas/registry';

export default function SourceHealth() {
  const [healthData, setHealthData] = useState<SourceHealthReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        const healthData = await globalRepository.getSourceHealth();
        setHealthData(healthData);
      } catch (error) {
        console.error('Failed to load health data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealthData();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Source Health</h1>
        <div className="flex items-center">
          <SourceHealthBadge 
            state="healthy" 
            sourceName="Global Dashboard" 
            lastAttemptAt="5 min ago" 
            lastSuccessAt="2 min ago" 
            cacheAgeSeconds={120} 
            latencyMs={120} 
            recordCount={5} 
            providerHttpStatus={200} 
            errorCode={null} 
            safeErrorMessage={null}
          />
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white">Data Source Health Status</h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {healthData.map(source => (
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
          ))}
        </div>
      </div>
    </div>
  );
}