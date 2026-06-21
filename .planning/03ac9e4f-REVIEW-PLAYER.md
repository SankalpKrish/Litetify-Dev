---
status: findings (fixed: CR-1, CR-2, CR-3, W-1, W-2, W-3, W-4, W-5, W-6, W-7, W-8)
phase: 1-4,6-7
phase_name: Player, Playback Engine, Styles
depth: deep
files_reviewed: 14
critical: 3
warning: 8
info: 10
total: 21
fixes_applied: 11
---

# Deep Code Review — Player, Playback Engine, Styles

Files reviewed:
- `src/App.tsx`
- `src/app/Sidebar.tsx`
- `src/features/player/DeviceSelector.tsx`
- `src/features/player/NowPlayingBar.tsx`
- `src/features/player/NowPlayingInfo.tsx`
- `src/features/player/PlayerInitializer.tsx`
- `src/features/player/ProgressBar.tsx`
- `src/features/player/TransportControls.tsx`
- `src/features/player/VolumeControl.tsx`
- `src/features/player/playerStore.ts`
- `src/playback/engine.ts`
- `src/playback/websdk.ts`
- `src/styles/global.css`
- `src/styles/tokens.css`

---

## Critical

### CR-1. All player components hardcode `webSdkEngine` instead of using the active engine from the store

**File:** `src/features/player/ProgressBar.tsx:3`, `src/features/player/TransportControls.tsx:3`, `src/features/player/VolumeControl.tsx:3`

`ProgressBar`, `TransportControls`, and `VolumeControl` each import `webSdkEngine` directly from `../../playback/websdk` and call its methods (`seek`, `pause`, `resume`, `toggleShuffle`, `nextTrack`, `previousTrack`, `cycleRepeat`, `setVolume`). When the user selects the librespot engine via `setEngineType('librespot')` in settings, `playerStore.ts` sets `engineRef` to `librespotEngine`, but these components never read the active engine from the store. They unconditionally invoke web SDK commands, which will either fail silently (Tauri invoke returns error for non-existent commands) or call the wrong backend.

This is a critical logic bug: librespot users who toggle play/pause, seek, change volume, or skip tracks will see no results (or errors). The engine dispatch must be read from the store at call time.

**Fix:** Add `getEngine` to `PlayerStore` that returns the module-level `engineRef`. Use it in each component:

```
// playerStore.ts
export interface PlayerStore extends PlaybackState {
  ...
  getEngine: () => PlaybackEngine | null;
}
// inside create:
getEngine: () => engineRef,
```

Then in components:
```
const getEngine = usePlayerStore((s) => s.getEngine);
// ...
const engine = getEngine();
if (engine) await engine.seek(target);
```

---

### CR-2. Spotify SDK and Tauri event listeners accumulate on reinit with no cleanup

**File:** `src/playback/websdk.ts:125-164`, `:222-261`

In `connectToSDK`, `player.on(...)` is called for seven event types (`ready`, `player_state_changed`, `not_ready`, `initialization_error`, `authentication_error`, `account_error`, `playback_error`). In `listenForEngineEvents`, seven `listen(...)` calls register Tauri event handlers. Neither set of listeners is ever removed. The `listen` calls return `Promise<UnlistenFn>` which is discarded. If the player reinitializes (e.g., after a token refresh failure or SDK disconnect/reconnect), duplicate listeners accumulate, causing:

- `player_state_changed` firing `n` times per state change, each calling `updateStore(mapped)`.
- `engine:pause`, `engine:resume`, etc. executing `n` redundant calls to the SDK.

**Fix:** Store the unlisten functions and tear them down on reinit:

```
let unlistenFns: (() => void)[] = [];

function listenForEngineEvents(): void {
  // clean previous listeners first
  unlistenFns.forEach(fn => fn());
  unlistenFns = [];

  listen<string | null>('engine:play', ...).then(fn => unlistenFns.push(fn));
  // ... same for all other events
}
```

For Spotify SDK events, maintain a single player reference and disconnect/reconnect pattern, or track listener attachment state and skip if already attached.

