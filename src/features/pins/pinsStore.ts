import { create } from 'zustand';

export interface PinnedItem {
  id: string;
  name: string;
  image: string;
  uri: string;
  type: 'playlist' | 'album';
}

const STORAGE_KEY = 'litetify:pins';

function load(): PinnedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function save(pins: PinnedItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
  } catch {
    /* storage unavailable */
  }
}

interface PinsState {
  pins: PinnedItem[];
  isPinned: (uri: string) => boolean;
  pin: (item: PinnedItem) => void;
  unpin: (uri: string) => void;
  togglePin: (item: PinnedItem) => void;
}

export const usePinsStore = create<PinsState>((set, get) => ({
  pins: load(),
  isPinned: (uri) => get().pins.some((p) => p.uri === uri),
  pin: (item) => {
    if (get().pins.some((p) => p.uri === item.uri)) return;
    const next = [...get().pins, item];
    save(next);
    set({ pins: next });
  },
  unpin: (uri) => {
    const next = get().pins.filter((p) => p.uri !== uri);
    save(next);
    set({ pins: next });
  },
  togglePin: (item) => {
    get().isPinned(item.uri) ? get().unpin(item.uri) : get().pin(item);
  },
}));
