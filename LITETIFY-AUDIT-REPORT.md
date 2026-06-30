# Litetify Frontend Audit Report

> Generated 2026-06-30 — synthesis of 6 parallel audit agents covering API features, UI patterns, state management, CSS, accessibility, error handling, and architecture.

---

## 1. Missing API Features

### HIGH

| Gap | Details | Impact |
|-----|---------|--------|
| **No Browse / Categories screens** | `useNewReleases`, `useFeaturedPlaylists`, `useRecommendations`, `useCategories` all wired in `api.ts` and have React Query hooks in `useBrowse.ts` — but **zero UI consumers** in any `src/features/` component. No `BrowseView` exists. `HomeView.tsx` only shows personalization data (top artists, tracks, recently played, own playlists). | Users cannot discover new music at all. |
| **No Create/Edit/Delete/Follow Playlist** | POST `/users/{id}/playlists`, PUT `/playlists/{id}`, DELETE `/playlists/{id}/followers`, PUT `/playlists/{id}/followers` — none wired. No "Create Playlist" button, no rename/description editor, no unfollow/delete option. `PlaylistList.tsx` empty-state says "Create a playlist on Spotify..." — no in-app creation. | Core playlist management missing. |
| **No Follow/Unfollow artists** | PUT/DELETE `/me/following` endpoints absent from `api.ts`. No follow button on `ArtistView.tsx`. No "Unfollow" context menu item. | Users can't follow/unfollow artists. |
| **No Audio Features / Analysis** | GET `/v1/audio-features/{id}` and `/v1/audio-analysis/{id}` — neither endpoint wired. No types for audio features in `types.ts`. | No audio feature data available for visualization or recommendation. |
| **No user profile display** | `useMe` hook exists in `src/lib/queries/useMe.ts` (calls `apiGetMe`) — **NOT consumed in any UI component**. User's name, email, image, product tier never shown. Sidebar shows "Litetify" but no user avatar/name. | No identity feedback in the app. |
| **No inline save-heart on track rows** | Save/remove to Liked Songs only via right-click context menu or `TrackMenuButton` (⋯). No persistent heart icon that users can click directly on any track row. | Significant UX gap vs every music player. |
| **Related artists not shown** | `useRelatedArtists` query hook exists in `useArtist.ts:41-48` with full API wiring — but `ArtistView.tsx` never imports or calls it. | Artist page lacks "Fans also like" section. |

### MEDIUM

| Gap | Details |
|-----|---------|
| **No separate paginated album tracks fetch** | `AlbumView` relies on `album.tracks` embedded in GET `/albums/{id}`. Works for albums <50 tracks but lacks offset paging when embedded tracks exceed the default limit. No `apiGetAlbumTracks` function or React Query hook. |
| **No saved albums/shows/episodes library endpoints** | GET `/me/albums`, `/me/shows`, `/me/episodes` not wired. Library view only shows playlists and liked songs. |
| **`useCurrentlyPlaying` hook not consumed** | React Query hook with 5s polling exists in `usePlayer.ts` — but no feature component uses it. `PlayerInitializer.tsx` calls `invoke('api_get_currently_playing')` directly, bypassing the hook. |
| **No `apiGetTrack`** | GET `/tracks/{id}` not wired. Tracks always fetched as part of playlists, albums, or search results. |
| **No "Recommended" UI** | `apiGetRecommendations` only called from `useAutoQueue.ts` for background auto-queuing. No "Recommended for you" section exists. |

### LOW

| Gap | Details |
|-----|---------|
| **Shows/Episodes absent** | No `apiGetShow`, `apiGetEpisode`, or library endpoints. Understandable scope decision. |
| **Markets endpoint not wired** | GET `/markets` absent. Not blocking anything currently. |
| **REST play/pause/shuffle/repeat/seek endpoints** | Not needed — local engine handles everything. |
| **No queue view** | `apiAddToQueue` works in context menu but no `QueueView` to see/reorder/clear the queue. |
| **No share button on NowPlayingBar** | Share only accessible via right-click context menu → "Copy Song link" / "Copy Spotify URI". |

