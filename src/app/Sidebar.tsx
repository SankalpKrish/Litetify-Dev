import { memo, useMemo, useState, useEffect } from 'react';
import { useModsStore } from '../mods';
import { useContextMenuStore } from '../features/contextmenu/contextMenuStore';
import { usePinsStore } from '../features/pins/pinsStore';
import { PlaybackTimerBadge } from '../features/player/PlaybackTimerBadge';

const COLLAPSE_KEY = 'litetify:sidebarCollapsed';

function loadCollapsed(): boolean {
  try { return localStorage.getItem(COLLAPSE_KEY) === 'true'; } catch { return false; }
}

const PlaylistThumb = memo(function PlaylistThumb({ src, alt }: { src: string; alt: string }) {
  if (src) {
    return <img className="sidebar-playlist-thumb" src={src} alt="" aria-hidden="true" loading="lazy" decoding="async" />;
  }
  return (
    <span className="sidebar-playlist-thumb sidebar-playlist-thumb-fallback" aria-hidden="true" title={alt}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    </span>
  );
});

interface SidebarProps {
  devMode: boolean;
  currentView: string;
  currentPlaylistId?: string;
  currentModId?: string;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

const navItems = [
  { view: 'home', label: 'Home', icon: 'home' },
  { view: 'search', label: 'Search', icon: 'search' },
  { view: 'library', label: 'Your Library', icon: 'library' },
];

const NavIcon = memo(function NavIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'home':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'search':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case 'library':
      return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      );
    case 'stats':
      return (
        <div style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, color: 'var(--lt-accent)' }}>
          L
        </div>
      );
    default:
      return null;
  }
});

export function Sidebar({ devMode, currentView, currentPlaylistId, currentModId, onNavigate }: SidebarProps) {
  const customViews = useModsStore((s) => s.customViews);
  const customViewsVersion = useModsStore((s) => s.customViewsVersion);
  const openContextMenu = useContextMenuStore((s) => s.openMenu);
  const pins = usePinsStore((s) => s.pins);
  const [collapsed, setCollapsed] = useState(loadCollapsed);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try { localStorage.setItem(COLLAPSE_KEY, String(next)); } catch { /* noop */ }
      return next;
    });
  };

  // Reflect collapsed state onto the .app-layout ancestor so siblings (the
  // fixed now-playing bar) can offset to the collapsed sidebar width.
  useEffect(() => {
    const layout = document.querySelector('.app-layout');
    if (layout) layout.classList.toggle('app-sidebar-collapsed', collapsed);
  }, [collapsed]);

  const sidebarItems = useMemo(() => {
    const items: { id: string; label: string; icon: string }[] = [];
    customViews.forEach((view, id) => {
      items.push({ id, label: view.label, icon: view.icon });
    });
    return items;
  }, [customViews, customViewsVersion]);

  return (
    <aside className={`sidebar${collapsed ? ' sidebar-collapsed' : ''}`} aria-label="Sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            L
            <PlaybackTimerBadge />
          </div>
          <span className="sidebar-logo-text">Litetify</span>
          {devMode && <span className="dev-badge">DEV</span>}
        </div>
        <button
          className="sidebar-collapse-btn"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {collapsed
              ? <polyline points="9 18 15 12 9 6" />
              : <polyline points="15 18 9 12 15 6" />}
          </svg>
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.view}
            className={`sidebar-link${currentView === item.view ? ' sidebar-link-active' : ''}`}
            onClick={() => onNavigate(item.view)}
            aria-label={item.label}
          >
            <span className="sidebar-link-icon"><NavIcon icon={item.icon} /></span>
            {item.label}
          </button>
        ))}
      </nav>

      {sidebarItems.length > 0 && (
        <>
          <div className="sidebar-section">Custom Apps</div>
          <div className="sidebar-playlists">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                className={`sidebar-playlist-item${currentModId === item.id ? ' sidebar-playlist-item-active' : ''}`}
                onClick={() => onNavigate('mod', { modId: item.id })}
                aria-label={item.label}
              >
                {item.icon && <span className="sidebar-link-icon"><NavIcon icon={item.icon} /></span>}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}

      {pins.length > 0 && (
        <>
          <div className="sidebar-section">Pinned</div>
          <div className="sidebar-playlists">
            {pins.map((item) => {
              const isActive = item.type === 'playlist' && currentPlaylistId === item.id;
              return (
                <button
                  key={item.uri}
                  className={`sidebar-playlist-item${isActive ? ' sidebar-playlist-item-active' : ''}`}
                  onClick={() => onNavigate(item.type, { id: item.id })}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    openContextMenu(e.clientX, e.clientY, { kind: item.type, id: item.id, name: item.name, uri: item.uri });
                  }}
                  aria-label={item.name}
                >
                  <PlaylistThumb src={item.image} alt={item.name} />
                  <span className="sidebar-playlist-name">{item.name}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="sidebar-footer">
        <button
          className={`sidebar-link${currentView === 'settings' ? ' sidebar-link-active' : ''}`}
          onClick={() => onNavigate('settings')}
          aria-label="Settings"
        >
          <span className="sidebar-link-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </span>
          Settings
        </button>
      </div>
    </aside>
  );
}
