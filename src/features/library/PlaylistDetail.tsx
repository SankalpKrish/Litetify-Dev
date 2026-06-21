import { usePlaylist } from '../../lib/queries/usePlaylist';
import { usePlaylistTracks } from '../../lib/queries/usePlaylistTracks';
import { getImage, formatDuration } from '../../lib/utils';
import { usePlayerStore } from '../player/playerStore';

interface PlaylistDetailProps {
  playlistId: string;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

export function PlaylistDetail({ playlistId, onNavigate }: PlaylistDetailProps) {
  const { data: playlist, isLoading: plLoading, error: plError } = usePlaylist(playlistId);
  const { data: tracksData, isLoading: trLoading, error: trError } = usePlaylistTracks(playlistId);
  const playTrack = usePlayerStore((s) => s.playTrack);

  if (plLoading || trLoading) {
    return (
      <div className="empty-state">
        <div className="empty-state-desc">Loading playlist...</div>
      </div>
    );
  }

  if (plError || !playlist) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Could not load playlist</div>
        <div className="empty-state-desc">It may have been removed or you may not have access.</div>
      </div>
    );
  }

  if (trError) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Could not load all tracks</div>
        <div className="empty-state-desc">Some tracks may not be displayed. Try again later.</div>
      </div>
    );
  }

  const trackItems = tracksData?.items ?? playlist.tracks.items ?? [];

  return (
    <div>
      <div className="detail-header">
        <img
          className="detail-image"
          src={getImage(playlist.images, 256)}
          alt={playlist.name}
        />
        <div className="detail-meta">
          <div className="detail-type">Playlist</div>
          <h1 className="detail-name">{playlist.name}</h1>
          {playlist.description && (
            <p className="detail-desc">{playlist.description}</p>
          )}
          <div className="detail-stats">
            <strong>{playlist.owner.display_name ?? playlist.owner.id}</strong>
            {' · '}{playlist.tracks.total} track{playlist.tracks.total !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="detail-action-bar">
        <button
          className="play-btn"
          onClick={() => {
            const first = trackItems[0]?.track;
            if (first) playTrack(first.uri);
          }}
          aria-label="Play"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="8,5 19,12 8,19" />
          </svg>
        </button>
      </div>

      {trackItems.length > 0 && (
        <table className="track-table">
          <thead>
            <tr>
              <th style={{ width: 32 }}>#</th>
              <th>Title</th>
              <th>Album</th>
              <th style={{ width: 60, textAlign: 'right' }}>Duration</th>
            </tr>
          </thead>
          <tbody>
            {trackItems.filter((item) => item.track).map((item, idx) => {
              const track = item.track!;
              return (
                <tr
                  key={track.id ?? `local-${idx}-${track.uri}`}
                  className="track-row"
                  onClick={() => playTrack(track.uri)}
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
                      <div className="track-artist">
                        {track.artists.map((a, i) => (
                          <span key={a.id}>
                            {i > 0 && ', '}
                            <button
                              className="track-artist-link"
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigate('artist', { id: a.id });
                              }}
                            >
                              {a.name}
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td>
                    {track.album && (
                      <button
                        className="track-album"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('album', { id: track.album.id });
                        }}
                      >
                        {track.album.name}
                      </button>
                    )}
                  </td>
                  <td className="track-duration">{formatDuration(track.duration_ms)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
