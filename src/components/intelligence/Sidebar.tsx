'use client';

import Link from 'next/link';
import {
  LayoutDashboard,
  FileText,
  Map,
  Ship,
  Plane,
  Activity,
  Shield,
  Scale,
  DollarSign,
  Heart,
  AlertCircle,
  Radio,
  Settings,
  Menu,
  X,
} from 'lucide-react';

interface SidebarProps {
  activeRoute: string;
  isOpen: boolean;
  onToggle: () => void;
}

const NAV_ITEMS = [
  { href: '/', label: 'Command Centre', icon: LayoutDashboard },
  { href: '/brief', label: "Minister's Brief", icon: FileText },
  { href: '/events', label: 'Global Events', icon: Map },
  { href: '/malta-impact', label: 'Malta Impact', icon: Activity },
  { href: '/countries', label: 'Countries', icon: Shield },
  { href: '/eu', label: 'EU & Multilateral', icon: Scale },
  { href: '/sanctions', label: 'Sanctions', icon: Shield },
  { href: '/maritime', label: 'Maritime', icon: Ship },
  { href: '/aviation', label: 'Aviation', icon: Plane },
  { href: '/economic', label: 'Economic Security', icon: DollarSign },
  { href: '/humanitarian', label: 'Humanitarian', icon: Heart },
  { href: '/review', label: 'Review Queue', icon: AlertCircle },
  { href: '/sources', label: 'Source Health', icon: Radio },
  { href: '/audio', label: 'Audio Intelligence', icon: Radio },
];

export function Sidebar({ activeRoute, isOpen, onToggle }: SidebarProps) {
  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 md:hidden" onClick={onToggle} />
      )}
      <aside
        className={`
          fixed left-0 top-0 z-30 h-full border-r border-gold/20 bg-void/95 backdrop-blur-md
          transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:w-64 md:border-r
          flex flex-col
        `}
      >
        <div className="flex h-14 items-center justify-between border-b border-gold/20 px-4">
          <Link href="/" className="text-sm font-bold tracking-wide text-gold">
            Third Eye
          </Link>
          <button
            className="md:hidden rounded p-1 text-white/60 hover:text-white"
            onClick={onToggle}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-auto py-2">
          <ul className="space-y-0.5 px-2">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = activeRoute === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      flex items-center gap-3 rounded-md px-3 py-2 text-sm
                      transition-colors
                      ${isActive
                        ? 'bg-gold/10 text-gold'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'}
                    `}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-gold/20 px-4 py-3">
          <div className="text-xs text-white/50">
            <span className="text-green-400">●</span> Connected
          </div>
        </div>
      </aside>
    </>
  );
}