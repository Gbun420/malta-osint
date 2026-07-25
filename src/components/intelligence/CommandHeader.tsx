'use client';

import { useState } from 'react';
import { Search, Bell, Clock, RefreshCw } from 'lucide-react';

interface CommandHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function CommandHeader({ sidebarOpen, onToggleSidebar }: CommandHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="flex h-14 items-center gap-3 border-b border-gold/20 bg-void/80 px-4 backdrop-blur-sm">
      <button
        className="rounded p-1 text-white/60 hover:text-white md:hidden"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
      </button>

      <div className="flex-1">
        {searchOpen ? (
          <input
            type="search"
            placeholder="Search events, countries, sources..."
            className="w-full rounded-md border border-gold/30 bg-white/5 px-3 py-1.5 text-sm text-white placeholder-white/40 focus:border-gold/60 focus:outline-none"
            autoFocus
          />
        ) : (
          <button
            className="flex w-full items-center gap-2 rounded-md border border-gold/20 bg-white/5 px-3 py-1.5 text-sm text-white/50 hover:border-gold/40"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
            <span>Search...</span>
            <kbd className="ml-auto text-xs text-white/30">⌘K</kbd>
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-white/50">
        <Clock className="h-3 w-3" />
        <span>{new Date().toLocaleTimeString('en-MT', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Europe/Malta' })}</span>
      </div>

      <button className="relative rounded p-1 text-white/60 hover:text-white" aria-label="Notifications">
        <Bell className="h-4 w-4" />
        <span className="absolute -right-0.5 -top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">3</span>
      </button>
    </header>
  );
}