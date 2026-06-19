import { useAlbum } from '../../lib/queries/useAlbum';
import { getImage, formatDuration } from '../../lib/utils';
import { usePlayerStore } from '../player/playerStore';

interface AlbumViewProps {
  albumId: string;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

export function AlbumView({ albumId, onNavigate }: AlbumViewProps) {
  const { data: album, isLoading, error } = useAlbum(albumId);
  const playTrack = usePlayerStore((s) => s.playTrack);

  if (isLoading) {
    return (
      <div className="empty-state">
        <div className="empty-state-desc">Loading album...</div>
      </div>
    );
  }

  if (error || !album) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Album not found</div>
        <div className="empty-state-desc">This album may not be available.</div>
      </div>
    );
  }

  const totalDuration = album.tracks.items.reduce((sum, t) => sum + t.duration_ms, 0);

  return (
    <div>
      <div className="detail-header">
        <img
          className="detail-image"
          src={getImage(album.images, 256)}
          alt={album.name}
        />
        <div className="detail-meta">
          <div className="detail-type">Album</div>
          <h1 className="detail-name">{album.name}</h1>
          <div className="detail-desc">
            {album.artists.map((a, i) => (
              <span key={a.id}>
                {i > 0 && ', '}
                <button
                  className="track-artist-link"
                  onClick={() => onNavigate('artist', { id: a.id })}
                >
                  {a.name}
                </button>
              </span>
            ))}
          </div>
          <div className="detail-stats">
            <strong>{album.release_date?.split('-')[0] ?? ''}</strong>
            {' · '}{album.total_tracks} track{album.total_tracks !== 1 ? 's' : ''}
            {' · '}{formatDuration(totalDuration)}
          </div>
        </div>
      </div>

      <div className="detail-action-bar">
        <button
          className="play-btn"
          onClick={() => {
            const first = album.tracks.items[0];
            if (first) playTrack(first.uri);
          }}
          aria-label="Play"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="8,5 19,12 8,19" />
          </svg>
        </button>
      </div>

      <table className="track-table">
        <thead>
          <tr>
            <th style={{ width: 32 }}>#</th>
            <th>Title</th>
            <th style={{ width: 60, textAlign: 'right' }}>Duration</th>
          </tr>
        </thead>
        <tbody>
          {album.tracks.items.map((track, idx) => (
            <tr
              key={track.id ?? idx}
              className="track-row"
              onClick={() => playTrack(track.uri)}
              onDoubleClick={() => playTrack(track.uri)}
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter') playTrack(track.uri); }}
            >
              <td className="track-number">
                <span className="track-number-static">{idx + 1}</span>
                  <span className="track-number-play"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="8,5 19,12 8,19" /></svg></span>
              </td>
              <td>
                <div className="track-info">
                  <div className="track-name">
                    {track.explicit && <span className="track-explicit">E</span>}
                    {track.name}
                  </div>
                </div>
              </td>
              <td className="track-duration">{formatDuration(track.duration_ms)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
