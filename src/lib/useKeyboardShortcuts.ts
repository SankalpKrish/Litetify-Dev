import { useEffect } from 'react';
import { usePlayerStore } from '../features/player/playerStore';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      const store = usePlayerStore.getState();

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (store.isPlaying) {
            store.setState({ isPlaying: false });
          } else {
            store.setState({ isPlaying: true });
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          store.setState({ positionMs: Math.max(0, store.positionMs - 5000) });
          break;
        case 'ArrowRight':
          e.preventDefault();
          store.setState({ positionMs: Math.min(store.durationMs, store.positionMs + 5000) });
          break;
        case 'ArrowUp':
          e.preventDefault();
          store.setState({ volume: Math.min(100, store.volume + 5) });
          break;
        case 'ArrowDown':
          e.preventDefault();
          store.setState({ volume: Math.max(0, store.volume - 5) });
          break;
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);
}
