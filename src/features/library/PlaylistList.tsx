import { usePlaylists } from '../../lib/queries/usePlaylists';
import { getImage } from '../../lib/utils';

interface PlaylistListProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

export function PlaylistList({ onNavigate }: PlaylistListProps) {
  const { data, isLoading, error } = usePlaylists(50);

  if (isLoading) {
    return (
      <div className="empty-state">
        <div className="empty-state-desc">Loading your playlists...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Something went wrong</div>
        <div className="empty-state-desc">Could not load your playlists. Try again later.</div>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No playlists yet</div>
        <div className="empty-state-desc">Create a playlist on Spotify and it will appear here.</div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="sr-only">Playlists</h2>
      </div>
      <div className="card-grid">
        {data.items.map((pl) => (
          <div key={pl.id} className="card" onClick={() => onNavigate('playlist', { id: pl.id })} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onNavigate('playlist', { id: pl.id }); } }}>
            <img
              className="card-image"
              src={getImage(pl.images)}
              alt={pl.name}
              loading="lazy"
            />
            <div>
              <div className="card-title">{pl.name}</div>
              <div className="card-subtitle">
                {pl.tracks.total} track{pl.tracks.total !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
