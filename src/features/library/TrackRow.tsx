import { useContextMenuStore } from '../contextmenu/contextMenuStore';
import { TrackMenuButton } from '../contextmenu/TrackMenuButton';
import { formatDuration } from '../../lib/utils';
import type { SpotifyTrack } from '../../lib/types';
import type { PlayContext } from '../../playback/engine';

interface TrackRowProps {
  track: SpotifyTrack;
  index: number;
  /** URI list for queue-based playback (Liked Songs, artist top tracks). */
  queueUris?: string[];
  /** Context URI for context-based playback (playlist, album). */
  contextUri?: string;
  onPlay: (uri: string, context: PlayContext) => void;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}

export function TrackRow({ track, index, queueUris, contextUri, onPlay, onNavigate }: TrackRowProps) {
  const openContextMenu = useContextMenuStore((s) => s.openMenu);

  const playContext: PlayContext = contextUri
    ? { contextUri, offsetUri: track.uri }
    : { uris: queueUris, offsetUri: track.uri };

  return (
    <tr
      className="track-row"
      onClick={() => onPlay(track.uri, playContext)}
      onContextMenu={(e) => {
        e.preventDefault();
        openContextMenu(e.clientX, e.clientY, { kind: 'track', track, contextUri, queueUris });
      }}
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onPlay(track.uri, playContext); }}
    >
      <td className="track-number">
        <span className="track-number-static">{index + 1}</span>
        <span className="track-number-play">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="8,5 19,12 8,19" />
          </svg>
        </span>
      </td>
      <td>
        <div className="track-info">
          <div className="track-name">
            {track.explicit && <span className="track-explicit">E</span>}
            {track.name || 'Unknown track'}
          </div>
          <div className="track-artist">
            {track.artists.length > 0
              ? track.artists.map((a, i) => (
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
                ))
              : <span className="track-artist-link">Unknown artist</span>}
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
        <TrackMenuButton track={track} contextUri={contextUri} queueUris={queueUris} />
      </td>
    </tr>
  );
}
