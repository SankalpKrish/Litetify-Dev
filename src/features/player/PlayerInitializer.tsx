import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ensurePlayer, webSdkEngine } from '../../playback/websdk';
import { librespotEngine } from '../../playback/librespot';
import { usePlayerStore, getStoredEngineType } from './playerStore';
import { getStoredClientId } from '../auth/authStore';
import { setPlaybackEngine, setStateChangeCallbacks } from '../../mods/api';
import { emitEvent } from '../../mods/api';
import { useMediaSession } from './useMediaSession';

export function PlayerInitializer() {
  const initialized = useRef(false);
  const abortRef = useRef(false);
  const setState = usePlayerStore((s) => s.setState);
  const setEngine = usePlayerStore((s) => s.setEngine);

  useMediaSession();

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const engineType = getStoredEngineType();
    const engine = engineType === 'librespot' ? librespotEngine : webSdkEngine;
    const clientId = getStoredClientId();

    setEngine(engine);
    setPlaybackEngine(engine);

    setStateChangeCallbacks([
      (state) => emitEvent('playback:stateChange', state),
    ]);

    if (engineType === 'librespot') {
      void invoke('init_librespot', { clientId })
        .then(() => console.log('[librespot] engine initialized'))
        .catch((err) => console.error('[librespot] init failed:', err));
      return;
    }

    invoke<string>('get_valid_token', { clientId })
      .then((token) => {
        if (abortRef.current) return;
        return ensurePlayer(token);
      })
      .then(() => {
        if (abortRef.current) return;
        void invoke('api_get_currently_playing', { clientId })
          .then((data) => {
            if (abortRef.current) return;
            const cp = data as {
              item?: { name?: string; uri?: string; duration_ms?: number; artists?: { name: string }[]; album?: { images?: { url: string }[]; name?: string } } | null;
              is_playing?: boolean;
              progress_ms?: number | null;
            };
            if (cp.item) {
              setState({
                name: cp.item.name ?? null,
                uri: cp.item.uri ?? null,
                durationMs: cp.item.duration_ms ?? 0,
                positionMs: cp.progress_ms ?? 0,
                isPlaying: cp.is_playing ?? false,
                artist: cp.item.artists?.map((a) => a.name).join(', ') ?? null,
                album: cp.item.album?.name ?? null,
                albumImage: cp.item.album?.images?.[0]?.url ?? null,
              });
            }
          })
          .catch((err) => console.error('[currently_playing] fetch failed:', err));
      })
      .catch((err) => console.error('Player init failed:', err));
    return () => { abortRef.current = true; };
  }, [setState, setEngine]);

  return null;
}
