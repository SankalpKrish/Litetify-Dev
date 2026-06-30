import { useEffect } from 'react';
import { usePlayerStore } from '../features/player/playerStore';
import { loadKeybindings } from './keybindings';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const kb = loadKeybindings();
    const actionMap: Record<string, () => void> = {
      [kb.playPause]: () => {
        const store = usePlayerStore.getState();
        if (store.isPlaying) store.setState({ isPlaying: false });
        else store.setState({ isPlaying: true });
      },
      [kb.seekBack]: () => {
        const store = usePlayerStore.getState();
        store.setState({ positionMs: Math.max(0, store.positionMs - 5000) });
      },
      [kb.seekForward]: () => {
        const store = usePlayerStore.getState();
        store.setState({ positionMs: Math.min(store.durationMs, store.positionMs + 5000) });
      },
      [kb.volumeUp]: () => {
        const store = usePlayerStore.getState();
        store.setState({ volume: Math.min(100, store.volume + 5) });
      },
      [kb.volumeDown]: () => {
        const store = usePlayerStore.getState();
        store.setState({ volume: Math.max(0, store.volume - 5) });
      },
    };

    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const action = actionMap[e.code];
      if (action) {
        e.preventDefault();
        action();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}
