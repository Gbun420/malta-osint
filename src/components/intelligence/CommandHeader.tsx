'use client';

interface CommandHeaderProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function CommandHeader({ sidebarOpen, onToggleSidebar }: CommandHeaderProps) {
  return (
    <header className="app-header" role="banner">
      <div className="app-header-inner">
        <div className="app-header-left">
          <button
            onClick={onToggleSidebar}
            className="app-header-menu-btn"
            aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
            aria-expanded={sidebarOpen}
            type="button"
          >
            <span className="app-header-menu-icon" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </span>
          </button>
          <h1 className="app-header-title">Malta OSINT</h1>
          <span className="app-header-subtitle">Global Intelligence Platform</span>
        </div>
        <div className="app-header-right">
          <span className="app-header-status">
            <span className="app-header-status-dot" aria-hidden="true" />
            <span className="app-header-status-text">Operational</span>
          </span>
        </div>
      </div>
    </header>
  );
}