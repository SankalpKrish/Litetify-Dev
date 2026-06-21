import { create } from 'zustand';
import type { PlaybackState, PlaybackEngine } from '../../playback/engine';

export type EngineType = 'websdk' | 'librespot';

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
  setEngineType: (t: EngineType) => void;
  getEngineType: () => EngineType;
  getEngine: () => PlaybackEngine | null;
  playTrack: (uri: string) => Promise<void>;
}

let engineRef: PlaybackEngine | null = null;
let engineType: EngineType = 'websdk';

export function getStoredEngineType(): EngineType {
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem('litetify:engineType');
    if (stored === 'librespot' || stored === 'websdk') return stored;
  }
  return 'websdk';
}

export function setStoredEngineType(t: EngineType): void {
  engineType = t;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('litetify:engineType', t);
  }
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  ...initialState,
  setState: (partial) => set(partial),
  reset: () => set(initialState),
  setEngine: (engine) => {
    engineRef = engine;
    const type: EngineType = engine.name() === 'librespot' ? 'librespot' : 'websdk';
    setStoredEngineType(type);
    engineType = type;
  },
  setEngineType: (t) => { engineType = t; },
  getEngineType: () => engineType,
  getEngine: () => engineRef,
  playTrack: async (uri: string) => {
    if (engineRef) {
      await engineRef.play(uri);
    }
  },
}));
