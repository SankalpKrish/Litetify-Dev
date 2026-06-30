import { useState, useCallback } from 'react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';

let miniWindow: WebviewWindow | null = null;

export function MiniPlayerToggle() {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(async () => {
    if (miniWindow) {
      try { await miniWindow.close(); } catch { /* noop */ }
      miniWindow = null;
      setOpen(false);
      return;
    }

    const w = new WebviewWindow('mini-player', {
      url: '/?mini=1',
      title: 'Litetify Mini',
      width: 320,
      height: 480,
      minWidth: 280,
      minHeight: 360,
      alwaysOnTop: true,
      decorations: false,
      resizable: true,
      center: true,
    });

    w.once('tauri://created', () => {
      miniWindow = w;
      setOpen(true);
    });

    w.once('tauri://error', () => {
      miniWindow = null;
      setOpen(false);
    });
  }, []);

  return (
    <button
      className={`ctrl-btn ctrl-icon-btn${open ? ' ctrl-active' : ''}`}
      onClick={toggle}
      title={open ? 'Close mini-player' : 'Open mini-player'}
      aria-label="Mini-player"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    </button>
  );
}