---

### CR-3. `np-art-fallback` class used in JSX but never defined in CSS

**File:** `src/features/player/NowPlayingInfo.tsx:26`, `src/styles/global.css`

The component renders `<div className="np-art np-art-fallback" />` when `albumImage` is null. The class `np-art-fallback` has no corresponding CSS rules. While the fallback div still renders with the base `np-art` styles (48x48 box via `np-art`), the `np-art-fallback` class is dead code. If it was intended to have a distinct visual treatment (e.g., a music note icon, different background, or a gradient placeholder), that style is missing.

**Fix:** Either define `.np-art-fallback` with appropriate styles (e.g., different background color, inner icon via `::after` pseudo-element) or remove the class entirely:

```
.np-art-fallback {
  background: var(--lt-bg-elevated);
  display: flex;
  align-items: center;
  justify-content: center;
}
.np-art-fallback::after {
  content: '~';
  font-size: 1.5rem;
  color: var(--lt-fg-tertiary);
}
```

---

## Warnings

### W-1. Device transfer errors silently swallowed

**File:** `src/features/player/DeviceSelector.tsx:41-43`

```ts
} catch {
  // transfer failed silently
}
```

Empty catch block eliminates all error visibility. Users who click a device and see nothing happen have no feedback. Debugging device transfer failures requires inspecting network traffic.

**Fix:** Log the error and optionally surface user-facing feedback:

```
} catch (err) {
  console.warn('Device transfer failed:', err);
}
```

---

### W-2. Mod view rendered outside Suspense boundary

**File:** `src/App.tsx:160-168`

The conditional mod view (`currentView.name === 'mod'`) is rendered outside the `<Suspense>` wrapper that encloses lines 145-158. If `customViews.get(...)!.render()` internally lazy-loads a component via `React.lazy`, the mod view will crash with no fallback UI. Even without lazy imports, the inconsistency is brittle.

**Fix:** Include the mod render branch inside the Suspense boundary, or wrap it in its own `<Suspense>`:

```
<Suspense fallback={<div className="empty-state"><div className="auth-spinner" /></div>}>
  {currentView.name === 'home' && <HomeView onNavigate={handleNavigate} />}
  ...
  {currentView.name === 'mod' && (
    <div className="mod-view">
      {customViews.has(currentView.modId)
        ? customViews.get(currentView.modId)!.render()
        : <p className="mod-not-found">Custom app not found.</p>}
    </div>
  )}
</Suspense>
```

---

### W-3. Sidebar mobile responsive classes defined in CSS but never applied in component

**File:** `src/styles/global.css:1725-1733`, `src/app/Sidebar.tsx`

The CSS defines `.sidebar-open`, `.sidebar-overlay` for mobile breakpoints, but the `Sidebar` component has no state management for mobile menu toggling, no hamburger button, and never applies these classes. On screens below 768px, the sidebar is `position: fixed; transform: translateX(-100%)` — permanently hidden with no way to show it.

**Fix:** Either (a) implement mobile sidebar toggle state and overlay in the component, or (b) remove the dead responsive CSS to avoid confusion.

---

### W-4. `setEngine` does not persist engine type, creating inconsistency between `engineRef` and `engineType`

**File:** `src/features/player/playerStore.ts:53-54`

```ts
setEngine: (engine) => { engineRef = engine; },
setEngineType: (t) => { engineType = t; },
```

`setEngine` (called during init) sets the module-level `engineRef` but does not update `engineType` or `localStorage`. `setEngineType` (called when user changes engine in settings) updates `engineType` and `localStorage` but does not replace `engineRef`. If the user visits settings and toggles the engine, `engineRef` still points to the old engine instance. The next `playTrack` call will use the wrong engine.

**Fix:** Make `setEngine` also persist the type:

```ts
setEngine: (engine) => {
  engineRef = engine;
  const type: EngineType = engine.name() === 'librespot' ? 'librespot' : 'websdk';
  setStoredEngineType(type);
  engineType = type;
},
```

---

### W-5. Token refresh fallback may use expired token

