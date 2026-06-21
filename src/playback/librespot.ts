import { invoke } from '@tauri-apps/api/core';
import { usePlayerStore } from '../features/player/playerStore';
import type { PlaybackEngine } from './engine';

export const librespotEngine: PlaybackEngine = {
  async play(uri?: string) {
    await invoke('librespot_play', { uri: uri ?? null });
  },

  async pause() {
    await invoke('librespot_pause');
  },

  async resume() {
    await invoke('librespot_resume');
  },

  async seek(positionMs: number) {
    await invoke('librespot_seek', { positionMs });
  },

  async setVolume(volume: number) {
    usePlayerStore.getState().setState({ volume });
    await invoke('librespot_set_volume', { volume });
  },

  async nextTrack() {
    await invoke('librespot_next');
  },

  async previousTrack() {
    await invoke('librespot_previous');
  },

  async toggleShuffle() {
    await invoke('librespot_toggle_shuffle');
  },

  async cycleRepeat() {
  },

  async getState() {
    return usePlayerStore.getState() as import('./engine').PlaybackState;
  },

  name() {
    return 'librespot';
  },
};
