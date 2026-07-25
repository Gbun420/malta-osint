'use client';

import { useState } from 'react';
import { Clock, ChevronDown, ChevronRight, FileText, Download, Volume2 } from 'lucide-react';
import { MaltaRelevanceBadge } from '@/components/intelligence/MaltaRelevanceBadge';
import { ConfidenceBadge } from '@/components/intelligence/ConfidenceBadge';
import { VerificationBadge } from '@/components/intelligence/VerificationBadge';
import type { MinisterBriefItem } from '@/intelligence/types';

const MOCK_BRIEF: MinisterBriefItem[] = [];

export default function MinisterBrief() {
  const [view, setView] = useState<'morning' | 'evening' | 'since' | 'critical'>('morning');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Minister's Brief</h1>
        <div className="flex gap-2">
          <button className="rounded-md bg-gold/10 px-3 py-1.5 text-xs text-gold hover:bg-gold/20">Export Markdown</button>
          <button className="rounded-md bg-gold/10 px-3 py-1.5 text-xs text-gold hover:bg-gold/20">Export JSON</button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gold/20">
        {(['morning', 'evening', 'since', 'critical'] as const).map(v => (
          <button
            key={v}
            className={`pb-2 text-sm font-medium capitalize ${view === v ? 'text-gold' : 'text-white/50 hover:text-white/80'}`}
            onClick={() => setView(v)}
          >
            {v === 'since' ? 'Since Last' : v}
          </button>
        ))}
      </div>

      {MOCK_BRIEF.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gold/20 bg-white/5 p-8 text-center text-white/40">
          <FileText className="mx-auto mb-2 h-8 w-8" />
          <p>No briefing items available</p>
          <p className="text-xs">Run ingestion and classification to generate a ministerial brief.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {MOCK_BRIEF.map(item => (
            <div key={item.id} className="rounded-lg border border-gold/10 bg-white/5">
              <div
                className="flex items-start justify-between p-4 cursor-pointer"
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-white">{item.headline}</h3>
                    <ConfidenceBadge confidence={item.confidenceScore} label="moderate" />
                    <MaltaRelevanceBadge score={item.maltaRelevanceScore} />
                  </div>
                  <p className="mt-2 text-sm text-white/60">{item.executiveSummary}</p>
                </div>
                {expandedId === item.id ? <ChevronDown className="h-4 w-4 text-white/40" /> : <ChevronRight className="h-4 w-4 text-white/40" />}
              </div>
              {expandedId === item.id && (
                <div className="border-t border-gold/10 p-4 space-y-3">
                  <div>
                    <h4 className="text-xs font-semibold text-gold mb-1">Why It Matters to Malta</h4>
                    <ul className="space-y-1">
                      {item.whyItMattersToMalta.map((reason, i) => (
                        <li key={i} className="text-sm text-white/60">• {reason}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <VerificationBadge state={item.verificationState} />
                    <MaltaRelevanceBadge score={item.maltaRelevanceScore} />
                    <ConfidenceBadge confidence={item.confidenceScore} label="moderate" />
                  </div>
                  {item.uncertainties.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-yellow-400 mb-1">Uncertainties</h4>
                      <ul className="space-y-1">
                        {item.uncertainties.map((u, i) => (
                          <li key={i} className="text-sm text-yellow-400/70">• {u}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button className="rounded-md bg-gold/10 px-3 py-1.5 text-xs text-gold hover:bg-gold/20"><Volume2 className="inline h-3 w-3 mr-1" /> Listen</button>
                    <button className="rounded-md bg-gold/10 px-3 py-1.5 text-xs text-gold hover:bg-gold/20"><Download className="inline h-3 w-3 mr-1" /> Print</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}