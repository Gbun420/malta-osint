'use client';

import { useState } from 'react';

interface CommandHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function CommandHeader({ sidebarOpen, onToggleSidebar }: CommandHeaderProps) {
  return (
    <header className="flex items-center justify-between border-b border-gold/20 bg-void/80 p-4">
      <button 
        className="hidden md:hidden"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <span className="hamburger hamburger-open"></span>
      </button>
      
      <div className="flex-1">
        <span className="text-white/60">
          Third Eye Intelligence Platform
        </span>
      </div>
      
      <button 
        className="md:hidden"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <span className="hamburger hamburger-open"></span>
      </button>
    </header>
  );
}