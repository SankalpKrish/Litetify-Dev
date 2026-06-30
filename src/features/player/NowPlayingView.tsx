import { memo, useCallback, useRef, useState } from 'react';
import { usePlayerStore } from './playerStore';
import { ProgressBar } from './ProgressBar';

// ── Icons ───────────────────────────────────────────────────────────────────

function BackIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function ShuffleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
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
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="8,5 19,12 8,19" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  );
}

function SpeakerIcon({ muted }: { muted: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      {muted ? (
        <line x1="23" y1="9" x2="17" y2="15" />
      ) : (
        <>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </>
      )}
    </svg>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'var(--lt-bg-base, #080808)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 24px',
    overflow: 'auto',
  },
  overlayEmpty: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'var(--lt-bg-base, #080808)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px 24px',
  },
  backBtn: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    color: 'var(--lt-fg-secondary, #b3b3b3)',
    cursor: 'pointer',
    borderRadius: 'var(--lt-radius-full, 50%)',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 24,
    maxWidth: 480,
    width: '100%',
  },
  art: {
    width: 300,
    height: 300,
    borderRadius: 8,
    objectFit: 'cover',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    background: 'var(--lt-bg-elevated, #1a1a1a)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  artFallback: {
    width: 300,
    height: 300,
    borderRadius: 8,
    background: 'var(--lt-bg-elevated, #1a1a1a)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    color: 'var(--lt-fg-tertiary, #535353)',
  },
  info: {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    width: '100%',
  },
  trackName: {
    fontSize: '1.5rem',
    fontWeight: 700,
    color: 'var(--lt-fg-primary, #fff)',
    lineHeight: 1.3,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  artist: {
    fontSize: '0.95rem',
    color: 'var(--lt-fg-secondary, #b3b3b3)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  albumLink: {
    fontSize: '0.9rem',
    color: 'var(--lt-fg-secondary, #b3b3b3)',
    background: 'none',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    textDecoration: 'underline',
    textDecorationColor: 'transparent',
    transition: 'text-decoration-color 0.15s',
  },
  progressSection: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  playBtn: {
    width: 56,
    height: 56,
    borderRadius: 'var(--lt-radius-full, 50%)',
    background: 'var(--lt-fg-primary, #fff)',
    border: 'none',
    color: 'var(--lt-bg-base, #080808)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'transform 0.1s, opacity 0.15s',
  },
  volumeSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    maxWidth: 300,
  },
  volumeBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    background: 'var(--lt-bg-elevated, #282828)',
    position: 'relative',
    cursor: 'pointer',
    touchAction: 'none',
  },
  volumeFill: {
    height: '100%',
    borderRadius: 2,
    background: 'var(--lt-fg-primary, #fff)',
    transformOrigin: 'left center',
  },
  emptyText: {
    fontSize: '1.1rem',
    color: 'var(--lt-fg-secondary, #b3b3b3)',
    marginTop: 16,
  },
};

// ── Component ───────────────────────────────────────────────────────────────

interface NowPlayingViewProps {
  onNavigate: (view: string, params?: Record<string, string>) => void;
  onBack: () => void;
}

