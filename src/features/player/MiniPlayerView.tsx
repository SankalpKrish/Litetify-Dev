import { usePlayerStore } from './playerStore';
import { getImage } from '../../lib/utils';

export function MiniPlayerView() {
  const name = usePlayerStore((s) => s.name);
  const artist = usePlayerStore((s) => s.artist);
  const albumImage = usePlayerStore((s) => s.albumImage);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const engine = usePlayerStore((s) => s.engine);

  const playPause = () => {
    if (!engine) return;
    if (isPlaying) engine.pause();
    else engine.resume();
  };

  const next = () => engine?.nextTrack();
  const prev = () => engine?.previousTrack();

  return (
    <div className="mini-player">
      <div className="mini-player-art">
        {albumImage ? (
          <img src={getImage([{ url: albumImage }], 300)} alt="" />
        ) : (
          <div className="mini-player-art-placeholder">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
          </div>
        )}
      </div>
      <div className="mini-player-info">
        <div className="mini-player-title">{name || 'No track'}</div>
        <div className="mini-player-artist">{artist || ''}</div>
      </div>
      <div className="mini-player-controls">
        <button className="ctrl-btn" onClick={prev} aria-label="Previous">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="19 20 9 12 19 4" /><line x1="5" y1="19" x2="5" y2="5" /></svg>
        </button>
        <button className="ctrl-btn ctrl-btn--play" onClick={playPause} aria-label={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="8,5 19,12 8,19" /></svg>
          )}
        </button>
        <button className="ctrl-btn" onClick={next} aria-label="Next">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 4 15 12 5 20" /><line x1="19" y1="5" x2="19" y2="19" /></svg>
        </button>
      </div>
    </div>
  );
}
