import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { usePlayerStore } from '../features/player/playerStore';
import type { PlaybackEngine, PlaybackState, RepeatMode } from './engine';

declare global {
  interface Window {
    Spotify: {
      Player: new (config: {
        name: string;
        getOAuthToken: (cb: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

interface SpotifyPlayer {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seek: (positionMs: number) => Promise<void>;
  setVolume: (volume: number) => Promise<void>;
  nextTrack: () => Promise<void>;
  previousTrack: () => Promise<void>;
  toggleShuffle: () => Promise<void>;
  setShuffle: (shuffle: boolean) => Promise<void>;
  getCurrentState: () => Promise<SpotifyPlayerState | null>;
  on: (event: string, cb: (data: unknown) => void) => void;
  addListener: (event: string, cb: (data: unknown) => void) => void;
  _options: {
    id: string;
  };
}

interface SpotifyTrackWindow {
  current_track: {
    id: string;
    uri: string;
    name: string;
    artists: { name: string; uri: string }[];
    album: {
      name: string;
      images: { url: string }[];
    };
    duration_ms: number;
  } | null;
}

interface SpotifyPlayerState {
  paused: boolean;
  position: number;
  duration: number;
  shuffle: boolean;
  repeat_mode: number;
  track_window: SpotifyTrackWindow;
  restrictions: Record<string, boolean>;
}

function mapRepeatMode(mode: number): RepeatMode {
  if (mode === 1) return 'context';
  if (mode === 2) return 'track';
  return 'off';
}

function mapState(sdkState: SpotifyPlayerState): Partial<PlaybackState> {
  const track = sdkState.track_window.current_track;
  if (!track) {
    return {
      isPlaying: !sdkState.paused,
      positionMs: sdkState.position,
      durationMs: sdkState.duration,
      shuffle: sdkState.shuffle,
      repeat: mapRepeatMode(sdkState.repeat_mode),
    };
  }
  return {
    uri: track.uri,
    trackId: track.id,
    name: track.name,
    artist: track.artists.map((a) => a.name).join(', '),
    album: track.album.name,
    albumImage: track.album.images[0]?.url ?? null,
    durationMs: track.duration_ms,
    positionMs: sdkState.position,
    isPlaying: !sdkState.paused,
    shuffle: sdkState.shuffle,
    repeat: mapRepeatMode(sdkState.repeat_mode),
  };
}

let player: SpotifyPlayer | null = null;
let ready = false;
let deviceId: string | null = null;

export function getDeviceId(): string | null {
  return deviceId;
}

export function isReady(): boolean {
  return ready;
}

function updateStore(partial: Partial<PlaybackState>): void {
  usePlayerStore.getState().setState(partial);
}

async function connectToSDK(token: string): Promise<void> {
  if (typeof window.Spotify === 'undefined') {
    throw new Error('Spotify SDK not loaded');
  }

  player = new window.Spotify.Player({
    name: 'Litetify',
    getOAuthToken: (cb) => {
      invoke<string>('get_valid_token', { clientId: '' })
        .then(cb)
        .catch(() => cb(token));
    },
    volume: usePlayerStore.getState().volume / 100,
  });

  player.on('ready', (data: unknown) => {
    const d = data as { device_id: string };
    deviceId = d.device_id;
    ready = true;
    updateStore({ deviceId: d.device_id });
    invoke('set_active_device', { deviceId: d.device_id }).catch(() => {});
  });

  player.on('player_state_changed', (raw: unknown) => {
    const state = raw as SpotifyPlayerState | null;
    if (state) {
      const mapped = mapState(state);
      updateStore(mapped);
    }
  });

  player.on('not_ready', () => {
    ready = false;
    updateStore({ isPlaying: false, deviceId: null });
  });

  player.on('initialization_error', (raw: unknown) => {
    const e = raw as { message: string };
    console.error('Spotify SDK init error:', e.message);
  });

  player.on('authentication_error', (raw: unknown) => {
    const e = raw as { message: string };
    console.error('Spotify SDK auth error:', e.message);
  });

  player.on('account_error', (raw: unknown) => {
    const e = raw as { message: string };
    console.error('Spotify SDK account error:', e.message);
  });

  player.on('playback_error', (raw: unknown) => {
    const e = raw as { message: string };
    console.error('Spotify SDK playback error:', e.message);
  });

  const connected = await player.connect();
  if (!connected) {
    throw new Error('Failed to connect Spotify Player');
  }
}

let sdkPromise: Promise<void> | null = null;

export async function ensurePlayer(token: string): Promise<void> {
  if (ready && player) return;
  if (sdkPromise) return sdkPromise;

  sdkPromise = loadSDK().then(() => connectToSDK(token));
  return sdkPromise;
}

function loadSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('spotify-player')) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.id = 'spotify-player';
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;

    const timeout = setTimeout(() => {
      reject(new Error('Spotify SDK load timeout'));
    }, 15000);

    window.onSpotifyWebPlaybackSDKReady = () => {
      clearTimeout(timeout);
      resolve();
    };

    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Failed to load Spotify SDK'));
    };

    document.head.appendChild(script);
  });
}

async function ensureReady(): Promise<SpotifyPlayer> {
  if (!player || !ready) {
    throw new Error('Player not ready');
  }
  return player;
}

function listenForEngineEvents(): void {
  listen<string | null>('engine:play', (event) => {
    const uri = event.payload;
    const p = usePlayerStore.getState();
    const did = p.deviceId ?? '';
    if (uri) {
      void invoke('api_play', { clientId: '', deviceId: did, uri, uris: null, contextUri: null });
    } else {
      void invoke('api_transfer_playback', {
        clientId: '',
        deviceIds: [did],
        play: true,
      });
    }
  });

  listen('engine:pause', () => {
    ensureReady().then((p) => p.pause().catch(() => {}));
  });

  listen('engine:resume', () => {
    ensureReady().then((p) => p.resume().catch(() => {}));
  });

  listen<number>('engine:seek', (event) => {
    ensureReady().then((p) => p.seek(event.payload).catch(() => {}));
  });

  listen<number>('engine:set-volume', (event) => {
    ensureReady().then((p) => p.setVolume(event.payload / 100).catch(() => {}));
  });

  listen('engine:next', () => {
    ensureReady().then((p) => p.nextTrack().catch(() => {}));
  });

  listen('engine:previous', () => {
    ensureReady().then((p) => p.previousTrack().catch(() => {}));
  });
}

listenForEngineEvents();

export const webSdkEngine: PlaybackEngine = {
  async play(uri?: string) {
    if (uri) {
      await invoke('engine_play', { uri });
      return;
    }
    await invoke('engine_resume');
  },

  async pause() {
    await invoke('engine_pause');
  },

  async resume() {
    await invoke('engine_resume');
  },

  async seek(positionMs: number) {
    await invoke('engine_seek', { positionMs });
  },

  async setVolume(volume: number) {
    updateStore({ volume });
    await invoke('engine_set_volume', { volume });
  },

  async nextTrack() {
    await invoke('engine_next');
  },

  async previousTrack() {
    await invoke('engine_previous');
  },

  async toggleShuffle() {
    await invoke('engine_toggle_shuffle');
  },

  async cycleRepeat() {
    await invoke('engine_cycle_repeat');
  },

  async getState() {
    return usePlayerStore.getState() as PlaybackState;
  },

  name() {
    return 'websdk';
  },
};
