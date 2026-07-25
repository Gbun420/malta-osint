'use client';

import { useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { VerificationBadge } from '@/components/intelligence/VerificationBadge';

export default function ReviewQueue() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const ITEMS = [
    { id: '1', targetType: 'briefing' as const, targetId: 'BRIEF-001', status: 'pending' as const, reason: 'Critical briefing awaiting ministerial approval', createdAt: '2 min ago' },
    { id: '2', targetType: 'claim' as const, targetId: 'CLAIM-042', status: 'pending' as const, reason: 'Fuzzy sanctions name match requires confirmation', createdAt: '15 min ago' },
    { id: '3', targetType: 'event' as const, targetId: 'EVT-007', status: 'approved' as const, reason: 'Approved after multi-source corroboration', createdAt: '1 hr ago' },
  ];

  const filtered = filter === 'all' ? ITEMS : ITEMS.filter(i => i.status === filter);

  const statusConfig = {
    pending: { icon: Clock, color: 'text-yellow-400', label: 'Pending' },
    approved: { icon: CheckCircle, color: 'text-green-400', label: 'Approved' },
    rejected: { icon: XCircle, color: 'text-red-400', label: 'Rejected' },
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">Review Queue</h1>

      <div className="flex gap-2">
        {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
          <button
            key={f}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${filter === f ? 'bg-gold/20 text-gold' : 'bg-white/5 text-white/50 hover:text-white/80'}`}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.map(item => {
          const S = statusConfig[item.status];
          const Icon = S.icon;
          return (
            <div key={item.id} className="flex items-start gap-3 rounded-lg border border-gold/10 bg-white/5 p-4">
              <Icon className={`mt-0.5 h-5 w-5 ${S.color}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{item.targetType}: {item.targetId}</span>
                  <VerificationBadge state="single-source" />
                </div>
                <p className="mt-1 text-sm text-white/60">{item.reason}</p>
                <span className="text-xs text-white/30">{item.createdAt}</span>
              </div>
              {item.status === 'pending' && (
                <div className="flex gap-2">
                  <button className="rounded bg-green-500/20 px-2 py-1 text-xs text-green-400 hover:bg-green-500/30">Approve</button>
                  <button className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-400 hover:bg-red-500/30">Reject</button>
                  <button className="rounded bg-yellow-500/20 px-2 py-1 text-xs text-yellow-400 hover:bg-yellow-500/30">More Info</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}