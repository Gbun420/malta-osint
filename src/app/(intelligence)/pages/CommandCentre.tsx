'use client';

import { useState } from 'react';
import { Link } from 'next/link';
import { CommandCentre } from '@/components/CommandCentre';
import { MinisterBrief } from '@/components/CommandCentre/MinisterBrief';
import { GlobalEvents } from '@/components/CommandCentre/GlobalEvents';
import { CountryProfile } from '@/components/CommandCentre/CountryProfile';
import { EUAndMultilateral } from '@/components/CommandCentre/EUAndMultilateral';
import { SourceHealth } from '@/components/CommandCentre/SourceHealth';

export default function CommandCentre() {
  const [activeTab, setActiveTab] = useState('critical');
  
  const tabs = [
    { label: 'Critical', value: 'critical' },
    { label: 'Malta', value: 'malta' },
    { label: 'EU', value: 'eu' },
    { label: 'Global', value: 'global' }
  };
  
  const handleTabChange = (tab: string) => setActiveTab(tab);
  
  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Command Centre</h1>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-white/70 hover:text-white">Home</Link>
          <Link href="/brief" className="text-white/60">Brief</Link>
          <Link href="/events" className="text-white/60">Events</Link>
        </div>
      </div>
      
      <div className="space-y-6">
        <CommandCentre />
      </div>
    </div>
  );
}