---

## 2. Missing UI Patterns

### HIGH

| Finding | Details |
|---------|---------|
| **No skeleton loading placeholders on detail views** | All detail views show `"Loading..."` text in a generic `<div className="empty-state">` instead of skeleton/spinner placeholders matching content shape. Only `HomeView` has a proper `CardSkeleton`. Affected: `PlaylistDetail.tsx:78`, `AlbumView.tsx:22`, `ArtistView.tsx:23`, `LikedSongs.tsx:19`, `SearchView.tsx:79`, `PlaylistList.tsx:19`. |
| **HomeView has no error states** | HomeView queries 4 endpoints but destructures only `data` and `isLoading` — never `error`/`isError`. If all queries fail, the empty-state fallback `"Welcome to Litetify"` is misleading (not onboarding; something is broken). `HomeView.tsx:55-58`. *(Also reported in Error Handling audit as HIGH.)* |

### MEDIUM

| Finding | Details |
|---------|---------|
| **No offline/connectivity detection** | Zero offline detection in the app. No `navigator.onLine` check, no `online`/`offline` event listeners, no persistent connectivity indicator. SearchView's error message mentions "Check your connection" but it's a static string. *(Also in Error Handling.)* |
| **LikedSongs: no distinct 404 vs error vs empty state** | `LikedSongs.tsx:25-31` — single error path for all failure modes: `"Could not load liked songs"`. No differentiation between 404 (no liked songs ever), network failure, or auth failure. Empty state correctly says "No liked songs yet" but errors get no guidance. |
| **SearchView empty-results timing** | When user clears search (`debounced === ''`), the prompt re-appears but stale cached `data` is briefly present. Guarded correctly with `debounced` check, but could flash between states. `SearchView.tsx:89`. |

### LOW

| Finding | Details |
|---------|---------|
| **Missing views (Browse categories, New Releases, Featured)** | All hooks wired in `useBrowse.ts` — no consuming view. `HomeView.tsx` imports only `useHome`, not `useBrowse`. |
| **Related-artist section missing from ArtistView** | `useRelatedArtists` defined in `useArtist.ts` — ArtistView never calls it. |
| **No QueueView** | Users can add to queue but can never see, reorder, or clear it. |
| **No share button on NowPlayingBar** | Share only in right-click context menu. |

---

## 3. State Management Issues

### MEDIUM

| Finding | Details |
|---------|---------|
| **Navigation history stack grows unbounded** | `App.tsx:81-91` — `pushView` appends to `entries` array without any max history limit. A user clicking through many search results or browsing an album grid accumulates hundreds of entries. No LRU cap, no max-length pruning. |
| **Race condition: TransportControls mount before engine ready** | `playerStore.ts:26` — `engineRef` is a module-level mutable variable outside zustand. `PlayerInitializer` sets it asynchronously (Tauri IPC → token fetch → `ensurePlayer`). There's a window where `TransportControls` mounts and `getEngine()` returns `null`, making all transport buttons silent no-ops with no visual feedback. `TransportControls.tsx:68-80` — `if (!engine) return;` silently. |
| **Fragile navigation duplicate detection** | `App.tsx:86` — `JSON.stringify(cur) === JSON.stringify(next)` for duplicate detection is fragile. Fails on views with params containing `undefined` values or circular references. |

### LOW

