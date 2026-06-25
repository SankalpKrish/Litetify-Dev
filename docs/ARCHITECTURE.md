# Architecture

Litetify is a **Tauri v2** application: a privileged **Rust core** (`src-tauri/`) paired with a **React 19 + TypeScript** renderer (`src/`) running in the system webview.

## Layer overview

```
┌─────────────────────────────────────────────────────┐
│                  Webview (renderer)                  │
│  React 19 / TS / Vite                                │
│  ┌──────────┐ ┌──────────┐ ┌───────────────────┐    │
│  │   UI     │ │ Mod API  │ │ Web Playback SDK   │    │
│  │ (views)  │ │ (sandbox)│ │ (websdk engine)    │    │
│  └──────────┘ └──────────┘ └───────────────────┘    │
│         │              │              │              │
│  ┌──────┴──────────────┴──────────────┴────────┐     │
│  │        @tauri-apps/api (IPC bridge)          │     │
│  └─────────────────────┬───────────────────────┘     │
├────────────────────────┼─────────────────────────────┤
│                  Tauri IPC (serialized)               │
├────────────────────────┼─────────────────────────────┤
│                 Rust core (privileged)                │
│  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Auth   │ │ API Proxy│ │ Playback │ │ Mods     │  │
│  │ (PKCE) │ │(Spotify) │ │(engine)  │ │(loader)  │  │
│  └────────┘ └──────────┘ └──────────┘ └──────────┘  │
│         │                                            │
│  ┌──────┴──────┐                                     │
│  │ OS Keychain │                                     │
│  │ (keyring)   │                                     │
│  └─────────────┘                                     │
└──────────────────────────────────────────────────────┘
```

## Rust core (`src-tauri/`)

The Rust side owns everything sensitive or native. It compiles to a static/shared library (`litetify_lib`) loaded by the Tauri executable.

### Modules

| Module | Responsibility | Key files |
|--------|---------------|-----------|
| `auth/` | PKCE flow, loopback callback server, OS keychain token storage | `pkce.rs`, `server.rs`, `tokens.rs` |
| `api/` | Spotify Web API proxy — all API calls go through Rust | `mod.rs` (~1292 lines) |
| `playback/` | `PlaybackEngine` trait with two implementations | `mod.rs`, `websdk.rs`, `librespot.rs` |
| `mods/` | Filesystem access for the mod loader | `mod.rs` |

### IPC handlers

Exposed via `#[tauri::command]` and registered in `lib.rs:run()`:

- **Auth:** `login`, `logout`, `check_auth`, `get_valid_token`, `get_profile`
- **API proxy:** `api_get_me`, `api_get_playlists`, `api_get_playlist`, `api_get_playlist_tracks`, `api_get_liked_tracks`, `api_get_album`, `api_get_artist`, `api_get_artist_top_tracks`, `api_get_artist_albums`, `api_get_related_artists`, `api_search`, `api_get_new_releases`, `api_get_featured_playlists`, `api_get_recommendations`, `api_get_categories`, `api_get_currently_playing`, `api_transfer_playback`, `api_get_available_devices`, `api_play`, `api_pause`, `api_next`, `api_previous`, `api_set_shuffle`, `api_set_repeat`, `api_add_to_queue`, `api_save_to_library`, `api_remove_from_library`, `api_check_library`, `api_add_to_playlist`, `api_remove_from_playlist`, `api_get_top_artists`, `api_get_top_tracks`, `api_get_recently_played`
- **Playback (websdk):** `set_active_device`, `get_active_device`, `engine_play`, `engine_pause`, `engine_resume`, `engine_seek`, `engine_set_volume`, `engine_next`, `engine_previous`, `engine_toggle_shuffle`, `engine_cycle_repeat`
- **Playback (librespot, feature-gated):** `init_librespot`, `librespot_play`, `librespot_pause`, `librespot_resume`, `librespot_seek`, `librespot_set_volume`, `librespot_next`, `librespot_previous`, `librespot_toggle_shuffle`
- **System:** `ping`, `scan_mods`, `read_mod_file`

### Security model

- **No client secret** — public desktop app uses PKCE
- **Tokens stored in OS keychain** via the `keyring` crate; never written to disk as plaintext
- **API calls proxied through Rust** — the access token never leaves the Rust process except when passed to the Web Playback SDK (accepted design constraint)
- **Tauri capabilities** scoped per feature in `capabilities/`

## Renderer (`src/`)

The webview side handles UI rendering and the mod sandbox.

### Key directories

| Directory | Purpose |
|-----------|---------|
| `src/features/auth/` | Login screen, auth state store (zustand) |
| `src/features/player/` | NowPlayingBar, transport controls, volume, progress, device selector |
| `src/features/library/` | Playlist detail, album view, artist view, liked songs |
| `src/features/search/` | Search with tabbed results |
| `src/features/browse/` | Personal home feed |
| `src/features/settings/` | Settings view, mods management, playback config |
| `src/features/contextmenu/` | Context menu with track actions |
| `src/features/pins/` | Pinned items store |
| `src/lib/` | API client (`api.ts`), Typescript types, React Query hooks, utilities |
| `src/playback/` | Playback engine TS interface, Web SDK and librespot TS adapters |
| `src/mods/` | Mod loader, sandbox, theming, custom app runtime, `window.Litetify` API |
| `src/styles/` | CSS custom property tokens, global styles |
| `src/app/` | Layout shell (sidebar, theme provider) |

### Mod system

The mod system (in `src/mods/`) provides Spicetify-compatible extension:

- **Mod loader** (`loader.ts`) — scans `mods/` directory, validates manifests, loads themes/extensions/apps
- **Sandbox** (`sandbox.ts`) — extensions run in hidden `<iframe sandbox="allow-scripts">` with no Tauri IPC, no `localStorage`, no arbitrary network hosts
- **API** (`api.ts`) — the `window.Litetify` object exposing `player`, `library`, `ui`, `storage`, and `events` APIs
- **Themes** (`themes.ts`) — CSS injection layer
- **Custom apps** (`apps.tsx`) — rendered as sidebar tabs

### Data flow

1. UI component calls a function in `src/lib/api.ts`
2. The API function invokes the corresponding Tauri command via `@tauri-apps/api/core`
3. Tauri serializes the call and passes it to the Rust handler
4. Rust authenticates (if needed), calls the Spotify Web API, and returns the result
5. The renderer receives typed data through React Query hooks in `src/lib/queries/`

## Build configuration

- **Vite** dev server on port 1420, HMR on port 1421
- **Code splitting** — vendor, query, player, auth, settings, and mods chunks
- **Tauri** builds the Rust core and bundles the frontend from `dist/`
- **TypeScript** strict mode with path alias `@/` → `src/`
- **Rust release profile** — LTO, single codegen unit, size optimization, stripping, abort-on-panic
