import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ensurePlayer, webSdkEngine } from '../../playback/websdk';
import { librespotEngine } from '../../playback/librespot';
import { usePlayerStore } from './playerStore';
import { getStoredClientId } from '../auth/authStore';
import { setPlaybackEngine, setStateChangeCallbacks } from '../../mods/api';
import { emitEvent } from '../../mods/api';
import { useMediaSession } from './useMediaSession';

export function PlayerInitializer() {
  const initialized = useRef(false);
  const setState = usePlayerStore((s) => s.setState);
  const setEngine = usePlayerStore((s) => s.setEngine);

  useMediaSession();

  useEffect(() => {
    // `initialized` guards against React 18 StrictMode's double-invocation in dev.
    // We intentionally do NOT abort on cleanup: the StrictMode unmount/remount would
    // otherwise cancel the in-flight token fetch and leave the player uninitialized.
    if (initialized.current) return;
    initialized.current = true;

    const engineType = usePlayerStore.getState().engineType;
    const engine = engineType === 'librespot' ? librespotEngine : webSdkEngine;
    const clientId = getStoredClientId();
    console.log('[litetify][init] PlayerInitializer running. engineType =', engineType, 'clientId set =', !!clientId);

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

    console.log('[litetify][init] websdk path — fetching token then ensurePlayer');
    invoke<string>('get_valid_token', { clientId })
      .then((token) => {
        console.log('[litetify][init] token acquired, calling ensurePlayer');
        return ensurePlayer(token);
      })
      .then(() => {
        void invoke('api_get_currently_playing', { clientId })
          .then((data) => {
            // null when nothing is playing (Spotify 204)
            const cp = data as {
              item?: { name?: string; uri?: string; duration_ms?: number; artists?: { name: string }[]; album?: { images?: { url: string }[]; name?: string; uri?: string } } | null;
              is_playing?: boolean;
              progress_ms?: number | null;
            } | null;
            if (cp?.item) {
              setState({
                name: cp.item.name ?? null,
                uri: cp.item.uri ?? null,
                durationMs: cp.item.duration_ms ?? 0,
                positionMs: cp.progress_ms ?? 0,
                isPlaying: cp.is_playing ?? false,
                artist: cp.item.artists?.map((a) => a.name).join(', ') ?? null,
                album: cp.item.album?.name ?? null,
                albumUri: cp.item.album?.uri ?? null,
                albumImage: cp.item.album?.images?.[0]?.url ?? null,
              });
            }
          })
          .catch((err) => console.error('[currently_playing] fetch failed:', err));
      })
      .catch((err) => console.error('Player init failed:', err));
  }, [setState, setEngine]);

  return null;
}