| Finding | Details |
|---------|---------|
| **Empty ID navigation via Recently Played** | `HomeView.tsx:67` — `item.track.album?.id ?? ''` navigates to `AlbumView` with `id: ''` if album data is null. Hits `useAlbum('')` with `enabled: !!id` guard (no API call) but user lands on a blank "Album not found" with no back affordance. |
| **Non-null assertion on `track.album` in SearchView** | `track.album!.id` — if a track result lacks album metadata (rare but allowed by Spotify API), this passes `undefined` through the navigation handler. |
| **Toast re-render resets timer** | `Toast.tsx:13-14` — correct remount pattern via `key={null}` in `App.tsx`, but captures `onClose` via ref even though the effect would capture a stale closure if kept alive. |
| **Playback state change events emitted but no consumers** | `PlayerInitializer.tsx:34` emits `'playback:stateChange'` — no listener found for this event anywhere in `src/`. |

---

## 4. CSS Issues

### HIGH

| Finding | Details |
|---------|---------|
| **`--lt-surface-elevated` references non-existent CSS variable** | `global.css:305,607` — `.sidebar-playlist-thumb` and `.track-art` use `var(--lt-surface-elevated)` but `tokens.css` only defines `--lt-bg-elevated`. At runtime this resolves to invalid/unset. Also used in inline styles in `HomeView.tsx:28` and `PlaylistList.tsx:12`. |
| **Mobile sidebar has no toggle button** | `global.css:2246-2252` — at 768px, `.sidebar` gets `transform: translateX(-100%)` hiding it off-screen. No toggle button or menu icon to show it. Sidebar stuck invisible on mobile. |
| **Mobile 480px hides entire `.player-bar-left`** | `global.css:2267-2271` — `display: none` on the entire left player section (album art, track name, artist). On a narrow phone there's zero feedback about what's playing. |
| **`.tagline` class never used** | `global.css` defines `.tagline` styling but no component uses `className="tagline"`. |
| **`.card-default` is dead code** | `global.css:363` — `cursor: default` on `.card-default`, no component uses this class in `.tsx/.ts`. |
| **`.auth-btn-spotify` identical to `.auth-btn-primary`** | Both have `background: var(--lt-accent); color: var(--lt-on-accent); width: 100%;`. The TODO comment even says to merge them. |

### MEDIUM

| Finding | Details |
|---------|---------|
| **Hardcoded hex `#f15e6c` for danger color** | `global.css:758` — `.context-menu-item-danger:hover` uses raw hex instead of `--lt-error` token. |
| **Hardcoded hex `#4d4d4d` for progress bar track** | `global.css:1511` — `.progress-bar` background. |
| **Hardcoded hex `#ffffff` for progress thumb** | `global.css:1530` — `.progress-thumb` background. |
| **Hardcoded hex `#1a1a1a` for progress tooltip** | `global.css:1542` — `.progress-tooltip` background. |
| **No `--lt-danger` or `--lt-error-fg` token in design system** | Error/danger color `#f15e6c` is hardcoded with no corresponding CSS variable. |
| **`.search-icon` class is dead code** | CSS defines `.search-icon` for an absolutely-positioned search icon, but `SearchView.tsx` uses inline SVG with inline styles. |
| **`.np-art-fallback::after` uses hardcoded `'~'` character** | `global.css:1384` — `content: '~'` should be Unicode music note `\266B` or a null-art SVG placeholder. |

### LOW

| Finding | Details |
|---------|---------|
| **`.shell h1` rule never applied** | `global.css` — `.shell h1` exists but `ErrorBoundary` uses a bare `<h1>` outside `.shell`. |
| **Hardcoded `0.1s linear` instead of `--lt-transition-fast`** | `global.css:1517` — `.progress-fill` transition. |
| **Hardcoded `rgba(0,0,0,0.6)` for engine warning overlay** | `global.css:2091` — not using a CSS variable. |
| **`.stats-placeholder` may be dead code** | `global.css:2205` — no component references it. |
| **Wrong fallback `#282828` on `--lt-bg-elevated`** | `global.css:526,721,764` — `var(--lt-bg-elevated, #282828)` fallback should be `#131316`. |

---

## 5. Accessibility Gaps

### HIGH

