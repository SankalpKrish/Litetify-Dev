import { useState } from 'react';
import { PlaylistList } from './PlaylistList';
import { LikedSongs } from './LikedSongs';

interface LibraryViewProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

type LibTab = 'playlists' | 'liked';

export function LibraryView({ onNavigate }: LibraryViewProps) {
  const [tab, setTab] = useState<LibTab>('playlists');

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Your Library</h1>
      </div>

      <div className="search-tabs" style={{ marginBottom: 'var(--lt-space-xl)' }}>
        <button
          className={`search-tab${tab === 'playlists' ? ' search-tab-active' : ''}`}
          onClick={() => setTab('playlists')}
        >
          Playlists
        </button>
        <button
          className={`search-tab${tab === 'liked' ? ' search-tab-active' : ''}`}
          onClick={() => setTab('liked')}
        >
          Liked Songs
        </button>
      </div>

      {tab === 'playlists' && <PlaylistList onNavigate={onNavigate} />}
      {tab === 'liked' && <LikedSongs onNavigate={onNavigate} />}
    </div>
  );
}