**File:** `src/playback/websdk.ts:117-121`

```ts
getOAuthToken: (cb) => {
  invoke<string>('get_valid_token', { clientId: '' })
    .then(cb)
    .catch(() => cb(token));
},
```

If the `invoke` call fails (network error, backend unavailable), the code falls back to the original `token` parameter — which may be expired or near expiry. The SDK will attempt to use this token, likely causing an `authentication_error` that is only logged to console. No retry or user notification occurs.

**Fix:** Either reject the promise to surface the error, or log a warning before falling back:

```
.catch((err) => {
  console.warn('Token refresh failed, using initial token (may be expired):', err);
  cb(token);
});
```

---

### W-6. Keyboard seek in ProgressBar fires and forgets, unhandled promise rejection

**File:** `src/features/player/ProgressBar.tsx:111`

```ts
setState({ positionMs: target });
webSdkEngine.seek(target);  // not awaited, no .catch()
```

If `webSdkEngine.seek` rejects (engine not ready, network error), the promise rejection is unhandled. The `setState` call already optimistically updates position, so a failing seek leaves the UI out of sync until the next `player_state_changed` event corrects it.

**Fix:** Await or catch:

```ts
setState({ positionMs: target });
webSdkEngine.seek(target).catch((err) =>
  console.warn('Seek failed:', err)
);
```

---

### W-7. `will-change: transform` on player bar may cause GPU memory pressure

**File:** `src/styles/global.css:904`

```css
.player-bar {
  will-change: transform;
}
```

The player bar is always rendered and never animated via `transform` in any visible rule (no CSS transition or animation targets `transform` on `.player-bar`). Setting `will-change: transform` unnecessarily creates a compositor layer for the entire player bar (which spans the full viewport width) for the lifetime of the app. This consumes GPU memory and may degrade performance on lower-end hardware.

**Fix:** Remove `will-change: transform` unless a specific animation targets this element. If blur/opacity transitions need GPU promotion, use `will-change: opacity` instead, or remove entirely and let the browser decide.

---

### W-8. `player_state_changed` fires `null` on disconnect but the handler only guards against it, never resets store

**File:** `src/playback/websdk.ts:133-139`

```ts
player.on('player_state_changed', (raw: unknown) => {
  const state = raw as SpotifyPlayerState | null;
  if (state) {
    const mapped = mapState(state);
    updateStore(mapped);
  }
  // null state silently ignored — store retains stale track info
});
```

When the Spotify SDK emits `player_state_changed` with `null` (which happens on temporary disconnection, queue exhaustion, or playback suspension), the handler silently no-ops. The store continues to display a stale track as "now playing" even though nothing is actually playing.

**Fix:** Handle null state by clearing playback state:

```ts
if (!state) {
  updateStore({ isPlaying: false, name: null, uri: null, artist: null, album: null, albumImage: null });
  return;
}
```

---

## Info

### I-1. `--lt-font-size-base` and `--lt-font-size-md` are identical

**File:** `src/styles/tokens.css:30-31`

Both tokens are `0.9rem`. This is either a naming redundancy or `--lt-font-size-md` was intended to be larger (typically `1rem`). If identical is intentional, consolidate to one token.

---

### I-2. `--lt-sidebar-collapsed` defined but never used

**File:** `src/styles/tokens.css:64`

```css
--lt-sidebar-collapsed: 0px;
```

Defined as a design token but no CSS or JS references it. Either implement collapsed sidebar state or remove.

---

### I-3. `auto-fill` in card grid creates empty columns

**File:** `src/styles/global.css:242`

```css
grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
```

`auto-fill` preserves column tracks even when empty, leaving blank space at the end of a sparsely populated grid. `auto-fit` collapses empty tracks and is almost always the correct choice for content grids.

**Fix:** Change to `auto-fit`.

---

### I-4. Progress bar hover transform-origin may cause visual overlap

**File:** `src/styles/global.css:1062-1066`

```css
.progress-bar:hover {
  transform: scaleY(1.5);
  transform-origin: center;
}
```

