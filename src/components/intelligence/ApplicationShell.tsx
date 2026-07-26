'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sidebar } from './Sidebar';
import { CommandHeader } from './CommandHeader';
import { StatusBadge } from './StatusBadge';

export default function ApplicationShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState('/');

  const handleToggleSidebar = () => setSidebarOpen(!sidebarOpen);
  const handleTabChange = (tab: string) => setActiveTab(tab);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-void text-white">
      <Sidebar
        activeRoute={activeTab}
        isOpen={sidebarOpen}
        onToggle={handleToggleSidebar}
      />
      
      <div className="flex-1 flex-col overflow-auto p-4">
        <CommandHeader 
          sidebarOpen={sidebarOpen}
          onToggleSidebar={handleToggleSidebar}
        />
        
        <div className="flex-1">
          {children}
        </div>
        
        <footer className="border-t border-gold/20 p-4 text-white/50">
          <div className="flex items-center justify-between">
            <span className="text-sm">Third Eye Intelligence Platform</span>
            <StatusBadge status="green" label="Operational" />
          </div>
        </footer>
      </div>
    </div>
  );
}