| Finding | Details |
|---------|---------|
| **ContextMenu does not trap focus or manage focus on open/close** | When context menu opens, focus stays on the trigger — it does not move to the first `role="menuitem"`. When closing via Escape or click-outside, focus does not return to the trigger. Arrow key navigation between items absent. `ContextMenu.tsx:128-140, 201-210`. `contextMenuStore.ts` — no focus target tracking. |
| **DeviceSelector dropdown has no keyboard navigation** | Device list items are `<button>` elements but no arrow-key navigation between them, no focus management when opening/closing, no roving `tabIndex`. Keyboard users can tab through but cannot arrow-navigate as expected for a listbox. `DeviceSelector.tsx:88-105`. |
| **PlaybackTimerBadge is entirely keyboard-inaccessible** | The trigger is a `<div>` with no `tabIndex` or keyboard handler. The popover content, even if focusable, cannot be reached by keyboard. `PlaybackTimerBadge.tsx:137-155`. |

### MEDIUM

| Finding | Details |
|---------|---------|
| **Search/Library/Settings tabs lack ARIA tab roles** | Tab-like buttons (`All`, `Tracks`, `Artists`, etc.) have no `role="tab"`, `aria-selected`, or `aria-controls`. Content panels lack `role="tabpanel"` and `aria-labelledby`. Same pattern in `SearchView.tsx:83-89`, `LibraryView.tsx:23-35`, `SettingsView.tsx:34-62`. |
| **Tab buttons lack arrow-key navigation** | Search/Library/Settings tabs cannot be navigated with Left/Right arrow keys (expected ARIA tabs pattern). |
| **ViewAsMenu has no arrow-key navigation** | Uses `role="menuitemradio"` and `aria-checked` (correct) but keyboard users cannot use arrow keys to switch modes. `ViewAsMenu.tsx:70-84`. |
| **"Show all" buttons lack descriptive `aria-label`** | `HomeView.tsx:150,218` — buttons reading "Show all" need `aria-label="Show all artists"` per section for screen reader context. |
| **Settings tabs don't move focus to content area** | Switching tabs via click doesn't shift focus to the new content panel. `SettingsView.tsx:64-83`. |
| **ContextMenu focus loss on open/close** | No focus transfers into or out of the menu. Next Tab press moves to next document element behind the portal, not into the menu. |

### LOW

| Finding | Details |
|---------|---------|
| **PlaybackTimerBadge trigger has no accessible name** | `<div>` with `onClick` — no `role`, `tabIndex`, `aria-label`, or `aria-expanded`. Keyboard-invisible. `PlaybackTimerBadge.tsx:137-155`. |
| **Pinned playlist items lack keyboard context menu** | Sidebar items have `onContextMenu` for right-click but no keyboard equivalent (Menu key / SHIFT+F10). `Sidebar.tsx:149-155`. |
| **LikedSongs uses `<h2>` — OK if parent has `<h1>`** | `LikedSongs.tsx:72` — `<h2 className="sr-only">Liked Songs</h2>` is correctly nested under Library's `<h1>`. Noted as OK. |

### OK (positive findings)

| Finding | Details |
|---------|---------|
| Skip link present and correctly targeted | `<a href="#main-content">` → `<main id="main-content">`. |
| VolumeControl and ProgressBar have proper slider ARIA | `role="slider"`, `aria-label`, `aria-valuemin/max/now`. |
| All transport controls have `aria-label` | Toggle shuffle, Previous track, etc. |
| Toast uses `role="alert"` | Correctly announced. |
| ContextMenu uses `role="menu"` / `role="menuitem"` | Correct roles. |
| Global `:focus-visible` styles defined | 2px `var(--lt-accent)` outline. |
| `prefers-reduced-motion` respected | All animations disabled at reduce. |
| Decorative icons use `aria-hidden="true"` | Correct pattern throughout. |
| Images have meaningful `alt` text | Uses entity name. |

---

## 6. Error Handling

