import { memo, useCallback, useRef } from 'react';
import { usePlayerStore } from './playerStore';
import type { RepeatMode } from '../../playback/engine';

function RepeatIcon(_: { mode: RepeatMode }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function ShuffleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
      <line x1="4" y1="4" x2="9" y2="9" />
    </svg>
  );
}

function SkipIcon({ direction }: { direction: 'prev' | 'next' }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      {direction === 'prev' ? (
        <>
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
        </>
      ) : (
        <>
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z" />
        </>
      )}
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="8,5 19,12 8,19" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function useEngine() {
  return usePlayerStore((s) => s.getEngine)();
}

export const TransportControls = memo(function TransportControls() {
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const engine = useEngine();
  // Tracks the time of the last "previous" press so a second press within the
  // window skips to the previous track instead of restarting the current one.
  const lastPrevPress = useRef(0);

  const togglePlay = useCallback(() => {
    if (!engine) return;
    if (isPlaying) {
      engine.pause().catch(() => {});
    } else {
      engine.resume().catch(() => {});
    }
  }, [isPlaying, engine]);

  const act = useCallback(
    (fn: () => Promise<void>) => {
      if (engine) fn().catch(() => {});
    },
    [engine],
  );

  // Spotify-style previous: restart the current track; press again within 3s to
  // jump to the actual previous track.
  const handlePrevious = useCallback(() => {
    if (!engine) return;
    const now = Date.now();
    const withinWindow = now - lastPrevPress.current < 3000;
    const positionMs = usePlayerStore.getState().positionMs;
    if (withinWindow || positionMs < 3000) {
      engine.previousTrack().catch(() => {});
      lastPrevPress.current = 0; // consume the window
    } else {
      engine.seek(0).catch(() => {});
      lastPrevPress.current = now;
    }
  }, [engine]);

  return (
    <div className="transport-controls">
      <button
        className={`ctrl-btn ${shuffle ? 'ctrl-active' : ''}`}
        onClick={() => act(() => engine!.toggleShuffle())}
        title="Shuffle"
        aria-label="Toggle shuffle"
      >
        <ShuffleIcon />
      </button>
      <button
        className="ctrl-btn"
        onClick={handlePrevious}
        title="Previous"
        aria-label="Previous track"
      >
        <SkipIcon direction="prev" />
      </button>
      <button className="ctrl-btn ctrl-play" onClick={togglePlay} title={isPlaying ? 'Pause' : 'Play'} aria-label={isPlaying ? 'Pause' : 'Play'}>
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      <button
        className="ctrl-btn"
        onClick={() => act(() => engine!.nextTrack())}
        title="Next"
        aria-label="Next track"
      >
        <SkipIcon direction="next" />
      </button>
      <button
        className={`ctrl-btn ${repeat !== 'off' ? 'ctrl-active' : ''}`}
        onClick={() => act(() => engine!.cycleRepeat())}
        title={`Repeat: ${repeat}`}
        aria-label="Cycle repeat mode"
      >
        <RepeatIcon mode={repeat} />
        {repeat === 'track' && <span className="repeat-indicator">1</span>}
      </button>
    </div>
  );
});
