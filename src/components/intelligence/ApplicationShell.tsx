'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { CommandHeader } from './CommandHeader';
import { StatusBadge } from './StatusBadge';

export default function ApplicationShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('/');

  const handleToggleSidebar = () => setSidebarOpen(o => !o);
  const handleTabChange = (tab: string) => setActiveTab(tab);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  return (
    <div className="app-shell">
      <div className={`app-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Sidebar
          activeRoute={activeTab}
          onToggle={handleToggleSidebar}
        />
      </div>

      {sidebarOpen && (
        <div
          className="sidebar-mobile-backdrop"
          onClick={handleToggleSidebar}
          role="presentation"
        />
      )}

      <div className="app-main">
        <CommandHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={handleToggleSidebar}
        />

        <main className="app-content" id="main-content">
          {children}
        </main>

        <footer className="app-footer">
          <span>Malta OSINT Intelligence Platform</span>
          <StatusBadge status="green" label="Operational" />
        </footer>
      </div>
    </div>
  );
}