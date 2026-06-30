import { useMemo } from 'react';
import { useLikedTracks } from '../../lib/queries/useLikedTracks';
import { formatDuration } from '../../lib/utils';
import { usePlayerStore } from '../player/playerStore';
import { useContextMenuStore } from '../contextmenu/contextMenuStore';
import { TrackMenuButton } from '../contextmenu/TrackMenuButton';

interface LikedSongsProps {
  query: string;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

export function LikedSongs({ query, onNavigate }: LikedSongsProps) {
  const { data, isLoading, error } = useLikedTracks(50);
  const playTrack = usePlayerStore((s) => s.playTrack);
  const openContextMenu = useContextMenuStore((s) => s.openMenu);

  const filtered = useMemo(() => {
    if (!data) return null;
    let items = data.items;
    if (query) {
      const q = query.toLowerCase();
      items = items.filter((item) => {
        const t = item.track;
        if (!t) return false;
        return (
          t.name.toLowerCase().includes(q) ||
          (t.artists && t.artists.some((a) => a.name.toLowerCase().includes(q))) ||
          (t.album && t.album.name.toLowerCase().includes(q))
        );
      });
    }
    return { ...data, items };
  }, [data, query]);

  if (isLoading) {
    return (
      <div className="empty-state">
        <div className="empty-state-desc">Loading liked songs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">Could not load liked songs</div>
        <div className="empty-state-desc">Try again later.</div>
      </div>
    );
  }

  if (!filtered || !data || data.items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-title">No liked songs yet</div>
        <div className="empty-state-desc">Tap the heart icon on any track to save it here.</div>
      </div>
    );
  }

  if (query && filtered.items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-desc">No songs match "{query}".</div>
      </div>
    );
  }

  return (
    <div>
      <div className="detail-header">
        <div className="detail-image" style={{ background: 'linear-gradient(135deg, var(--lt-accent), var(--lt-bg-base))' }}>
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ color: 'var(--lt-accent)' }}>
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </div>
        </div>
        <div className="detail-meta">
          <div className="detail-type">Playlist</div>
          <h2 className="sr-only">Liked Songs</h2>
          <div className="detail-stats">
            <strong>{filtered.total}</strong> song{filtered.total !== 1 ? 's' : ''}
          </div>
        </div>
      </div>

      <div className="detail-action-bar">
        <button
          className="play-btn"
          onClick={() => {
            const queue = filtered.items.map((i) => i.track?.uri).filter((u): u is string => !!u);
            const first = filtered.items[0]?.track;
            if (first) playTrack(first.uri, { uris: queue, offsetUri: first.uri });
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
            <th>Album</th>
            <th style={{ width: 60, textAlign: 'right' }}>Duration</th>
          </tr>
        </thead>
        <tbody>
          {filtered.items.map((item, idx) => {
            const track = item.track;
            const queue = filtered.items.map((i) => i.track?.uri).filter((u): u is string => !!u);
            return (
              <tr
                key={track.id ?? `local-${idx}-${track.uri}`}
                className="track-row"
                onClick={() => playTrack(track.uri, { uris: queue, offsetUri: track.uri })}
                onContextMenu={(e) => { e.preventDefault(); openContextMenu(e.clientX, e.clientY, { kind: 'track', track, queueUris: queue }); }}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') playTrack(track.uri, { uris: queue, offsetUri: track.uri }); }}
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
                        onNavigate('album', { id: track.album!.id });
                      }}
                    >
                      {track.album.name}
                    </button>
                  )}
                </td>
                <td className="track-duration">
                  <span className="track-duration-text">{formatDuration(track.duration_ms)}</span>
                  <TrackMenuButton track={track} queueUris={queue} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
