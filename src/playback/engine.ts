export type RepeatMode = 'off' | 'context' | 'track';

export interface PlaybackState {
  uri: string | null;
  trackId: string | null;
  name: string | null;
  artist: string | null;
  album: string | null;
  albumImage: string | null;
  durationMs: number;
  positionMs: number;
  isPlaying: boolean;
  volume: number;
  shuffle: boolean;
  repeat: RepeatMode;
  deviceId: string | null;
}

export interface PlaybackEngine {
  play(uri?: string): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  setVolume(volume: number): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
  toggleShuffle(): Promise<void>;
  cycleRepeat(): Promise<void>;
  getState(): Promise<PlaybackState>;
  name(): string;
}