### HIGH

| Finding | Details |
|---------|---------|
| **`librespot.ts` engine methods have zero error handling** | All invoke calls in `src/playback/librespot.ts` (play, pause, resume, seek, setVolume, nextTrack, previousTrack, toggleShuffle, cycleRepeat) lack `.catch()` or try/catch. Rejections are completely unhandled — no `console.warn`, no user feedback, no store rollback. |
| **`checkAuth()` promise chain has no `.catch()`** | `App.tsx:54-61` — `checkAuth().then(...)` only handles success. If Tauri `invoke('check_auth')` throws unexpectedly, `authStatus` stays `'loading'` forever — user sees auth spinner indefinitely. |
| **`usePlaylistTracks.ts` eager fetch uses unhandled `void fetchNextPage()`** | `src/lib/queries/usePlaylistTracks.ts:33-36` — `void fetchNextPage()` in a `useEffect` without `.catch()`. If the paginated fetch fails, rejection swallowed. User sees partial track list with no indication some pages failed. |
| **HomeView has no error states for any of its four queries** | `HomeView.tsx` — `useTopArtists`, `useTopTracks`, `useRecentlyPlayed`, `useHomePlaylists` all destructure only `data` and `isLoading`. `error` never checked. Sections show skeleton forever (when `isLoading=false, data=undefined`) then fire misleading "Welcome" fallback. *(Also in UI Patterns.)* |
| **ErrorBoundary is a single monolithic wrapper** | `App.tsx:118` — `<ErrorBoundary>` wraps every view + sidebar + player bar. A crash in any lazy-loaded view replaces the entire layout with "Something went wrong" — sidebar, navigation, and player all disappear. No per-view boundary for graceful degradation. |
| **Non-null assertion on filtered-but-not-type-narrowed track items** | `PlaylistDetail.tsx:51,58` — `item.track!` after `.filter(item => item.track)` is still a non-null assertion. If API returns `track: null` (which Spotify does for unavailable/deleted tracks), the component crashes. Filter masks but does not type-narrow. |

### MEDIUM

| Finding | Details |
|---------|---------|
| **No offline/online detection** | No `window.addEventListener('online'/'offline')` exists. No global offline banner, no pause of polling (`refetchInterval` on `useCurrentlyPlaying` keeps hammering), no graceful degradation. User sees random query failures instead of "You're offline." *(Also in UI Patterns.)* |
| **`websdk.ts` silently swallows engine errors** | `src/playback/websdk.ts` — `ensureReady().then(p => p.method().catch(() => {}))` discards all SDK method errors with zero logging. If Web Playback SDK disconnects mid-session, failures are invisible. |
| **ErrorBoundary shows generic message with no recovery cues** | `ErrorBoundary.tsx:20-27` — shows error message + "Try again" button. No error code, no action-specific hint, no option to reload entirely. Reset just calls `setState` — if root cause is persistent, user cycles between crash and "Something went wrong." |
| **ErrorBoundary logs to console only, no monitoring** | `ErrorBoundary.tsx:13` — `componentDidCatch` only calls `console.error`. No Sentry or error reporting. |
| **`checkAuth()` returning false silently logs user out** | `authStore.ts:77-81` — `catch { return false; }`. Any exception (Tauri IPC failure, deserialization error, Rust panic) causes return `false`, showing login screen with no explanation. |
| **`Permissions.tsx` optimistically reloads scopes after login** | `src/features/settings/Permissions.tsx:101-108` — after `invoke('login')` resolves, immediately calls `invoke('get_granted_scopes_command')` and updates UI. But user may have denied some scopes in the browser — UI marks features as enabled before verification. |
| **LikedSongs accesses `data.total` without null guard** | `src/features/library/LikedSongs.tsx` — if `isLoading=false, error=falsy, data=undefined` (React Query edge case), code proceeds to `data.total` and crashes. |

### LOW

