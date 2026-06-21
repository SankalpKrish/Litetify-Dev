import { useCallback, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { checkAuth } from './features/auth/authStore';
import { LoginScreen } from './features/auth/LoginScreen';
import { NowPlayingBar } from './features/player/NowPlayingBar';
import { PlayerInitializer } from './features/player/PlayerInitializer';
import { Sidebar } from './app/Sidebar';
import { HomeView } from './features/browse/HomeView';
import { SearchView } from './features/search/SearchView';
import { LibraryView } from './features/library/LibraryView';
import { PlaylistDetail } from './features/library/PlaylistDetail';
import { AlbumView } from './features/library/AlbumView';
import { ArtistView } from './features/library/ArtistView';
import { SettingsView } from './features/settings/SettingsView';
import { initMods, useModsStore } from './mods';
import { Toast } from './features/settings/Toast';
import { setToastCallbacks, setSidebarItemCallbacks } from './mods/api';

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
      setAuthStatus(hasTokens ? 'authenticated' : 'unauthenticated');
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
      (id, label) => {
        useModsStore.getState().registerCustomView(id, label, () => null);
      },
      (id) => {
        useModsStore.getState().unregisterCustomView(id);
      },
    );
  }, []);

  const handleAuthenticated = useCallback(() => {
    setAuthStatus('authenticated');
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

  const currentViewName = currentView.name;
  const currentPlaylistId = currentView.name === 'playlist' ? currentView.id : undefined;
  const currentModId = currentView.name === 'mod' ? currentView.modId : undefined;

  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div className="app-layout">
      <PlayerInitializer />
      <Sidebar
        currentView={currentViewName}
        currentPlaylistId={currentPlaylistId}
        currentModId={currentModId}
        onNavigate={handleNavigate}
      />
      <div className="app-main">
        <main className="main-view" id="main-content">
          {currentView.name === 'home' && <HomeView onNavigate={handleNavigate} />}
          {currentView.name === 'search' && <SearchView onNavigate={handleNavigate} />}
          {currentView.name === 'library' && <LibraryView onNavigate={handleNavigate} />}
          {currentView.name === 'settings' && <SettingsView />}
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
    </>
  );
}

export function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
    </QueryClientProvider>
  );
}
