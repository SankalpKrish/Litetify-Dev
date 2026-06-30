/** Keybinding config — persisted to localStorage */

export interface Keybindings {
  playPause: string;
  seekBack: string;
  seekForward: string;
  volumeUp: string;
  volumeDown: string;
}

const STORAGE_KEY = 'litetify:keybindings';

const defaults: Keybindings = {
  playPause: 'Space',
  seekBack: 'ArrowLeft',
  seekForward: 'ArrowRight',
  volumeUp: 'ArrowUp',
  volumeDown: 'ArrowDown',
};

export function loadKeybindings(): Keybindings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaults, ...JSON.parse(raw) };
  } catch { /* noop */ }
  return { ...defaults };
}

export function saveKeybindings(b: Keybindings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(b));
}

export const actionLabels: Record<keyof Keybindings, string> = {
  playPause: 'Play / Pause',
  seekBack: 'Seek back',
  seekForward: 'Seek forward',
  volumeUp: 'Volume up',
  volumeDown: 'Volume down',
};

export const keyLabels: Record<string, string> = {
  Space: 'Space',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
};