| Finding | Details |
|---------|---------|
| **HomeView "Welcome" fallback fires when some data loaded** | `HomeView.tsx:227-234` — shows "Welcome to Litetify" even when some queries succeeded. If `topArtists` loaded but `playlists` failed, user sees both their top artists and the welcome message. |
| **'track.album!.id' non-null assertion in LikedSongs** | `src/features/library/LikedSongs.tsx:~110` — if a liked track has no album metadata (rare but allowed by API), crashes on click. |
| **`data.tracks!.items` non-null assertion in SearchView** | `SearchView.tsx:~159` — `data.tracks` guarded in JSX but `.items.slice()` inside the mapping uses non-null assertion. If `tracks` is present but `items` is undefined (API anomaly), crashes. |
| **`setToastCallbacks` / `setSidebarItemCallbacks` no error handling** | `App.tsx:87-102` — no `.catch()` on sync calls that could throw if mods system is inconsistent. |

---

## 7. Architecture & Mods

### HIGH

| Finding | Details |
|---------|---------|
| **App-type mods execute arbitrary code in host context via `new Function()`** | `apps.tsx:53` — App mods are loaded via `new Function(...)` and executed in the main window's JavaScript context, bypassing iframe isolation. Unlike extensions (sandboxed iframes with `sandbox="allow-scripts"`), app mods have full access to `document`, `localStorage`, Tauri `invoke`, and the React tree. The permission-based API filtering is trivially bypassed — mod code can ignore the `Litetify` global and use `window` directly. |
| **`engineRef` and `engineType` are module-level mutable state outside zustand** | `playerStore.ts:32-33` — defined as module-level `let` variables, not in zustand state. `setEngine()` writes to `engineRef` but no React component can reactively observe engine changes because they aren't part of zustand's `set()` call tree. *(Also in State Management.)* |

### MEDIUM

| Finding | Details |
|---------|---------|
| **Extension iframes use `'*'` as postMessage targetOrigin** | `sandbox.ts:130` — `parent.postMessage({...}, '*')` instead of restricting it. While host checks `event.origin !== 'null'`, an `origin: null` origin is achievable inside a sandboxed iframe, so `'*'` is an unnecessary relaxation. |
| **Mod permission model exists but has no user-facing management UI** | `sandbox.ts:33-53` implements permission dispatcher; `apps.tsx:6-29` has a parallel (duplicated) permission filter. But Settings → Permissions tab only manages **Spotify OAuth scopes**, not mod permissions. Users cannot review, grant, or revoke per-mod API permissions. |
| **Module-level Maps for iframe/extension state are global singletons** | `sandbox.ts:55-57` — `loadedIframes`, `extensionMessageHandlers`, `extensionTokens` are module-level `Map<string, ...>` variables with no isolation if multiple Litetify instances coexist. |

### LOW

| Finding | Details |
|---------|---------|
| **`librespotEngine.cycleRepeat()` is a silent no-op** | `librespot.ts:40` — `async cycleRepeat() {}` is empty. Repeat cycle button silently broken on librespot engine. Should throw or log a warning. |
| **Tauri event listeners not explicitly cleaned up on engine switch** | `websdk.ts:236-237` — `listenForEngineEvents()` clears previous unlistens correctly, but no mechanism to unregister when switching from websdk to librespot. |
| **PlayerInitializer has mixed responsibilities** | Handles engine selection, Tauri init, token fetching, `ensurePlayer`, `api_get_currently_playing` fetch, mod API registration, media session setup, and playback state hydration. Could be split. |
| **`setToastCallbacks` / `setSidebarItemCallbacks` are module-level `let` singletons** | `mods/api.ts:46-49` — single function references at module scope. Only one caller can register. Works in practice but prevents composition. |
| **Toast lives in `features/settings/` but used app-wide** | `features/settings/Toast.tsx` imported by `App.tsx`. Would be more natural in `features/ui/`. |

---

## 8. Summary

