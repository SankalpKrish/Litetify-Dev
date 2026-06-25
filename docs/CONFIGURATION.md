# Configuration

## Environment variables

Copy `.env.example` to `.env` at the project root:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_SPOTIFY_CLIENT_ID` | At runtime | — | Spotify app Client ID from the [Developer Dashboard](https://developer.spotify.com/dashboard) |
| `VITE_SPOTIFY_REDIRECT_URI` | No | `http://127.0.0.1:14523/callback` | OAuth callback URI — must match a registered redirect URI in the Spotify dashboard |

> ⚠️ **Loopback IP required.** Spotify removed `localhost` and HTTP hostname redirect URIs on 2025-11-27. The URI must use the `127.0.0.1` IP literal.

The app also accepts the Client ID via the login screen UI if no `.env` is set.

## Tauri configuration

The native window and build settings live in `src-tauri/tauri.conf.json`:

| Key | Value | Description |
|-----|-------|-------------|
| `productName` | Litetify | Window/bundle name |
| `identifier` | `com.litetify.app` | App bundle identifier |
| `build.devUrl` | `http://localhost:1420` | Vite dev server URL |
| `build.frontendDist` | `../dist` | Production frontend build output |
| `app.windows[0]` | 1100×720 (min 720×480) | Main window dimensions, resizable |
| `bundle.targets` | `all` | NSIS (Windows), DMG (macOS), AppImage/Deb (Linux) |

### CSP policy

The Content Security Policy in `security.csp` allows connections to:
- `*.scdn.co`, `*.spotifycdn.com` — album art and media
- `api.spotify.com`, `accounts.spotify.com` — OAuth and API
- `wss://*.spotify.com` — Web Playback SDK WebSocket
- `sdk.scdn.co` — Web Playback SDK script

## Vite configuration

Defined in `vite.config.ts`:

- **Dev server:** port 1420, strict port, HMR on 1421 when behind Tauri
- **Build target:** `es2021` (webview compatibility)
- **Minifier:** esbuild
- **Sourcemaps:** disabled in production
- **Code splitting** via `rollupOptions.output.manualChunks`:
  - `vendor` — React, ReactDOM
  - `query` — @tanstack/react-query
  - `player` — NowPlayingBar, transport controls, progress bar, volume, now-playing info
  - `auth` — LoginScreen
  - `settings` — SettingsView
  - `mods` — loader, sandbox, mod API

## TypeScript configuration

Defined in `tsconfig.json`:

- **Target:** ES2022 with bundler module resolution
- **Strict mode** enabled with `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- **Path alias:** `@/` → `src/`
- **JSX:** `react-jsx` transform
- **Includes:** `src/` and `vite.config.ts`

## Rust configuration

### `src-tauri/Cargo.toml`

- **Edition:** 2021, MSRV 1.77.2
- **Library crate:** `litetify_lib` (staticlib, cdylib, rlib)
- **Feature flags:**

| Feature | Dependencies | Description |
|---------|-------------|-------------|
| `default` | — | Web SDK playback engine only |
| `librespot` | librespot 0.7, vergen | Native audio engine (opt-in, off by default) |

### Release profile

```toml
[profile.release]
panic = "abort"
codegen-units = 1
lto = true
opt-level = "s"
strip = true
```

Optimizes for binary size and security (abort-on-panic).

## Build scripts

| Command | Pipeline |
|---------|----------|
| `npm run tauri dev` | Vite dev → Tauri dev (Rust + webview window) |
| `npm run dev` | Vite dev server only (browser-based UI iteration) |
| `npm run build` | `tsc --noEmit` → `vite build` |
| `npm run tauri build` | TypeScript build → Rust release build → native installer |

## Runtime redirect URI

<!-- VERIFY: confirm the port 14523 is not blocked by firewall or used by another service on the developer's machine -->

The OAuth loopback server binds to port 14523 with automatic fallback across ports 14523–14532 (10 attempts).

## CI/CD

<!-- VERIFY: no GitHub Actions workflows or CI configs exist in the repository -->
<!-- VERIFY: no Docker, docker-compose, or container deployment configs exist -->

The project has no CI/CD configuration as of v0.1.0. Builds are local only.
