import { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { checkAuth, isDevMode } from './features/auth/authStore';
import { LoginScreen } from './features/auth/LoginScreen';
import { NowPlayingBar } from './features/player/NowPlayingBar';
import { PlayerInitializer } from './features/player/PlayerInitializer';
import { Sidebar } from './app/Sidebar';
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

  const [currentView, setCurrentView] = useState<View>({ name: 'home' });
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

  const handleNavigate = useCallback((view: string, params?: Record<string, string>) => {
    switch (view) {
      case 'home':
        setCurrentView({ name: 'home' });
        break;
      case 'search':
        setCurrentView({ name: 'search' });
        break;
      case 'library':
        setCurrentView({ name: 'library' });
        break;
      case 'settings':
        setCurrentView({ name: 'settings' });
        break;
      case 'playlist':
        setCurrentView({ name: 'playlist', id: params?.id ?? '' });
        break;
      case 'album':
        setCurrentView({ name: 'album', id: params?.id ?? '' });
        break;
      case 'artist':
        setCurrentView({ name: 'artist', id: params?.id ?? '' });
        break;
      case 'mod':
        setCurrentView({ name: 'mod', modId: params?.modId ?? '' });
        break;
    }
  }, []);

  useKeyboardShortcuts();

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
