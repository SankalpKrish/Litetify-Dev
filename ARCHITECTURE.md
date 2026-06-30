# Litetify Architecture

Litetify is a Tauri desktop client for Spotify with a TypeScript/React frontend and a Rust backend. The app supports modular audio engines and a sandboxed mod system for extensibility.

---

## Directory Layout

```
litetify/
├── src/                          # Frontend (TypeScript / React)
│   ├── app/                      #   App shell — Sidebar, top-level layout
│   ├── features/                 #   Feature modules, one folder per domain
│   │   ├── auth/                 #     Login / logout flow
│   │   ├── browse/               #     Browse and discover views
│   │   ├── contextmenu/          #     Right-click context menus
│   │   ├── library/              #     User library (playlists, saved albums)
│   │   ├── pins/                 #     Pinned sidebar items
│   │   ├── player/               #     Player UI, controls, playback state
│   │   ├── search/               #     Search view
│   │   └── settings/             #     App preferences UI
│   ├── lib/                      #   Shared utilities
│   │   ├── queries/              #     TanStack Query hooks & mutations
│   │   ├── api.ts                #     Tauri invoke wrapper + types
│   │   ├── types.ts              #     Shared TypeScript types
│   │   ├── keybindings.ts        #     Global keyboard shortcut manager
│   │   ├── utils.ts              #     General-purpose helpers
│   │   ├── ErrorBoundary.tsx     #     React error boundary
│   │   └── ViewState.ts          #     Navigation state machine
│   ├── mods/                     #   Mod / sandbox system
│   │   ├── loader.ts             #     Mod discovery and loading
│   │   ├── store.ts              #     Mod state management
│   │   ├── sandbox.ts            #     iframe sandbox lifecycle
│   │   ├── themes.ts             #     Mod-driven theming
│   │   ├── manifest.ts           #     Mod manifest parsing
│   │   ├── components/           #     Mod-related React components
│   │   └── ...
│   ├── playback/                 #   Engine abstraction layer
│   │   ├── engine.ts             #     PlaybackEngine interface
│   │   ├── websdk.ts             #     Web SDK engine implementation
│   │   └── librespot.ts          #     Librespot engine implementation
│   └── styles/                   #   Global CSS
│       ├── global.css
│       └── tokens.css            #   Design tokens (colors, spacing, fonts)
│
└── src-tauri/src/                # Backend (Rust / Tauri)
    ├── api/                      #   Spotify REST API HTTP client
    │   └── mod.rs                #     Wrapper with retry & backoff
    ├── auth/                     #   OAuth PKCE flow
    │   ├── mod.rs
    │   ├── pkce.rs               #     Code verifier / challenge generation
    │   ├── store.rs              #     Token persistence
    │   └── server.rs             #     Local redirect server
    ├── mods/                     #   Mod system (Rust side)
    │   └── mod.rs                #     Filesystem scanning, file reads
    └── playback/                 #   Playback backends
        ├── mod.rs                #     Engine registry
        ├── websdk.rs             #     Web SDK wrapper (default)
        └── librespot.rs          #     Native librespot (optional, feature-gated)
```

---

## Tauri IPC Bridge

Communication between frontend and backend follows a straightforward command pattern.

```
React component
  └─ invoke('command_name', { args })
       └─ #[tauri::command] in src-tauri/src/lib.rs
            └─ backend helper (api::*, auth::*, mods::*, playback::*)
```

- **~25 registered commands** covering Spotify API endpoints (`api_follow_artist`, `get_top_artists`, …), playback controls, auth flow, and mod filesystem operations.
- The Rust handlers are thin — they validate inputs, delegate to the appropriate module, and return serialized results.
- `src-tauri/src/api/mod.rs` exposes `BASE_URL = https://api.spotify.com/v1` with configurable retry (`MAX_RETRIES = 3`, `BASE_BACKOFF_MS = 500`) and handles token injection and null-skipping deserialization.

---

## Auth Flow

Litetify uses the **Authorization Code with PKCE** flow.

