# Litetify

A **lightweight, performant, moddable** Spotify **Premium** desktop client — built on **Tauri v2 (Rust) + React 19/TypeScript**.

Smaller and faster than the official Electron app, with a Spicetify-style mod system for themes, extensions, and custom apps.

> **Premium required.** Litetify uses the Spotify Web Playback SDK, which only works with Spotify Premium accounts.

## Features

- **Spotify OAuth** via Authorization Code + PKCE with OS keychain token storage, auto-refresh, and Premium enforcement
- **Dual playback engines** — Web Playback SDK (default) or librespot native audio (opt-in, feature-gated)
- **Full transport controls** — play, pause, seek, volume, next, previous, shuffle, repeat
- **Library browsing** — playlists, liked songs, albums, artists with detail views
- **Personal home feed** — recently played, top artists, top tracks, personalized playlists
- **Search** — debounced queries with tabbed results (tracks, artists, albums, playlists)
- **Mod system** — themes (CSS injection), extensions (sandboxed iframe), custom apps (sidebar tabs) from `mods/` folder, no rebuild required
- **Design system** — 72 CSS custom property tokens, dark theme, Inter type scale
- **Keyboard shortcuts** — Space (play/pause), arrows (seek/volume), and more
- **Media Session API** — OS media keys integration
- **Accessibility** — ARIA labels, keyboard nav, skip-link, reduced-motion support, focus-visible
- **Performance** — lazy-loaded views, code-split chunks, compositor-only animations, error boundaries

## Prerequisites

- **Node.js** ≥ 20 (`.nvmrc` pins **24**)
- **Rust** stable toolchain — install via [rustup](https://rustup.rs)
- **Platform build deps** for [Tauri v2](https://tauri.app/start/prerequisites/) (Linux: `libwebkit2gtk-4.1-dev`; Windows: WebView2, ships with Windows 11)

## Quick start

```bash
npm install
npm run tauri dev
```

See [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md) for the full setup guide.

## Spotify Client ID

Litetify is a **public desktop app** using PKCE — no client secret shipped. Each user supplies their own Client ID:

1. Register an app at the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Add redirect URI exactly: `http://127.0.0.1:14523/callback`
3. Enter the Client ID on the app's login screen (or set `VITE_SPOTIFY_CLIENT_ID` in `.env`)

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run tauri dev` | Run the full desktop app (Rust + webview) |
| `npm run dev` | Vite web-only dev server |
| `npm run build` | Typecheck + build frontend |
| `npm run tauri build` | Build native installers |
| `npm run lint` | ESLint (zero-warning policy) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run format` | Prettier |
| `npm test` | Vitest |

## Mod system

| Type | What it does | Example |
|------|-------------|---------|
| **Theme** | CSS overriding design tokens | `mods/examples/dark-theme/` |
| **Extension** | Sandboxed JS interacting via `window.Litetify` API | `mods/examples/skip-to-favorite/` |
| **Custom App** | Full-page view as a new sidebar tab | `mods/examples/stats-app/` |

Extensions run in hardened sandboxes — see [docs/MODDING.md](docs/MODDING.md) and [SECURITY.md](SECURITY.md).

## Project layout

```
Litetify/
├── src-tauri/       # Rust core (privileged): auth, API proxy, playback, mod loader
├── src/             # React/TS renderer: UI, Web SDK, mod runtime
├── mods/            # User-installed mods (gitignored)
├── docs/            # Documentation
└── plan.md          # Roadmap
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full architecture breakdown.

## License

MIT

---

**Disclaimer:** Litetify is an independent open-source project not affiliated with or endorsed by Spotify. "Spotify" is a registered trademark of Spotify AB.
