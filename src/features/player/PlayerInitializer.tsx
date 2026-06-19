import { useEffect, useRef } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ensurePlayer, webSdkEngine } from '../../playback/websdk';
import { usePlayerStore } from './playerStore';
import { setPlaybackEngine, setStateChangeCallbacks } from '../../mods/api';
import { emitEvent } from '../../mods/api';

export function PlayerInitializer() {
  const initialized = useRef(false);
  const setState = usePlayerStore((s) => s.setState);
  const setEngine = usePlayerStore((s) => s.setEngine);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    setEngine(webSdkEngine);
    setPlaybackEngine(webSdkEngine);

    setStateChangeCallbacks([
      (state) => emitEvent('playback:stateChange', state),
    ]);

    invoke<string>('get_valid_token', { clientId: '' })
      .then((token) => ensurePlayer(token))
      .then(() => {
        void invoke('api_get_currently_playing', { clientId: '' })
          .then((data) => {
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
          .catch(() => {});
      })
      .catch((err) => console.error('Player init failed:', err));
  }, [setState, setEngine]);

  return null;
}