1. Frontend triggers login → Rust generates a code verifier + SHA-256 challenge.
2. A local HTTP server (`auth/server.rs`) listens for the redirect.
3. User is directed to Spotify's accounts page; after consent Spotify redirects to `http://127.0.0.1:<port>` with an auth code.
4. Rust exchanges the code + verifier for an access token and refresh token.
5. Tokens are persisted to disk (`auth/store.rs`).
6. On expiry, the Rust API wrapper automatically refreshes using the stored refresh token.
7. On failure (refresh token expired / revoked), the user re-authorizes.

---

## Data Flow

```
React component
  └─ useQuery / useMutation (@tanstack/react-query)
       └─ api.ts (typed invoke wrappers)
            └─ invoke('command_name', …)
                 └─ Rust #[tauri::command]
                      └─ api/mod.rs (Spotify REST client)
                           └─ HTTPS → api.spotify.com/v1/...
```

- **@tanstack/react-query** manages caching, refetching, and optimistic updates on the frontend.
- **`src/lib/api.ts`** provides typed functions that call `window.__TAURI__.invoke(...)` and map responses to shared TypeScript types from `src/lib/types.ts`.
- **`src/lib/queries/`** contains React Query hooks that use `api.ts` — each feature imports only the queries it needs.
- The Rust API client (`api/mod.rs`) handles HTTP transport, token injection, retry with exponential backoff, and response deserialization.

---

## Mod System

The mod system allows third-party extensions via sandboxed iframes.

```
Discovery
  └─ Rust scans src-tauri/mods/ for mod manifests
       └─ TypeScript loader reads manifests + files
            └─ Sandbox creates an <iframe> per mod
                 └─ postMessage protocol for mod ↔ host IPC
```

- **`src/mods/manifest.ts`** — parses mod metadata (name, version, permissions, entry point).
- **`src/mods/loader.ts`** — coordinates discovery: Rust lists mods on disk, loader fetches each manifest.
- **`src/mods/sandbox.ts`** — creates isolated iframes for mod execution. Communication happens via a strict `postMessage` protocol — the host dispatches allowed API calls, the mod sends structured requests.
- **`src/mods/themes.ts`** — mods can contribute CSS custom properties; the theming system merges them with the base token set.
- The Rust side (`src-tauri/src/mods/mod.rs`) provides filesystem operations: scanning for installed mods, reading manifest files, and serving mod assets.

---

## Playback Engine Architecture

Playback is abstracted behind a common interface so different backends can be swapped without changing the player UI.

```
playerStore (Zustand-ish)
  └─ PlaybackEngine interface (engine.ts)
       ├─ WebSDKEngine (websdk.ts)   — default
       └─ LibrespotEngine (librespot.ts) — optional, feature-gated in Rust
```

- **`src/playback/engine.ts`** defines the `PlaybackEngine` interface: `play`, `pause`, `next`, `previous`, `seek`, `setVolume`, `getState`, `addListener`, `destroy`.
- **`src/playback/websdk.ts`** — wraps the Spotify Web SDK (client-side JS). This is the default playback path.
- **`src/playback/librespot.ts`** — connects to a native librespot instance via the Tauri IPC bridge. This path is gated behind `#[cfg(feature = "librespot")]` in Rust. The frontend negotiates which engine to instantiate based on the backend feature flag.
- **`src/features/player/`** contains the React components (controls, progress bar, now-playing bar) and a `playerStore` that holds playback state and delegates actions to the active `PlaybackEngine` instance.
- Playback commands registered in Rust (`playback/websdk.rs`, `playback/librespot.rs`) are thin wrappers that forward to the corresponding engine.

---

## Tech Stack

| Layer        | Technology                                      |
|-------------|-------------------------------------------------|
| Desktop shell | Tauri 2.x (Rust)                               |
| Frontend     | TypeScript, React 18                            |
| Styling      | CSS with custom properties (design tokens)      |
| Data fetching | @tanstack/react-query                          |
| State        | Local stores (per-feature or Zustand-inspired)  |
| Auth         | OAuth PKCE (Rust, no client secret)             |
| Audio        | Spotify Web SDK (default) / librespot (opt-in)  |
| Extension    | Sandboxed mod system (iframes + postMessage)    |
