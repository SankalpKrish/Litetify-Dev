# Modding Litetify

Litetify supports **themes**, **extensions**, and **custom apps** — no recompile needed.

## Quick Start

1. Create a folder inside `mods/` with a `manifest.json` and your code.
2. The mod appears in **Settings → Mods**. Enable it.
3. Themes apply instantly. Extensions run immediately. Custom apps appear as new sidebar tabs.

## Manifest Format

Every mod needs a `manifest.json` at the root of its folder:

```json
{
  "name": "My Mod",
  "version": "1.0.0",
  "type": "theme",
  "entry": "theme.css",
  "description": "Optional description",
  "author": "You",
  "litetifyApiVersion": "1.0.0",
  "permissions": ["player", "storage"]
}
```

### Fields

| Field              | Type                 | Required | Description                                    |
| ------------------ | -------------------- | -------- | ---------------------------------------------- |
| `name`             | string               | yes      | Display name (max 128 chars)                   |
| `version`          | string               | yes      | Semver string (max 32 chars)                   |
| `type`             | `theme\|extension\|app` | yes      | Mod type                                       |
| `entry`            | string               | yes      | Entry file path relative to mod folder         |
| `description`      | string               | no       | Human-readable description (max 1024 chars)    |
| `author`           | string               | no       | Author name (max 128 chars)                    |
| `litetifyApiVersion` | string             | yes      | API version this mod targets (e.g. `1.0.0`)    |
| `permissions`      | string[]             | no       | Required permissions (extensions only, max 32) |

### Permissions

For extension mods, declare scoped permissions:

- `player` — control playback, read state
- `library` — read playlists and liked songs
- `storage` — per-mod key/value storage
- `ui` — add sidebar items, show toasts

## Themes

Themes are CSS files that override Litetify's design tokens. The full list of CSS custom properties is available in `src/styles/tokens.css`.

### Example

```css
/* mods/my-theme/theme.css */
:root {
  --lt-bg-base: #1a1a2e;
  --lt-accent: #e94560;
  --lt-fg-primary: #eee;
}
```

**Rules:**
- Wrap overrides in `:root { ... }`.
- Only CSS custom properties — no raw element selectors (they may conflict).
- One active theme at a time. Toggling is instant, no restart needed.

### Sample Theme

See `mods/examples/dark-theme/` for a complete working theme.

## Extensions

Extensions are JavaScript files that run in a sandboxed environment. They interact with Litetify exclusively through the `window.Litetify` API.

### Example

```javascript
(function () {
  Litetify.player.onStateChange(function (state) {
    console.log('Now playing:', state.name);
  });

  return {
    unload: function () {
      // Cleanup when disabled
    }
  };
})();
```

### Rules
- Extensions run in a sandbox with **no access** to:
  - `window.__TAURI__` or Tauri IPC directly
  - Raw `fetch` to non-Spotify hosts (CSP enforced)
  - Access tokens or any credential
- The return value can have an `unload` function for cleanup.
- Use `"use strict"` — it's enforced.

## Custom Apps

Custom apps are full-page views that appear as new tabs in the sidebar. They are lazy-loaded.

### Example

```javascript
(function () {
  return {
    label: 'My App',
    mount: function (container) {
      container.innerHTML = '<h1>Hello from my app!</h1>';
    },
    unmount: function () {
      // Cleanup
    }
  };
})();
```

**Two modes:**
- `mount(container)` — gets a DOM element to render into.
- `render()` — returns an HTML string.

## `window.Litetify` API Reference

### `Litetify.player`

```typescript
player: {
  play(uri?: string): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(positionMs: number): Promise<void>;
  setVolume(percent: number): Promise<void>;
  next(): Promise<void>;
  previous(): Promise<void>;
  getState(): Promise<PlaybackState>;
  onStateChange(cb: (state: PlaybackState) => void): () => void;
}
```

`PlaybackState`:
```typescript
{
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
  repeat: string;
  deviceId: string | null;
}
```

### `Litetify.library`

```typescript
library: {
  getPlaylists(): Promise<{ id: string; name: string }[]>;
  getLikedTracks(): Promise<{ uri: string; name: string }[]>;
}
```

### `Litetify.ui`

```typescript
ui: {
  addSidebarItem(id: string, label: string, icon: string): void;
  removeSidebarItem(id: string): void;
  showToast(message: string, type?: 'info' | 'success' | 'error'): void;
  removeToast(): void;
}
```

### `Litetify.storage`

```typescript
storage: {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  clear(): void;
}
```

Scoped per-mod — keys are prefixed automatically.

### `Litetify.events`

```typescript
events: {
  on(event: string, handler: (...args: any[]) => void): () => void;
  off(event: string, handler: (...args: any[]) => void): void;
}
```

Built-in events:
- `playback:stateChange` — fired when playback state changes

## Performance Tips

- Theme CSS should be small — only override what you need.
- Extensions should `return { unload }` for clean disabling.
- Custom apps use lazy loading — they don't block startup.

## Publishing

v1 supports local `mods/` only. A future version may add a mod marketplace.