`transform-origin: center` scales the bar upward equally in both directions (top and bottom). The progress bar sits between two time labels (`<span className="progress-time">`). Vertical expansion into the time labels could cause text clipping at small viewport sizes. `transform-origin: center bottom` or `left bottom` is safer.

---

### I-5. App shell callbacks never cleaned up on unmount

**File:** `src/App.tsx:63-76`

`setToastCallbacks` and `setSidebarItemCallbacks` register module-level callbacks in `mods/api` without a cleanup return in the `useEffect`. If `AppShell` ever unmounts (e.g., auth reset), stale callbacks persist and reference the old React tree.

**Fix:** Store the unregister functions and call them in the effect cleanup:

```ts
useEffect(() => {
  setToastCallbacks(...);
  setSidebarItemCallbacks(...);
  return () => {
    setToastCallbacks(... null ...);
    setSidebarItemCallbacks(... null ...);
  };
}, []);
```

---

### I-6. Sidebar component not memoized

**File:** `src/app/Sidebar.tsx:47`

`Sidebar` re-renders on every parent render. Since it reads from `usePlaylists` (query hook with caching) and `useModsStore`, it will re-render on any data change anyway, but wrapping in `memo` with explicit props comparison would reduce renders on non-relevant state changes (e.g., toast state, auth state).

---

### I-7. `memo` wrapper on NowPlayingInfo is redundant

**File:** `src/features/player/NowPlayingInfo.tsx:36`

```ts
export const NowPlayingInfo = memo(NowPlayingInfoInner);
```

`NowPlayingInfoInner` receives no props. The component re-renders only when Zustand store selectors change. The `memo` wrapper checks props (which are always the same empty object) and is a no-op. Remove to reduce bundle size.

---

### I-8. Inline arrow functions in TransportControls create new closures each render

**File:** `src/features/player/TransportControls.tsx:79,87,98,105`

```tsx
onClick={() => webSdkEngine.toggleShuffle()}
onClick={() => webSdkEngine.previousTrack()}
onClick={() => webSdkEngine.nextTrack()}
onClick={() => webSdkEngine.cycleRepeat()}
```

Each render creates four new function objects. While not a performance bottleneck at this scale, extracting them into stable `useCallback` wrappers or using a shared dispatch pattern would be cleaner and reduce child re-renders if buttons were memoized.

---

### I-9. `.auth-btn-spotify` and `.auth-btn-primary` are identical

**File:** `src/styles/global.css:800-810`

```css
.auth-btn-primary { background: var(--lt-accent); color: var(--lt-on-accent); width: 100%; }
.auth-btn-spotify { background: var(--lt-accent); color: var(--lt-on-accent); width: 100%; }
```

The code comment on line 811 confirms this is known tech debt. Merge into one class.

---

### I-10. Stats app sample CSS defined but likely dead code

**File:** `src/styles/global.css:1640-1677`

The `.stats-app`, `.stats-placeholder` classes reference a sample stats application UI. If this was scaffolding from an earlier prototyping phase, its CSS should be removed to reduce payload. If the stats app is still active, the classes are fine but are unreferenced by any of the reviewed 14 files.

---

## Summary by Component

| File | CR | W | I |
|---|---|---|---|
| `App.tsx` | 0 | 1 | 1 |
| `Sidebar.tsx` | 0 | 1 | 1 |
| `DeviceSelector.tsx` | 0 | 1 | 0 |
| `NowPlayingBar.tsx` | 0 | 0 | 0 |
| `NowPlayingInfo.tsx` | 1 | 0 | 1 |
| `PlayerInitializer.tsx` | 0 | 0 | 0 |
| `ProgressBar.tsx` | 1 | 1 | 0 |
| `TransportControls.tsx` | 1 | 0 | 1 |
| `VolumeControl.tsx` | 1 | 0 | 0 |
| `playerStore.ts` | 0 | 1 | 0 |
| `engine.ts` | 0 | 0 | 0 |
| `websdk.ts` | 1 | 2 | 0 |
| `global.css` | 0 | 1 | 5 |
| `tokens.css` | 0 | 0 | 2 |
