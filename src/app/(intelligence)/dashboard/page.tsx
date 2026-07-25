'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CommandHeader } from '@/components/intelligence/CommandHeader';
import GlobalEvents from '@/app/(intelligence)/events/page';
import SourceHealth from '@/app/(intelligence)/sources/page';
import ReviewQueue from '@/app/(intelligence)/review/page';
import AudioIntelligence from '@/components/intelligence/AudioIntelligence';
import AnalyticsDashboard from '@/app/(intelligence)/analytics/page';

export default function IntelligenceDashboard() {
  const [activeTab, setActiveTab] = useState('events');

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <CommandHeader 
        sidebarOpen={false} 
        onToggleSidebar={() => setActiveTab('events')}
      />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold mb-4">Intelligence Dashboard</h1>
        <Link href="/" className="text-white/60 hover:text-white">
          <span className="text-sm">Command Centre</span>
        </Link>
      </div>
      
      <div className="flex justify-between">
        <div className="w-1/3">
          <nav className="flex flex-col space-y-2">
            <button 
              onClick={() => setActiveTab('events')}
              className={`bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded text-left ${
                activeTab === 'events' ? 'bg-blue-600/30 border-l-4 border-blue-500' : ''
              }`}
            >
              <span className="text-sm flex items-center gap-2">📊 Events</span>
            </button>
            <button 
              onClick={() => setActiveTab('sources')}
              className={`bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded text-left ${
                activeTab === 'sources' ? 'bg-blue-600/30 border-l-4 border-blue-500' : ''
              }`}
            >
              <span className="text-sm flex items-center gap-2">📡 Sources</span>
            </button>
            <button 
              onClick={() => setActiveTab('review')}
              className={`bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded text-left ${
                activeTab === 'review' ? 'bg-blue-600/30 border-l-4 border-blue-500' : ''
              }`}
            >
              <span className="text-sm flex items-center gap-2">📋 Reviews</span>
            </button>
            <button 
              onClick={() => setActiveTab('audio')}
              className={`bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded text-left ${
                activeTab === 'audio' ? 'bg-blue-600/30 border-l-4 border-blue-500' : ''
              }`}
            >
              <span className="text-sm flex items-center gap-2">🎙️ Audio</span>
            </button>
            <button 
              onClick={() => setActiveTab('analytics')}
              className={`bg-gray-800 hover:bg-gray-700 text-white py-2 px-4 rounded text-left ${
                activeTab === 'analytics' ? 'bg-blue-600/30 border-l-4 border-blue-500' : ''
              }`}
            >
              <span className="text-sm flex items-center gap-2">📈 Analytics</span>
            </button>
          </nav>
        </div>
        
        <div className="w-2/3">
          {activeTab === 'events' && <GlobalEvents />}
          {activeTab === 'sources' && <SourceHealth />}
          {activeTab === 'review' && <ReviewQueue />}
          {activeTab === 'audio' && <AudioIntelligence />}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
        </div>
      </div>
    </div>
  );
}