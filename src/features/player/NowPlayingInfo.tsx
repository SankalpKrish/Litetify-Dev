import { memo } from 'react';
import { usePlayerStore } from './playerStore';

function NowPlayingInfoInner() {
  const name = usePlayerStore((s) => s.name);
  const artist = usePlayerStore((s) => s.artist);
  const albumImage = usePlayerStore((s) => s.albumImage);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  if (!name) {
    return (
      <div className="np-info np-empty">
        <div className="np-art" />
        <div className="np-text">
          <span className="np-name np-placeholder">No track playing</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`np-info ${isPlaying ? '' : 'np-paused'}`}>
      {albumImage ? (
        <img className="np-art" src={albumImage} alt="" />
      ) : (
        <div className="np-art np-art-fallback" />
      )}
      <div className="np-text">
        <span className="np-name" title={name}>{name}</span>
        <span className="np-artist" title={artist ?? ''}>{artist}</span>
      </div>
    </div>
  );
}

export const NowPlayingInfo = memo(NowPlayingInfoInner);