function NowPlayingViewInner({ onNavigate, onBack }: NowPlayingViewProps) {
  const name = usePlayerStore((s) => s.name);
  const artist = usePlayerStore((s) => s.artist);
  const album = usePlayerStore((s) => s.album);
  const albumImage = usePlayerStore((s) => s.albumImage);
  const albumUri = usePlayerStore((s) => s.albumUri);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const volume = usePlayerStore((s) => s.volume);
  const engine = usePlayerStore((s) => s.engine);
  const setState = usePlayerStore((s) => s.setState);

  const togglePlay = useCallback(() => {
    if (!engine) return;
    if (isPlaying) engine.pause().catch(() => {});
    else engine.resume().catch(() => {});
  }, [isPlaying, engine]);

  const act = useCallback(
    (fn: () => Promise<void>) => {
      if (engine) fn().catch(() => {});
    },
    [engine],
  );

  const handleAlbumClick = useCallback(() => {
    if (!albumUri) return;
    // spotify:album:<id> → extract the ID
    const parts = albumUri.split(':');
    const id = parts[parts.length - 1];
    if (id) onNavigate('album', { id });
  }, [albumUri, onNavigate]);

  // ── Volume slider (self-contained, reuses pointer pattern) ──────────────
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const rectRef = useRef<DOMRect | null>(null);

  const setVol = useCallback(
    async (clientX: number) => {
      const el = barRef.current;
      if (!el || !engine) return;
      const rect = rectRef.current ?? el.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const vol = Math.round((x / rect.width) * 100);
      setState({ volume: vol });
      await engine.setVolume(vol);
    },
    [setState, engine],
  );

  const onDown = useCallback(
    (e: React.PointerEvent) => {
      setDragging(true);
      rectRef.current = barRef.current?.getBoundingClientRect() ?? null;
      setVol(e.clientX);
    },
    [setVol],
  );

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      setVol(e.clientX);
    },
    [dragging, setVol],
  );

  const onUp = useCallback(
    (e: React.PointerEvent) => {
      setDragging(false);
      setVol(e.clientX);
    },
    [setVol],
  );

  // ── Empty state ─────────────────────────────────────────────────────────
  if (!name) {
    return (
      <div style={S.overlayEmpty}>
        <button
          className="ctrl-btn"
          style={S.backBtn}
          onClick={onBack}
          aria-label="Back"
        >
          <BackIcon />
        </button>
        <div style={S.artFallback}>
          <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="10" />
          </svg>
        </div>
        <div style={S.emptyText}>No track playing</div>
      </div>
    );
  }

  return (
    <div style={S.overlay}>
      {/* Back */}
      <button
        className="ctrl-btn"
        style={S.backBtn}
        onClick={onBack}
        aria-label="Back"
      >
        <BackIcon />
      </button>

      {/* Content */}
      <div style={S.content}>
        {/* Album art */}
        {albumImage ? (
          <img
            style={S.art}
            src={albumImage}
            alt={`${album ?? 'Album'} cover`}
          />
        ) : (
          <div style={S.artFallback}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
        )}

        {/* Track info */}
        <div style={S.info}>
          <div style={S.trackName} title={name}>
            {name}
          </div>
          <div style={S.artist} title={artist ?? ''}>
            {artist}
          </div>
          {album && (
            albumUri ? (
              <button
                style={S.albumLink}
                onClick={handleAlbumClick}
                title={album}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.textDecorationColor = '';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.textDecorationColor = 'transparent';
                }}
              >
                {album}
              </button>
            ) : (
              <div style={S.albumLink as React.CSSProperties}>{album}</div>
            )
          )}
        </div>

        {/* Progress bar */}
        <div style={S.progressSection}>
          <ProgressBar />
        </div>

        {/* Transport controls */}
        <div style={S.controls}>
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
            onClick={() => act(() => engine!.previousTrack())}
            title="Previous"
            aria-label="Previous track"
          >
            <SkipIcon direction="prev" />
          </button>
          <button
            style={S.playBtn}
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = '1';
            }}
          >
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
            <RepeatIcon />
          </button>
        </div>

        {/* Volume */}
        <div style={S.volumeSection}>
          <button
            className="ctrl-btn"
            onClick={() => {
              if (!engine) return;
              if (volume === 0) {
                setState({ volume: 50 });
                engine.setVolume(50).catch(() => {});
              } else {
                setState({ volume: 0 });
                engine.setVolume(0).catch(() => {});
              }
            }}
            aria-label={volume === 0 ? 'Unmute' : 'Mute'}
            title={volume === 0 ? 'Unmute' : 'Mute'}
          >
            <SpeakerIcon muted={volume === 0} />
          </button>
          <div
            ref={barRef}
            style={S.volumeBar}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerLeave={() => dragging && setDragging(false)}
            role="slider"
            aria-label="Volume"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={volume}
            tabIndex={0}
            onKeyDown={(e) => {
              if (!engine) return;
              let newVol = volume;
              if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                e.preventDefault();
                newVol = Math.min(volume + 5, 100);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                e.preventDefault();
                newVol = Math.max(volume - 5, 0);
              } else if (e.key === 'Home') {
                e.preventDefault();
                newVol = 0;
              } else if (e.key === 'End') {
                e.preventDefault();
                newVol = 100;
              } else {
                return;
              }
              setState({ volume: newVol });
              engine.setVolume(newVol).catch(() => {});
            }}
          >
            <div
              style={{ ...S.volumeFill, transform: `scaleX(${volume / 100})` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export const NowPlayingView = memo(NowPlayingViewInner);
