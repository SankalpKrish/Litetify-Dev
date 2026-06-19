import { memo, useCallback, useRef, useState } from 'react';
import { usePlayerStore } from './playerStore';

function fmt(ms: number): string {
  if (!ms || ms < 0) return '0:00';
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export const ProgressBar = memo(function ProgressBar() {
  const durationMs = usePlayerStore((s) => s.durationMs);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const setState = usePlayerStore((s) => s.setState);
  const barRef = useRef<HTMLDivElement>(null);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubPos, setScrubPos] = useState(0);

  const fraction = durationMs > 0 ? positionMs / durationMs : 0;
  const displayFraction = scrubbing ? scrubPos : fraction;
  const displayPos = scrubbing ? Math.round(scrubPos * durationMs) : positionMs;

  const seek = useCallback(
    async (clientX: number) => {
      const el = barRef.current;
      if (!el || durationMs <= 0) return;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const frac = x / rect.width;
      const target = Math.round(frac * durationMs);
      setState({ positionMs: target });
      await import('../../playback/websdk').then((m) =>
        m.webSdkEngine.seek(target),
      );
    },
    [durationMs, setState],
  );

  const onDown = useCallback(
    (e: React.PointerEvent) => {
      setScrubbing(true);
      const el = barRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setScrubPos(
        Math.max(0, Math.min(e.clientX - rect.left, rect.width)) / rect.width,
      );
    },
    [],
  );

  const onMove = useCallback(
    (e: React.PointerEvent) => {
      if (!scrubbing) return;
      const el = barRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setScrubPos(
        Math.max(0, Math.min(e.clientX - rect.left, rect.width)) / rect.width,
      );
    },
    [scrubbing],
  );

  const onUp = useCallback(
    (e: React.PointerEvent) => {
      setScrubbing(false);
      seek(e.clientX);
    },
    [seek],
  );

  return (
    <div className="progress-area">
      <span className="progress-time">{fmt(displayPos)}</span>
      <div
        ref={barRef}
        className="progress-bar"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={() => scrubbing && setScrubbing(false)}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={durationMs}
        aria-valuenow={displayPos}
        tabIndex={0}
        onKeyDown={(e) => {
          if (durationMs <= 0) return;
          const step = durationMs * 0.02;
          let target = positionMs;
          if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            target = Math.min(positionMs + step, durationMs);
          } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            target = Math.max(positionMs - step, 0);
          } else if (e.key === 'Home') {
            e.preventDefault();
            target = 0;
          } else if (e.key === 'End') {
            e.preventDefault();
            target = durationMs;
          } else {
            return;
          }
          setState({ positionMs: target });
          import('../../playback/websdk').then((m) =>
            m.webSdkEngine.seek(target),
          );
        }}
      >
        <div
          className="progress-fill"
          style={{ width: `${displayFraction * 100}%` }}
        />
        <div
          className="progress-thumb"
          style={{ left: `${displayFraction * 100}%` }}
        />
      </div>
      <span className="progress-time">{fmt(durationMs)}</span>
    </div>
  );
});
