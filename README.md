# Litetify

A **lightweight, performant, moddable** Spotify **Premium** desktop client.

Built on **Tauri (Rust) + React/TypeScript**. Aims to be smaller and faster than
the official Electron app, with a Spicetify-style mod system for themes,
extensions, and custom apps.

> **Premium required.** Litetify uses Spotify's Web Playback SDK, which only
> works with Spotify Premium accounts.

---

## Status

**Phases 1-5 complete.** A production-ready desktop Spotify client with:

- **Spotify OAuth** via PKCE — login, token refresh, OS keychain storage
- **Playback** via Spotify Web Playback SDK — play/pause/seek/volume/next/prev with full transport controls
- **Library browsing** — playlists, liked songs, albums, artists, search
- **Home/Browse** — featured, new releases, recommendations
- **Design system** — CSS custom property tokens, dark theme, Inter type scale, responsive layout
- **Mod system** (Spicetify-parity) — themes, extensions, and custom apps from `mods/` folder with no rebuild

### Mod system

Users can install three types of mods in `mods/`:

| Type | What it does | Example |
|------|-------------|---------|
| **Theme** | CSS that overrides design tokens | `mods/examples/dark-theme/` |
| **Extension** | JS that runs in a sandboxed iframe, interacting only via the `Litetify` API | `mods/examples/skip-to-favorite/` |
| **Custom App** | Full-page views that appear as new sidebar tabs | `mods/examples/stats-app/` |

Extensions run in a **hardened sandbox** — hidden `<iframe>` with unique origin, no access to Tauri IPC, `localStorage`, or arbitrary network hosts. Full threat model in [`SECURITY.md`](./SECURITY.md).

See [`docs/MODDING.md`](./docs/MODDING.md) for the authoring guide and API reference.

See [`plan.md`](./plan.md) for the full roadmap.

## Prerequisites

- **Node.js** ≥ 20 (repo pins **24** via `.nvmrc`)
- **Rust** stable toolchain — install from <https://rustup.rs>
  (`cargo`/`rustc` must be on your `PATH`)
- Platform build deps for Tauri v2 — see the
  [Tauri prerequisites guide](https://tauri.app/start/prerequisites/)
  (Linux needs `libwebkit2gtk-4.1-dev` et al.; Windows needs the WebView2
  runtime, which ships with Windows 11)

## Setup

```bash
# 1. Install JS deps
npm install

# 2. Run in dev (launches the desktop window with HMR)
npm run tauri dev
```

`npm run dev` alone runs only the Vite web build (no Tauri core; the IPC ping
falls back to a browser message) — useful for fast UI iteration.

## Spotify Client ID

Litetify is a **public desktop app**, so it uses the **Authorization Code +
PKCE** flow and ships **no client secret**. Each user supplies their own
Spotify **Client ID**:

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
   and create an app.
2. Add this **Redirect URI** exactly:
   `http://127.0.0.1:14523/callback`
   - Spotify removed `localhost` and `http`-hostname redirect URIs on
     **2025-11-27**; a **loopback IP literal** (`127.0.0.1`) is required.
3. Copy the **Client ID**. Enter it in the app's login screen on first run
   (or set `VITE_SPOTIFY_CLIENT_ID` in a local `.env` — see `.env.example`).

## Scripts

| Command               | What it does                                   |
| --------------------- | ---------------------------------------------- |
| `npm run tauri dev`   | Run the full desktop app (Rust core + webview) |
| `npm run dev`         | Vite web-only dev server                       |
| `npm run build`       | Typecheck + build the frontend bundle          |
| `npm run tauri build` | Produce native installers                      |
| `npm run lint`        | ESLint (zero-warning policy)                   |
| `npm run typecheck`   | `tsc --noEmit`                                 |
| `npm run format`      | Prettier write                                 |
| `npm test`            | Vitest                                         |

## Project layout

See [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## License

MIT
