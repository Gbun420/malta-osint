'use client';

import { useState, useEffect } from 'react';
import { MinisterBriefItem } from '@/intelligence/briefing/MinisterBriefItem';
import { SourceHealthBadge } from '@/components/intelligence/SourceHealthBadge';
import { VerificationBadge } from '@/components/intelligence/VerificationBadge';

export default function MinisterBrief() {
  const [briefItems, setBriefItems] = useState<MinisterBriefItem[]>([]);
  const [isLoading, setLoading] = useState(true);
  const [view, setView] = useState<'morning' | 'evening' | 'since' | 'critical'>('morning');
  
  // In a real app, this would fetch data from an API
  // For now, we'll use mock data
  useEffect(() => {
    // Simulate data loading
    const mockData: MinisterBriefItem[] = [
      {
        id: '1',
        headline: 'Malta-EU Trade Agreement Signed',
        executiveSummary: 'Malta signs new trade agreement with EU, opening access to European markets',
        whyItMattersToMalta: [
          'Increased trade volume with EU',
          'Enhanced market access for Maltese exporters',
          'Strengthened diplomatic ties with EU member states',
          'Potential for increased tourism revenue'
        ],
        eventTime: '2024-06-15T10:00:00Z',
        firstObservedAt: '2024-06-14T14:30:00Z',
        countries: [
          { name: 'Malta', alpha2: 'MT', role: 'sovereign' },
          { name: 'Germany', alpha2: 'DE', role: 'trading partner' },
          { name: 'France', alpha2: 'FR', role: 'trading partner' }
        ],
        locations: [
          { lat: 35.9, lng: 14.4, type: 'country' },
          { lat: 52.5, lng: 13.4, type: 'country' }
        ],
        organisations: [
          { name: 'EU Commission', type: 'government' },
          { name: 'Malta Ministry of Foreign Affairs', type: 'government' }
        ],
        categories: ['trade', 'diplomatic'],
        severity: 4,
        maltaRelevanceScore: 75,
        confidenceScore: 95,
        confidenceLabel: 'high',
        verificationState: 'multi-source',
        evidence: [
          { id: 'ev1', source: 'EU Official Statement', type: 'official' },
          { id: 'ev2', source: 'Malta Gazette', type: 'local', verified: true }
        ],
        uncertainties: ['Exact financial terms not disclosed'],
        possibleFollowUp: [
          'Negotiation of bilateral trade agreements',
          'Implementation of regulatory framework',
          'Monitoring of trade flows'
        ],
        humanReviewStatus: 'pending'
      }
    ];
    
    setBriefItems(mockData);
    setLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-500 mx-auto"></div>
          <p className="mt-4 text-white/60">Loading Minister's Brief...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-white">Minister's Brief</h1>
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <button 
            className={`bg-gold/10 hover:bg-gold/30 rounded-md px-4 py-2 ${view === 'morning' ? 'bg-gold/30' : ''}`}
            onClick={() => setView('morning')}
          >
            Morning Brief
          </button>
          <button 
            className={`bg-gold/10 hover:bg-gold/20 rounded-md px-4 py-2 ${view === 'evening' ? 'bg-gold/30' : ''}`}
            onClick={() => setView('evening')}
          >
            Evening Update
          </button>
          <button 
            className={`bg-gray-800/20 rounded-md px-4 py-2 text-sm text-white/60 ${view === 'since' ? 'bg-gold/30' : ''}`}
            onClick={() => setView('since')}
          >
            Since Last Briefing
          </button>
          <button 
            className={`bg-gray-800/20 hover:bg-gray-700 rounded-md px-4 py-2 text-sm text-white/60 ${view === 'critical' ? 'bg-gold/30' : ''}`}
            onClick={() => setView('critical')}
          >
            Critical Only
          </button>
        </div>
        
        <div className="space-y-4">
          {briefItems.map(item => (
            <div key={item.id} className="border-t border-gold/10 p-4 rounded-lg">
              <h2 className="text-lg font-bold text-white">{item.headline}</h2>
              <p className="text-sm text-white/60">{item.executiveSummary}</p>
              <div className="mt-2">
                <span className="text-green-400">Why it matters to Malta:</span>
                <ul className="list-disc ml-4 mt-1">
                  {item.whyItMattersToMalta.map((point, i) => (
                    <li key={i} className="text-sm text-white/60">{point}</li>
                  ))}
                </ul>
              </div>
              
              <div className="mt-4">
                <div className="flex items-center">
                  <span className="text-sm font-medium">Severity:</span>
                  <span className="ml-2">{item.severity}/5</span>
                </div>
                
                <div className="flex items-center mt-2">
                  <span className="text-green-400">Confidence:</span>
                  <span className="ml-2">{item.confidenceLabel}</span>
                </div>
                
                <div className="flex items-center mt-2">
                  <span className="text-sm">Verified:</span>
                  <VerificationBadge state={item.verificationState} />
                </div>
              </div>
              
              <div className="mt-4">
                <h3 className="text-lg font-medium">Countries Affected</h3>
                <div className="flex flex-wrap">
                  {item.countries.map((country, i) => (
                    <span key={i} className="px-1 bg-gray-200/20 rounded-full text-xs text-white/60 mr-1">{country.name}</span>
                  ))}
                </div>
              </div>
              
              <div className="mt-4">
                <p className="text-sm text-white/60">Possible Follow-Up:</p>
                <ul className="list-disc pl-4">
                  {item.possibleFollowUp.map((followUp, i) => (
                    <li key={i} className="text-sm text-yellow-400">{followUp}</li>
                  ))}
                </ul>
              </div>
              
              <div className="mt-4">
                <h4 className="text-lg font-bold">Human Review Status</h4>
                <div className="flex justify-center space-x-4">
                  <button className="rounded bg-green-500/30 px-3 py-1 text-sm text-green-600">Approved</button>
                  <button className="rounded bg-yellow-200/30 px-3 py-1 text-yellow-600 hover:bg-yellow-300">Changes Requested</button>
                  <button className="rounded bg-gray-200/30 px-3 py-1 text-gray-700 hover:bg-gray-300">Pending</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </header>
    </div>
  );
}