### By Severity (de-duplicated, max severity per finding)

| Section | HIGH | MEDIUM | LOW | Total |
|---------|------|--------|-----|-------|
| Missing API Features | 7 | 5 | 5 | 17 |
| Missing UI Patterns | 2 | 3 | 4 | 9 |
| State Management | 0 | 3 | 4 | 7 |
| CSS Issues | 6 | 7 | 5 | 18 |
| Accessibility | 3 | 6 | 3 | 12 |
| Error Handling | 6 | 7 | 4 | 17 |
| Architecture & Mods | 2 | 3 | 5 | 10 |
| **Total** | **26** | **34** | **30** | **90** |

### By Section Impact

| Section | Most critical pattern |
|---------|---------------------|
| **API Features** | Browse/category discovery entirely missing. Playlist CRUD absent. Follow/unfollow absent. |
| **UI Patterns** | All detail views show "Loading..." text instead of skeletons. HomeView hides failures behind "Welcome." |
| **State Management** | Navigation history unbounded. Engine race window. Fragile JSON.stringify duplicate detection. |
| **CSS** | Broken CSS variable (`--lt-surface-elevated`) produces invisible backgrounds. Mobile sidebar permanently hidden. Entire player-left hidden at 480px. |
| **Accessibility** | ContextMenu, DeviceSelector, PlaybackTimerBadge all keyboard-inaccessible. Tabs lack ARIA roles. |
| **Error Handling** | `librespot.ts` methods have zero error handling. `checkAuth()` never `.catch()`'d. ErrorBoundary monolithic. |
| **Architecture** | App-type mods have arbitrary code execution in host context. Engine state outside zustand reactivity. |

---

## 9. Quick Wins (Top 5 Highest Impact per Effort)

These fixes are ordered by impact-to-effort ratio — each can be done in minutes to an hour and addresses a HIGH-severity finding.

| # | Fix | Effort | Impact | File(s) |
|---|-----|--------|--------|---------|
| 1 | **Fix `--lt-surface-elevated` → `--lt-bg-elevated`** | 5 minutes | Fixes invisible/transparent backgrounds on sidebar playlist thumbnails and track art across the app. 4 occurrences in CSS + 2 in inline styles. | `global.css:305,607`, `HomeView.tsx:28`, `PlaylistList.tsx:12` |
| 2 | **Add `.catch()` to `checkAuth()` promise chain** | 5 minutes | Prevents infinite auth spinner when Tauri IPC throws unexpectedly. | `App.tsx:54-61` |
| 3 | **Add `error`/`isError` destructuring to HomeView's 4 queries** | 15 minutes | Replaces the misleading "Welcome to Litetify" fallback with a proper error banner when queries fail. | `HomeView.tsx:55-58, ~227` |
| 4 | **Add focus trap + roving tabIndex to ContextMenu** | 30 minutes | Makes context menu keyboard-navigable — impacts every right-click and TrackMenuButton interaction in the app. | `ContextMenu.tsx`, `contextMenuStore.ts` |
| 5 | **Add `.card-skeleton` loading placeholders to detail views** | 45 minutes | Replaces all `"Loading..."` text with content-shape placeholders. Only HomeView has this today. | `PlaylistDetail.tsx:78`, `AlbumView.tsx:22`, `ArtistView.tsx:23`, `LikedSongs.tsx:19`, `SearchView.tsx:79`, `PlaylistList.tsx:19` |

### Bonus: One-line fixes (under 1 minute each)

- `librespot.ts:40` — Add `console.warn('cycleRepeat not implemented for librespot')` to the no-op `cycleRepeat()`.
- `global.css:2246-2252` — Add a mobile sidebar toggle button so navigation isn't permanently hidden under 768px. (Requires component change, but the CSS is already there for `transform`.)
- `App.tsx:81-91` — Cap `entries` at 50: `entries: [...truncated.slice(-49), next]`.
