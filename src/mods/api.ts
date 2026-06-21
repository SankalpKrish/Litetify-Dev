import type { PlaybackEngine } from '../playback/engine';
import type { PlaybackState } from '../playback/engine';
import { apiGetPlaylists, apiGetLikedTracks } from '../lib/api';

export interface LitetifyAPI {
  version: string;
  player: {
    play: (uri?: string) => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    seek: (positionMs: number) => Promise<void>;
    setVolume: (percent: number) => Promise<void>;
    next: () => Promise<void>;
    previous: () => Promise<void>;
    getState: () => Promise<PlaybackState>;
    onStateChange: (cb: (state: PlaybackState) => void) => () => void;
  };
  library: {
    getPlaylists: () => Promise<readonly { id: string; name: string }[]>;
    getLikedTracks: () => Promise<readonly { uri: string; name: string }[]>;
  };
  ui: {
    addSidebarItem: (id: string, label: string, icon: string) => void;
    removeSidebarItem: (id: string) => void;
    showToast: (message: string, type?: 'info' | 'success' | 'error') => void;
    removeToast: () => void;
  };
  storage: {
    get: (key: string) => string | null;
    set: (key: string, value: string) => void;
    remove: (key: string) => void;
    clear: () => void;
  };
  events: {
    on: (event: string, handler: (...args: unknown[]) => void) => () => void;
    off: (event: string, handler: (...args: unknown[]) => void) => void;
  };
}

let playbackEngine: PlaybackEngine | null = null;
let playerAPI: LitetifyAPI['player'] | null = null;
let stateChangeCallbacks: Array<(state: PlaybackState) => void> = [];
let sidebarItemCallback: ((id: string, label: string, icon: string) => void) | null = null;
let removeSidebarItemCallback: ((id: string) => void) | null = null;
let toastCallback: ((message: string, type: 'info' | 'success' | 'error') => void) | null = null;
let removeToastCallback: (() => void) | null = null;
const eventListeners = new Map<string, Set<(...args: unknown[]) => void>>();

export function setPlaybackEngine(engine: PlaybackEngine): void {
  playbackEngine = engine;
}

export function setStateChangeCallbacks(
  callbacks: Array<(state: PlaybackState) => void>,
): void {
  stateChangeCallbacks = callbacks;
}

export function setSidebarItemCallbacks(
  addCb: (id: string, label: string, icon: string) => void,
  removeCb: (id: string) => void,
): void {
  sidebarItemCallback = addCb;
  removeSidebarItemCallback = removeCb;
}

export function setToastCallbacks(
  show: (message: string, type: 'info' | 'success' | 'error') => void,
  remove: () => void,
): void {
  toastCallback = show;
  removeToastCallback = remove;
}

export function emitEvent(event: string, ...args: unknown[]): void {
  const handlers = eventListeners.get(event);
  if (handlers) {
    handlers.forEach((h) => {
      try {
        h(...args);
      } catch {
        // silenty handle
      }
    });
  }
}

function makePlayerAPI(): LitetifyAPI['player'] {
  return {
    async play(uri) {
      if (!playbackEngine) throw new Error('Playback engine not initialized');
      await playbackEngine.play(uri);
    },
    async pause() {
      if (!playbackEngine) throw new Error('Playback engine not initialized');
      await playbackEngine.pause();
    },
    async resume() {
      if (!playbackEngine) throw new Error('Playback engine not initialized');
      await playbackEngine.resume();
    },
    async seek(positionMs) {
      if (!playbackEngine) throw new Error('Playback engine not initialized');
      await playbackEngine.seek(positionMs);
    },
    async setVolume(percent) {
      if (!playbackEngine) throw new Error('Playback engine not initialized');
      await playbackEngine.setVolume(percent);
    },
    async next() {
      if (!playbackEngine) throw new Error('Playback engine not initialized');
      await playbackEngine.nextTrack();
    },
    async previous() {
      if (!playbackEngine) throw new Error('Playback engine not initialized');
      await playbackEngine.previousTrack();
    },
    async getState() {
      if (!playbackEngine) throw new Error('Playback engine not initialized');
      return playbackEngine.getState();
    },
    onStateChange(cb) {
      stateChangeCallbacks.push(cb);
      return () => {
        stateChangeCallbacks = stateChangeCallbacks.filter((c) => c !== cb);
      };
    },
  };
}

function makeLibraryAPI(): LitetifyAPI['library'] {
  return {
    async getPlaylists() {
      const res = await apiGetPlaylists(50);
      return res.items.map((p) => ({ id: p.id, name: p.name }));
    },
    async getLikedTracks() {
      const res = await apiGetLikedTracks(50);
      return res.items.map((t) => ({ uri: t.track.uri, name: t.track.name }));
    },
  };
}

function makeUIAPI(modId: string): LitetifyAPI['ui'] {
  return {
    addSidebarItem(id, label, icon) {
      sidebarItemCallback?.(`${modId}:${id}`, label, icon);
    },
    removeSidebarItem(id) {
      removeSidebarItemCallback?.(`${modId}:${id}`);
    },
    showToast(message, type = 'info') {
      toastCallback?.(message, type);
    },
    removeToast() {
      removeToastCallback?.();
    },
  };
}

function makeStorageAPI(modId: string): LitetifyAPI['storage'] {
  const prefix = `litetify:mod:${modId}:`;
  return {
    get(key) {
      try {
        return localStorage.getItem(prefix + key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(prefix + key, value);
      } catch {
        // storage may be full
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(prefix + key);
      } catch {
        // noop
      }
    },
    clear() {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k?.startsWith(prefix)) keysToRemove.push(k);
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {
        // noop
      }
    },
  };
}

function makeEventsAPI(): LitetifyAPI['events'] {
  return {
    on(event, handler) {
      if (!eventListeners.has(event)) {
        eventListeners.set(event, new Set());
      }
      eventListeners.get(event)!.add(handler);
      return () => {
        eventListeners.get(event)?.delete(handler);
      };
    },
    off(event, handler) {
      eventListeners.get(event)?.delete(handler);
    },
  };
}

export function createLitetifyAPI(modId: string): LitetifyAPI {
  if (!playerAPI) {
    playerAPI = makePlayerAPI();
  }
  return {
    version: '1.0.0',
    player: playerAPI,
    library: makeLibraryAPI(),
    ui: makeUIAPI(modId),
    storage: makeStorageAPI(modId),
    events: makeEventsAPI(),
  };
}
