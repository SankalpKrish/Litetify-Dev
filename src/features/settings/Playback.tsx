import { useState } from 'react';
import { getStoredEngineType, setStoredEngineType } from '../player/playerStore';
import type { EngineType } from '../player/playerStore';
import {
  getAutoQueueEnabled,
  setAutoQueueEnabled,
  getAutoQueueShowToast,
  setAutoQueueShowToast,
  getAutoQueueSeedStrategy,
  setAutoQueueSeedStrategy,
  type SeedStrategy,
} from '../player/autoQueue';

export function PlaybackSettings() {
  const [current, setCurrent] = useState<EngineType>(getStoredEngineType);
  const [showWarning, setShowWarning] = useState(false);
  const [pending, setPending] = useState<EngineType | null>(null);
  const [autoQueueEnabled, setAutoQueueEnabledState] = useState(getAutoQueueEnabled);
  const [showToast, setShowToastState] = useState(getAutoQueueShowToast);
  const [seedStrategy, setSeedStrategyState] = useState<SeedStrategy>(getAutoQueueSeedStrategy);

  function handleToggle() {
    const next: EngineType = current === 'websdk' ? 'librespot' : 'websdk';
    if (next === 'librespot') {
      setPending(next);
      setShowWarning(true);
    } else {
      applySwitch(next);
    }
  }

  function applySwitch(t: EngineType) {
    setStoredEngineType(t);
    setCurrent(t);
    setShowWarning(false);
    setPending(null);
  }

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h2>Playback Engine</h2>
      </div>

      <div className="settings-section">
        <div className="mod-item">
          <div className="mod-item-info">
            <strong>Native audio engine (experimental, unofficial)</strong>
            <p className="mod-item-desc">
              Use librespot for local audio playback instead of the Spotify Web Playback SDK.
              {current === 'librespot' && (
                <span style={{ display: 'block', marginTop: 4, color: 'var(--lt-accent)', fontWeight: 600 }}>
                  Active — restart required to switch
                </span>
              )}
              {current === 'websdk' && (
                <span style={{ display: 'block', marginTop: 4, color: 'var(--lt-fg-tertiary)', fontSize: 'var(--lt-font-size-xs)' }}>
                  Default — changes apply after restart
                </span>
              )}
            </p>
          </div>
          <label className="toggle-label">
            <input type="checkbox" checked={current === 'librespot'} onChange={handleToggle} />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      <div className="settings-header" style={{ marginTop: 'var(--lt-space-xl)' }}>
        <h2>Auto-Queue</h2>
      </div>

      <div className="settings-section">
        <div className="mod-item">
          <div className="mod-item-info">
            <strong>Auto-queue similar tracks</strong>
            <p className="mod-item-desc">
              Automatically queue a similar track when the current track ends and the queue is empty.
            </p>
          </div>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={autoQueueEnabled}
              onChange={() => {
                const next = !autoQueueEnabled;
                setAutoQueueEnabledState(next);
                setAutoQueueEnabled(next);
              }}
            />
            <span className="toggle-slider" />
          </label>
        </div>
      </div>

      {autoQueueEnabled && (
        <>
          <div className="settings-section">
            <div className="mod-item">
              <div className="mod-item-info">
                <strong>Show notification</strong>
                <p className="mod-item-desc">
                  Show a toast notification when a track is auto-queued.
                </p>
              </div>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={showToast}
                  onChange={() => {
                    const next = !showToast;
                    setShowToastState(next);
                    setAutoQueueShowToast(next);
                  }}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>

          <div className="settings-section">
            <div className="mod-item">
              <div className="mod-item-info">
                <strong>Seed strategy</strong>
                <p className="mod-item-desc">
                  Currently: {seedStrategy === 'current' ? 'Current track only' : 'Mixed with top tracks'}. Click to switch to {seedStrategy === 'current' ? 'mixed seeds (more variety)' : 'current track only (more consistent)'}.
                </p>
              </div>
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={seedStrategy === 'mix'}
                  onChange={() => {
                    const next: SeedStrategy = seedStrategy === 'current' ? 'mix' : 'current';
                    setSeedStrategyState(next);
                    setAutoQueueSeedStrategy(next);
                  }}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </>
      )}

      {showWarning && (
        <div className="engine-warning-overlay" onClick={() => setShowWarning(false)}>
          <div className="engine-warning-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Unofficial Engine Warning</h3>
            <div className="engine-warning-body">
              <p>
                <strong>librespot</strong> is an <strong>open-source, third-party</strong> Spotify client
                library not affiliated with or endorsed by Spotify AB.
              </p>
              <p>
                By enabling this engine:
              </p>
              <ul>
                <li>Audio plays directly from your machine, not through Spotify's Web Playback SDK.</li>
                <li>This may violate Spotify's Terms of Service.</li>
                <li>Some features (Spotify Connect, remote control) may not work.</li>
                <li>This is experimental — you may encounter bugs or audio issues.</li>
              </ul>
              <p className="engine-warning-disclaimer">
                Litetify is not responsible for any account actions taken by Spotify as a result of
                using this engine. Use at your own risk.
              </p>
            </div>
            <div className="engine-warning-actions">
              <button className="btn btn-secondary" onClick={() => setShowWarning(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={() => pending && applySwitch(pending)}>
                I Understand, Enable
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
