# Getting Started

## Prerequisites

1. **Node.js** ≥ 20 (`.nvmrc` pins **24**). Install via [nvm](https://github.com/nvm-sh/nvm) or [nodejs.org](https://nodejs.org).
2. **Rust stable toolchain** — install via [rustup](https://rustup.rs). Ensure `cargo` and `rustc` are on your `PATH`.
3. **Platform build dependencies** for [Tauri v2](https://tauri.app/start/prerequisites/):
   - **Windows:** WebView2 runtime (ships with Windows 11; available for Windows 10 via update)
   - **macOS:** Xcode Command Line Tools (`xcode-select --install`)
   - **Linux:** `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, and related packages

## Clone and install

```bash
git clone <repo-url>
cd Litetify
npm install
```

`npm install` installs both the JavaScript dependencies and triggers Tauri's build script for the Rust crate.

## Configure Spotify credentials

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app.
2. Click **Settings** → **Redirect URIs** and add:
   ```
   http://127.0.0.1:14523/callback
   ```
   > ⚠️ Spotify removed `localhost` and HTTP hostname redirect URIs on 2025-11-27. The loopback IP literal `127.0.0.1` is required.
3. Copy the **Client ID** from the app dashboard.
4. (Optional) Create `.env` from `.env.example`:
   ```bash
   cp .env.example .env
   # Edit .env and set VITE_SPOTIFY_CLIENT_ID=<your-client-id>
   ```
   If you skip this step, you can enter the Client ID on the app's login screen at runtime.

## Run in development mode

```bash
npm run tauri dev
```

This starts:
1. The Vite dev server on `http://localhost:1420`
2. The Tauri Rust compilation and window launch
3. HMR for both the frontend (through Vite) and Rust (rebuild on re-run)

For frontend-only work (no Tauri window, browser-based with simulated IPC):

```bash
npm run dev
```

## Login and verify

1. The app window opens to the login screen.
2. Paste your Spotify Client ID and click **Log in with Spotify**.
3. Your browser opens to Spotify's authorization page. Approve the requested scopes.
4. The browser redirects to `http://127.0.0.1:14523/callback` with an auth code. The Tauri loopback server captures this code.
5. Litetify exchanges the code for tokens, stores them in the OS keychain, and redirects you to the home view.

**Premium required.** If your Spotify account is not Premium, the app will show an error and clear the tokens.

## What's next

- Browse your library, playlists, and saved albums
- Search for tracks, artists, and albums
- Explore the mod system in [docs/MODDING.md](MODDING.md)
- Check the architecture overview in [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- Review [DEVELOPMENT.md](DEVELOPMENT.md) for contributing guidelines
