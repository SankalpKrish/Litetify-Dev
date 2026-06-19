# Architecture

> Mirrors section 2 of [`plan.md`](../plan.md). Kept in `docs/` for contributors
> who don't need the full execution plan.

## Overview

Litetify is a **Tauri v2** app: a privileged **Rust core** (`src-tauri/`) and a
**React + TypeScript** renderer (`src/`) running in the system webview.

- The **Rust core** owns anything sensitive or native: the OAuth/PKCE flow, the
  loopback callback server, token storage in the OS keychain, the Spotify Web
  API proxy, the playback-engine abstraction, and the mod loader's filesystem
  access.
- The **renderer** owns the UI, the Web Playback SDK integration, and the mod
  runtime (`window.Litetify` API + sandbox).

The access token **never leaves Rust** as a raw value where avoidable — API
calls are proxied through `#[tauri::command]`s.

## Directory layout

```
Litetify/
├─ src-tauri/                  # Rust core (privileged)
│   ├─ src/
│   │   ├─ main.rs             # binary entry → litetify_lib::run()
│   │   ├─ lib.rs              # Tauri builder, IPC handlers
│   │   ├─ auth/               # PKCE, loopback server, token store  (Phase 1)
│   │   ├─ playback/           # PlaybackEngine trait + impls        (Phase 3/6)
│   │   ├─ api/                # Spotify Web API proxy               (Phase 2)
│   │   └─ mods/               # mod loader filesystem access        (Phase 5)
│   ├─ Cargo.toml
│   ├─ tauri.conf.json
│   └─ capabilities/           # Tauri v2 permission scoping
├─ src/                        # React + TS + Vite (renderer)
│   ├─ main.tsx
│   ├─ App.tsx                 # Phase 0 shell
│   ├─ app/                    # routing, layout, theme provider     (Phase 4)
│   ├─ features/               # auth, player, library, search, browse
│   ├─ playback/               # JS Web Playback SDK side            (Phase 3)
│   ├─ mods/                   # mod runtime + Litetify API          (Phase 5)
│   ├─ lib/                    # api client, query hooks, stores
│   └─ styles/                 # design tokens = theming contract    (Phase 4)
├─ mods/                       # user-installed mods (gitignored)
├─ docs/
└─ plan.md
```

## Key decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Shell | Tauri v2 | ~12MB binary, ~80MB RAM; webview keeps UI moddable via CSS/JS |
| UI | React + TS + Vite | Fast HMR, large ecosystem, easy to expose a mod API |
| Auth | PKCE + loopback `127.0.0.1` | Required post-2025-11-27; no secret on a public client |
| Token storage | OS keychain | Never plaintext, never git |
| Playback | `PlaybackEngine` trait, 2 impls | Web SDK = compliant default; librespot = opt-in |
| Modding | Manifest + loader + sandbox + `window.Litetify` | Spicetify parity |
| Styling | CSS custom properties | Themes override tokens, not internals |

## The `PlaybackEngine` abstraction

A single trait so the rest of the app never hard-codes a backend:

```rust
pub trait PlaybackEngine: Send + Sync {
    fn play(&self, uri: &str) -> Result<()>;
    fn pause(&self) -> Result<()>;
    fn resume(&self) -> Result<()>;
    fn seek(&self, position_ms: u64) -> Result<()>;
    fn set_volume(&self, percent: u8) -> Result<()>;
    fn next(&self) -> Result<()>;
    fn previous(&self) -> Result<()>;
    fn state(&self) -> Result<PlaybackState>;
    fn name(&self) -> &'static str; // "websdk" | "librespot"
}
```

- `WebSdkEngine` — default, always built. Thin bridge to the webview SDK.
- `LibrespotEngine` — feature-gated (`--features librespot`), off by default,
  unofficial/opt-in.

## Security posture (summary)

- No client secret shipped (public client, PKCE).
- Tokens only in the OS keychain; never logged.
- Tauri capabilities scoped to the minimum per feature.
- Mod extensions run sandboxed behind a versioned `window.Litetify` API with no
  raw token / IPC / arbitrary-network access. Verified in Phase 5/7.
