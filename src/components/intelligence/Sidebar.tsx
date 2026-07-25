'use client';
import { useState } from 'react';

interface SidebarProps {
  activeRoute: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ activeRoute, isOpen, onToggle }: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-void/95 border-r border-gold/20">
      <div className="p-4">
        <button 
          className="hamburger hamburger-open" 
          onClick={onToggle}
          aria-label="Toggle menu"
        >
          <span className="hamburger hamburger-open"></span>
          <span className="hamburger hamburger-open"></span>
          <span className="hamburger hamburger-open"></span>
        </button>
      </div>
      
      <div className="p-4">
        <Link 
          href="/" 
          className="block p-2 rounded-md text-white/70 hover:bg-gold/10"
        >
          <span className="hamburger hamburger-open"></span>
          Command Centre
        </Link>
        
        <Link 
          href="/brief" 
          className="flex items-center gap-2 p-2 rounded-md text-white/70 hover:bg-gold/10"
        >
          <span className="hamburger hamburger-open"></span>
          Minister's Brief
        </Link>
        
        <Link 
          href="/events" 
          className="flex items-center gap-2 p-2 rounded-md text-white/70 hover:bg-gold/10"
        >
          <span className="hamburger hamburger-open"></span>
          Global Events
        </Link>
        
        <Link 
          href="/malta-impact" 
            className="flex items-center gap-2 p-2 rounded-md text-white/70 hover:bg-gold/10"
        >
          <span className="hamburger hamburger-open"></span>
          Malta Impact
        </Link>
        
        <Link 
          href="/countries" 
            className="flex items-center gap-2 p-2 rounded-md text-white/70 hover:bg-gold/10"
        >
          <span className="hamburger hamburger-open"></span>
          Countries
        </Link>
        
        <Link 
          href="/eu" 
            className="flex items-center gap-2 p-2 rounded-md text-white/70 hover:bg-gold/10"
        >
          <span className="hamburger hamburger-open"></span>
          EU & Multilateral
        </Link>
        
        <Link 
            href="/sanctions" 
            className="flex items-center gap-2 p-2 rounded-md text-white/70 hover:bg-gold/10"
          >
            <span className="hamburger hamburger-open"></span>
            Sanctions
          </Link>
          
          <Link 
            href="/maritime" 
            className="flex items-center gap-2 p-2 rounded-md text-white/70 hover:bg-gold/10"
          >
            <span className="hamburger hamburger-open"></span>
            Maritime
          </Link>
          
          <Link 
            href="/aviation" 
            className="flex items-center gap-2 p-2 rounded-md text-white/70 hover:bg-gold/10"
          >
            <span className="hamburger hamburger-open"></span>
            Aviation
          </Link>
          
          <Link 
            href="/economic" 
            className="flex items-center gap-2 p-2 rounded-md text-white/70 hover:bg-gold/10"
          >
            <span className="hamburger hamburger-open"></span>
            Economic Security
          </Link>
          
          <Link 
            href="/humanitarian" 
            className="flex items-center gap-2 p-2 rounded-md text-white/70 hover:bg-gold/10"
          >
            <span className="hamburger hamburger-open"></span>
            Humanitarian
          </Link>
          
          <Link 
            href="/review" 
            className="flex items-center gap-2 p-2 rounded-md text-white/70 hover:bg-gold/10"
          >
            <span className="hamburger hamburger-open"></span>
            Review Queue
          </Link>
          
          <Link 
            href="/sources" 
            className="flex items-center gap-2 p-2 rounded-md text-white/70 hover:bg-gold/10"
          >
            <span className="hamburger hamburger-open"></span>
            Source Health
          </Link>
          
          <Link 
            href="/audio" 
            className="flex items-center gap-2 p-2 rounded-md text-white/70 hover:bg-gold/10"
          >
            <span className="hamburger hamburger-open"></span>
            Audio Intelligence
          </Link>
          
          <Link 
            href="/settings" 
            className="flex items-center gap-2 p-2 rounded-md text-white/70 hover:bg-gold/10"
          >
            <span className="hamburger hamburger-open"></span>
            Settings
          </Link>
        </div>
      </aside>
    </>
  );