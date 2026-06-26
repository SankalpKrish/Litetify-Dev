import { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { checkAuth, isDevMode } from './features/auth/authStore';
import { LoginScreen } from './features/auth/LoginScreen';
import { NowPlayingBar } from './features/player/NowPlayingBar';
import { PlayerInitializer } from './features/player/PlayerInitializer';
import { useAutoQueue } from './features/player/useAutoQueue';
import { usePlaybackTimer } from './features/player/usePlaybackTimer';
import { Sidebar } from './app/Sidebar';
import { ContextMenu, setContextMenuNavigate } from './features/contextmenu/ContextMenu';
import { ErrorBoundary } from './lib/ErrorBoundary';
import { useKeyboardShortcuts } from './lib/useKeyboardShortcuts';
import { initMods, useModsStore } from './mods';
import { Toast } from './features/settings/Toast';
import { setToastCallbacks, setSidebarItemCallbacks } from './mods/api';

const HomeView = lazy(() => import('./features/browse/HomeView').then((m) => ({ default: m.HomeView })));
const SearchView = lazy(() => import('./features/search/SearchView').then((m) => ({ default: m.SearchView })));
const LibraryView = lazy(() => import('./features/library/LibraryView').then((m) => ({ default: m.LibraryView })));
const PlaylistDetail = lazy(() => import('./features/library/PlaylistDetail').then((m) => ({ default: m.PlaylistDetail })));
const AlbumView = lazy(() => import('./features/library/AlbumView').then((m) => ({ default: m.AlbumView })));
const ArtistView = lazy(() => import('./features/library/ArtistView').then((m) => ({ default: m.ArtistView })));
const SettingsView = lazy(() => import('./features/settings/SettingsView').then((m) => ({ default: m.SettingsView })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});

type View =
  | { name: 'home' }
  | { name: 'search' }
  | { name: 'library' }
  | { name: 'settings' }
  | { name: 'playlist'; id: string }
  | { name: 'album'; id: string }
  | { name: 'artist'; id: string }
  | { name: 'mod'; modId: string };

function AppShell(): React.JSX.Element {
  const [authStatus, setAuthStatus] = useState<
    'loading' | 'authenticated' | 'unauthenticated'
  >(() => 'loading');

  // View navigation history: `entries[index]` is the current view. Navigating
  // pushes (truncating any forward entries); back/forward move the index.
  // Kept in one state object so updates stay atomic.
  const [nav, setNav] = useState<{ entries: View[]; index: number }>({
    entries: [{ name: 'home' }],
    index: 0,
  });
  const currentView = nav.entries[nav.index];
  const canGoBack = nav.index > 0;
  const canGoForward = nav.index < nav.entries.length - 1;
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'success' | 'error' } | null>(null);
  const customViews = useModsStore((s) => s.customViews);

  useEffect(() => {
    checkAuth().then((hasTokens) => {
      if (hasTokens) {
        setAuthStatus('authenticated');
      } else if (isDevMode()) {
        setAuthStatus('authenticated');
      } else {
        setAuthStatus('unauthenticated');
      }
    });
  }, []);

  useEffect(() => {
    if (authStatus === 'authenticated') {
      initMods().catch((err) => console.error('[mods] init failed:', err));
    }
  }, [authStatus]);

  // Disable the native right-click menu app-wide so our custom menu is the only one.
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Allow native menu inside text inputs/textareas (copy/paste etc.).
      if (target.closest('input, textarea, [contenteditable="true"]')) return;
      e.preventDefault();
    };
    document.addEventListener('contextmenu', onContextMenu);
    return () => document.removeEventListener('contextmenu', onContextMenu);
  }, []);

  useEffect(() => {
    setToastCallbacks(
      (message, type) => setToast({ message, type }),
      () => setToast(null),
    );
    setSidebarItemCallbacks(
      (id, label, icon) => {
        useModsStore.getState().registerCustomView(id, label, () => null, icon);
      },
      (id) => {
        useModsStore.getState().unregisterCustomView(id);
      },
    );
  }, []);

  const handleAuthenticated = useCallback(() => {
    checkAuth().then((hasTokens) => {
      setAuthStatus(hasTokens ? 'authenticated' : 'unauthenticated');
    });
  }, []);

  const handleLogout = useCallback(() => {
    setAuthStatus('unauthenticated');
  }, []);

  const pushView = useCallback((next: View) => {
    setNav((prev) => {
      const truncated = prev.entries.slice(0, prev.index + 1);
      const cur = truncated[truncated.length - 1];
      // Don't push a duplicate of the current view.
      if (cur && JSON.stringify(cur) === JSON.stringify(next)) return prev;
      const entries = [...truncated, next];
      return { entries, index: entries.length - 1 };
    });
  }, []);

  const goBack = useCallback(() => {
    setNav((prev) => (prev.index > 0 ? { ...prev, index: prev.index - 1 } : prev));
  }, []);

  const goForward = useCallback(() => {
    setNav((prev) => (prev.index < prev.entries.length - 1 ? { ...prev, index: prev.index + 1 } : prev));
  }, []);

  const handleNavigate = useCallback((view: string, params?: Record<string, string>) => {
    switch (view) {
      case 'home': pushView({ name: 'home' }); break;
      case 'search': pushView({ name: 'search' }); break;
      case 'library': pushView({ name: 'library' }); break;
      case 'settings': pushView({ name: 'settings' }); break;
      case 'playlist': pushView({ name: 'playlist', id: params?.id ?? '' }); break;
      case 'album': pushView({ name: 'album', id: params?.id ?? '' }); break;
      case 'artist': pushView({ name: 'artist', id: params?.id ?? '' }); break;
      case 'mod': pushView({ name: 'mod', modId: params?.modId ?? '' }); break;
    }
  }, []);

  useEffect(() => {
    setContextMenuNavigate(handleNavigate);
  }, [handleNavigate]);

  useKeyboardShortcuts();
  useAutoQueue();
  usePlaybackTimer();

  if (authStatus === 'loading') {
    return (
      <main className="shell">
        <div className="auth-spinner" />
        <p className="status">Checking authentication...</p>
      </main>
    );
  }

  if (authStatus === 'unauthenticated') {
    return <LoginScreen onAuthenticated={handleAuthenticated} />;
  }

  const devMode = isDevMode();
  const currentViewName = currentView.name;
  const currentPlaylistId = currentView.name === 'playlist' ? currentView.id : undefined;
  const currentModId = currentView.name === 'mod' ? currentView.modId : undefined;

  return (
    <ErrorBoundary>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div className="app-layout">
      {!devMode && <PlayerInitializer />}
      <Sidebar
        devMode={devMode}
        currentView={currentViewName}
        currentPlaylistId={currentPlaylistId}
        currentModId={currentModId}
        onNavigate={handleNavigate}
      />
      <div className="app-main">
        <div className="topbar">
          <div className="topbar-nav">
            <button
              className="topbar-nav-btn"
              onClick={goBack}
              disabled={!canGoBack}
              aria-label="Go back"
              title="Go back"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>
            <button
              className="topbar-nav-btn"
              onClick={goForward}
              disabled={!canGoForward}
              aria-label="Go forward"
              title="Go forward"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        </div>
        <main className="main-view" id="main-content">
          <Suspense fallback={<div className="empty-state"><div className="auth-spinner" /></div>}>
            {currentView.name === 'home' && <HomeView onNavigate={handleNavigate} />}
            {currentView.name === 'search' && <SearchView onNavigate={handleNavigate} />}
            {currentView.name === 'library' && <LibraryView onNavigate={handleNavigate} />}
            {currentView.name === 'settings' && <SettingsView devMode={devMode} onLogout={handleLogout} />}
            {currentView.name === 'playlist' && (
              <PlaylistDetail playlistId={currentView.id} onNavigate={handleNavigate} />
            )}
            {currentView.name === 'album' && (
              <AlbumView albumId={currentView.id} onNavigate={handleNavigate} />
            )}
            {currentView.name === 'artist' && (
              <ArtistView artistId={currentView.id} onNavigate={handleNavigate} />
            )}
            {currentView.name === 'mod' && (
              <div className="mod-view">
                {customViews.has(currentView.modId) ? (
                  customViews.get(currentView.modId)!.render()
                ) : (
                  <p className="mod-not-found">Custom app not found.</p>
                )}
              </div>
            )}
          </Suspense>
        </main>
        <NowPlayingBar />
      </div>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <ContextMenu />
    </div>
    </ErrorBoundary>
  );
}

export function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
