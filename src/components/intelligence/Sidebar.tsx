'use client';

import { useState } from 'react';
import Link from 'next/link';

interface SidebarNavItem {
  href: string;
  label: string;
  group: string;
}

const NAV_ITEMS: SidebarNavItem[] = [
  { href: '/', label: 'Command Centre', group: 'Platform' },
  { href: '/brief', label: "Minister's Brief", group: 'Intelligence' },
  { href: '/events', label: 'Global Events', group: 'Intelligence' },
  { href: '/malta-impact', label: 'Malta Impact', group: 'Intelligence' },
  { href: '/countries', label: 'Countries', group: 'Intelligence' },
  { href: '/sanctions', label: 'Sanctions', group: 'Intelligence' },
  { href: '/maritime', label: 'Maritime', group: 'Domains' },
  { href: '/aviation', label: 'Aviation', group: 'Domains' },
  { href: '/review', label: 'Review Queue', group: 'Workflow' },
  { href: '/sources', label: 'Source Health', group: 'Workflow' },
  { href: '/audio', label: 'Audio Intel', group: 'Workflow' },
  { href: '/docs', label: 'API Docs', group: 'System' },
  { href: '/settings', label: 'Settings', group: 'System' },
];

const GROUP_LABELS: Record<string, string> = {
  Platform: 'Platform',
  Intelligence: 'Intelligence',
  Domains: 'Domains',
  Workflow: 'Workflow',
  System: 'System',
};

export function Sidebar({ activeRoute, onToggle }: { activeRoute: string; onToggle: () => void }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className="sidebar" style={{ width: collapsed ? 'var(--sidebar-collapsed)' : 'var(--sidebar-width)' }}>
      <div className="sidebar-inner">
        <div className="sidebar-brand">
          <div className="sidebar-brand-row">
            <div className="sidebar-brand-mark" aria-hidden="true">M</div>
            {!collapsed && (
              <div className="sidebar-brand-text">
                <div className="sidebar-brand-name">MALTA OSINT</div>
                <div className="sidebar-brand-tag">INTELLIGENCE</div>
              </div>
            )}
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          {Object.entries(GROUP_LABELS).map(([key, label]) => {
            const groupItems = NAV_ITEMS.filter(item => item.group === key);
            if (groupItems.length === 0) return null;
            return (
              <div key={key} className="sidebar-group">
                {!collapsed && (
                  <div className="sidebar-group-label">{label}</div>
                )}
                <ul className="sidebar-group-items" role="list">
                  {groupItems.map(item => {
                    const isActive = item.href === '/'
                      ? activeRoute === '/'
                      : activeRoute.startsWith(item.href);
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={isActive ? 'page' : undefined}
                          className={`sidebar-link${isActive ? ' sidebar-link--active' : ''}`}
                          title={collapsed ? item.label : undefined}
                          onClick={() => { if (collapsed) setCollapsed(false); }}
                        >
                          <span className="sidebar-link-icon" aria-hidden="true" />
                          {!collapsed && (
                            <span className="sidebar-link-label">{item.label}</span>
                          )}
                          {isActive && !collapsed && (
                            <span className="sidebar-link-active" aria-hidden="true" />
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <button
            onClick={() => setCollapsed(c => !c)}
            className="sidebar-collapse-btn"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            type="button"
          >
            <span aria-hidden="true">{collapsed ? '›' : '‹'}</span>
          </button>
        </div>
      </div>
    </aside>
  );
}