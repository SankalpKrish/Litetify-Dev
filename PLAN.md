# Litetify — Prioritized Action Plan

**Generated:** 2026-06-30  
**Project:** [Litetify](https://github.com/your-org/Litetify) — Tauri v2 + React 19 + Rust Spotify Premium desktop client

---

## Quick Fixes (P0) — Before v1

| # | Title | Effort | Files |
|---|-------|--------|-------|
| 1 | **Merge identical .auth-btn CSS classes** — `.auth-btn-spotify` and `.auth-btn-primary` are identical per the TODO at global.css:1203 | small | `src/styles/global.css` |
| 2 | **Replace module-level engineRef with zustand store state** — `playerStore.ts` uses a mutable `let engineRef` outside the zustand store (line 32), which skips reactivity | medium | `src/features/player/playerStore.ts` |
| 3 | **Remove devMode before v1 release** — Strip devMode from authStore, LoginScreen, App, Sidebar, SettingsView, and CSS | medium | authStore.ts, LoginScreen.tsx, App.tsx, Sidebar.tsx, SettingsView.tsx, global.css |
| 4 | **Tighten CSP script-src** — Remove `'unsafe-eval'` after the sandbox rewrite from `new Function()` to iframe | small | `src-tauri/tauri.conf.json`, `SECURITY.md` |
| 5 | **Remove empty tauri plugins object** — Clean up empty `"plugins": {}` in tauri.conf.json | trivial | `src-tauri/tauri.conf.json` |

## New Features

### Small Effort
| Feature | Why | Files |
|---------|-----|-------|
| **Follow/unfollow artists & playlists** | Displayed in UI but no mutation wired | ArtistView.tsx, PlaylistDetail.tsx |
| **Sleep timer UI** | Backend abstraction exists, no UI | playbackTimer.ts, NowPlayingBar.tsx |
| **Library search & sort** | No filtering of saved items | LibraryView.tsx |

### Medium Effort
| Feature | Why | Files |
|---------|-----|-------|
| **Playlist CRUD** | Create, edit, delete playlists | PlaylistList.tsx, api/mod.rs |
| **Queue management UI** | Draggable queue panel | `src/features/queue/` |
| **Crossfade & gapless settings** | Wire through to both engines | Settings/Playback.tsx |
| **Keybinding config UI** | Remappable shortcuts persisted to localStorage | useKeyboardShortcuts.ts |
| **Lyrics display** | Synced lyrics in now-playing view | NowPlayingView.tsx |

### Large Effort
| Feature | Why |
|---------|-----|
| **Full now-playing view** | Large art, queue, related artists |
| **Personal stats dashboard** | Listening trends, top charts by period |
| **Audio equalizer** | 10-band EQ with presets |
| **Offline cache** | IndexedDB for metadata, audio cache for librespot |
| **Podcast support** | Episode library, speed controls, progress tracking |
| **Mini-player mode** | Tauri multi-window always-on-top |
| **Multi-account support** | Account switcher, token isolation |
| **Notification center** | New releases from followed artists |

## Refactoring

| # | Title | Effort | Files |
|---|-------|--------|-------|
| 1 | **Extract shared TrackRow component** — Duplicated across 5+ views | medium | AlbumView, ArtistView, LikedSongs, PlaylistDetail, SearchView |
| 2 | **Consolidate Rust API query param building** — 1306-line api/mod.rs duplicates patterns | medium | `src-tauri/src/api/mod.rs` |
| 3 | **Move engineRef into zustand store internals** — Full encapsulation after quick-fix | medium | `playerStore.ts` |
| 4 | **Standardize error handling across library views** — Each view handles loading/errors differently | small | `src/features/library/` |

## Testing

| # | What | Effort | Why |
|---|------|--------|-----|
| 1 | **Zustand store tests** (playerStore, authStore, pinsStore) | medium | Zero frontend store tests today |
| 2 | **Rust API client integration tests** with mocked HTTP | medium | No integration tests for any endpoint family |
| 3 | **Component smoke tests** with React Testing Library | medium | LoginScreen, NowPlayingBar, Sidebar, SearchView |
| 4 | **Expand Rust auth tests** (token refresh, keyring, error recovery) | small | 22 existing tests, gaps in error paths |

## Infrastructure & Documentation

| # | Item | Effort |
|---|------|--------|
| 1 | **Create ARCHITECTURE.md** — Directory layout, Tauri IPC bridge, auth/data flow, mod system | medium |
| 2 | **Set up CI** — GitHub Actions with clippy, test, typecheck, build | medium |
| 3 | **Audit Rust dependencies** — `cargo audit` + `cargo outdated` | medium |
| 4 | **Create RELEASE.md** — Formal v1 release checklist | small |
| 5 | **Production build validation** — Verify CSP injection, no warnings | small |
