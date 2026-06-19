import { create } from 'zustand';
import type { PlaybackState, PlaybackEngine } from '../../playback/engine';

const initialState: PlaybackState = {
  uri: null,
  trackId: null,
  name: null,
  artist: null,
  album: null,
  albumImage: null,
  durationMs: 0,
  positionMs: 0,
  isPlaying: false,
  volume: 50,
  shuffle: false,
  repeat: 'off',
  deviceId: null,
};

export interface PlayerStore extends PlaybackState {
  setState: (partial: Partial<PlaybackState>) => void;
  reset: () => void;
  setEngine: (engine: PlaybackEngine) => void;
  playTrack: (uri: string) => Promise<void>;
}

let engineRef: PlaybackEngine | null = null;

export const usePlayerStore = create<PlayerStore>((set) => ({
  ...initialState,
  setState: (partial) => set(partial),
  reset: () => set(initialState),
  setEngine: (engine) => { engineRef = engine; },
  playTrack: async (uri: string) => {
    if (engineRef) {
      await engineRef.play(uri);
    }
  },
}));
