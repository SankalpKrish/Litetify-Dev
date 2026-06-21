# Litetify — Execution Plan

> A lightweight, performant, **moddable** Spotify Premium desktop client.
> Built on **Tauri + React/TypeScript**. Swappable playback engine
> (Web Playback SDK default, librespot opt-in). Spicetify-parity mod system.
>
> **Executor:** Deepseek V4 Flash Max.
> **This document is the single source of truth.** Execute phases in order.
> Every task lists: files to touch, exact acceptance criteria, and the
> recommended skill to invoke.

---

## 0. How To Use This Plan (read first)

1. Execute **phases in numerical order**. Do not start a phase until the
   previous phase's **Phase Gate** passes.
2. Each **Task** is atomic: one logical unit, one commit. Commit message
   format: `phase-N/task-N.M: <summary>`.
3. Before any task that says `[skill: X]`, **invoke skill X** (via the Skill
   tool) and follow it. Skills live in the `.agents/skills` directory.
4. After each task, run its **Acceptance** checks. If a check fails, **stop and
   fix** before moving on — do not accumulate broken state.
5. When you deviate from the plan, write a one-line note in
   `DEVIATIONS.md` (path, reason, what you did instead).
6. **Never commit secrets.** Client ID is public; there is **no client
   secret** in this app (PKCE). Tokens live in the OS keychain, never in git.
7. If a step is ambiguous, prefer: smaller binary, less RAM, fewer deps,
   compliance with Spotify ToS. These are the project's tie-breakers.

### Tie-breaker priorities (in order)

1. Correctness & ToS compliance
2. Performance (RAM, startup time, binary size)
3. Moddability / extensibility
4. Developer ergonomics
5. Feature breadth

---

## 1. Product Spec (the WHAT)

### Goals

- A desktop Spotify **Premium** client that is **lighter and faster** than the
  official Electron app (target: cold start < 1.5s, idle RAM < 100MB, binary
  < 25MB).
- **OAuth via Spotify** (Authorization Code + PKCE) — Premium accounts only.
- **Moddable** like Spicetify: users can install themes (CSS), extensions
  (JS with a documented API), and custom apps (new tabs), without recompiling.
- Cross-platform: Windows, macOS, Linux.

### Non-goals (v1)

- Offline download / local-file playback.
- Podcast-specific UI beyond basic episode playback.
- Mobile / web-hosted build.
- Social features beyond what the Web API trivially exposes.
- Circumventing DRM or Spotify ToS.

### Target users

Spotify **Premium** subscribers who want a faster, customizable desktop client.

### Hard constraints (do not violate)

- **Premium-only.** Web Playback SDK and `streaming` scope require Premium.
- **No client secret** is shipped (desktop app → public client → PKCE).
- **As of 27 Nov 2025**, Spotify OAuth **removed** `http://` redirect URIs and
  `localhost` aliases. The desktop redirect **must** use a **loopback IP
  redirect `http://127.0.0.1:<port>/callback`** (loopback IP literals are the
  supported desktop pattern) **or a custom URI scheme** `litetify://callback`
  registered with the OS. Plan uses the **loopback `127.0.0.1`** approach as
  primary (simplest, most portable), custom scheme as fallback.
- Tokens stored only in the **OS keychain** (never plaintext, never git).

---

## 2. Architecture (the HOW)

```
Litetify/
├─ src-tauri/                  # Rust core (privileged)
│   ├─ src/
│   │   ├─ main.rs             # Tauri app bootstrap, window, plugins
│   │   ├─ auth/               # PKCE flow, loopback server, token refresh
│   │   │   ├─ mod.rs
│   │   │   ├─ pkce.rs         # verifier/challenge gen
│   │   │   ├─ server.rs       # 127.0.0.1 callback listener
│   │   │   └─ tokens.rs       # keychain store/load/refresh
│   │   ├─ playback/           # PlaybackEngine trait + impls
│   │   │   ├─ mod.rs          # trait PlaybackEngine
│   │   │   ├─ websdk.rs       # bridge to webview Web Playback SDK
│   │   │   └─ librespot.rs    # opt-in native engine (feature-gated)
│   │   ├─ api/                # Spotify Web API proxy (rate-limit, retry)
│   │   ├─ mods/               # mod loader: read manifests, expose to UI
│   │   └─ ipc.rs              # #[tauri::command] surface
│   ├─ Cargo.toml
│   ├─ tauri.conf.json
│   └─ capabilities/           # Tauri v2 permission scoping
├─ src/                        # React + TS + Vite (renderer)
│   ├─ main.tsx
│   ├─ app/                    # routing, layout, theme provider
│   ├─ features/
│   │   ├─ auth/               # login screen, token state
│   │   ├─ player/             # now-playing bar, controls, queue
│   │   ├─ library/            # playlists, liked, albums, artists
│   │   ├─ search/             # search + results
│   │   └─ browse/             # home, new releases
│   ├─ playback/               # JS side of Web Playback SDK
│   ├─ mods/                   # mod runtime: loader, sandbox, Litetify API
│   │   ├─ api.ts              # window.Litetify API surface
│   │   ├─ loader.ts           # discover + inject themes/extensions/apps
│   │   └─ sandbox.ts          # isolate extension execution
│   ├─ lib/                    # api client, query hooks, stores
│   └─ styles/                 # design tokens (CSS vars) = theming hook
├─ mods/                       # user-installed mods live here (gitignored)
│   └─ README.md               # mod authoring docs
├─ docs/
│   ├─ MODDING.md              # how to write themes/extensions/apps
│   └─ ARCHITECTURE.md
├─ plan.md                     # this file
├─ DEVIATIONS.md               # executor logs deviations here
└─ package.json
```

### Key design decisions

| Decision      | Choice                                              | Why                                                           |
| ------------- | --------------------------------------------------- | ------------------------------------------------------------- |
| Shell         | Tauri v2                                            | ~12MB binary, ~80MB RAM, webview keeps UI moddable via CSS/JS |
| UI            | React + TS + Vite                                   | Fast HMR, large ecosystem, easy to expose a mod API           |
| State/data    | TanStack Query + Zustand                            | Cache Spotify API, minimal boilerplate                        |
| Auth          | PKCE + loopback 127.0.0.1                           | Required post-Nov-2025; no secret on client                   |
| Token storage | OS keychain via Tauri plugin                        | Never plaintext                                               |
| Playback      | `PlaybackEngine` trait, 2 impls                     | Web SDK = compliant default; librespot = opt-in power         |
| Modding       | Manifest + loader + sandbox + `window.Litetify` API | Spicetify parity                                              |
| Styling       | CSS custom properties as the theming contract       | Themes override tokens, not internals                         |

### The `PlaybackEngine` abstraction (critical)

Define a single trait/interface so the rest of the app never hard-codes a
backend:

```rust
// src-tauri/src/playback/mod.rs
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

- `WebSdkEngine`: thin bridge — actual playback runs in the webview JS SDK;
  Rust forwards commands/state over IPC. **Default, always built.**
- `LibrespotEngine`: native audio via the `librespot` crate. **Feature-gated**
  (`--features librespot`), **off by default**, clearly labeled unofficial.

---

## 3. Risk Register (read before building)

| Risk                                                      | Impact                           | Mitigation                                                                                   |
| --------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------------------- |
| OAuth redirect rules changed Nov 2025 (no localhost/http) | Auth breaks                      | Use `http://127.0.0.1:<port>/callback` loopback IP; register URI in dashboard exactly        |
| Web Playback SDK needs Widevine DRM in webview            | No audio on some Linux WebKitGTK | Document Widevine requirement; librespot is the Linux fallback                               |
| librespot is unofficial → ToS gray area + breakage        | Account risk / maintenance       | Off by default, feature-gated, explicit user opt-in + warning                                |
| Spotify API rate limits (429)                             | Stutter / bans                   | Centralized API client with backoff + retry-after honoring                                   |
| Malicious mods (JS extensions)                            | Security                         | Sandbox extensions, scoped `Litetify` API, no raw Node/Tauri access, user consent on install |
| Token leakage                                             | Account compromise               | Keychain only; never log tokens; redact in errors                                            |
| Webview perf regression vs native                         | Defeats purpose                  | Budget checks each phase gate (RAM/start time)                                               |

---

## 4. Execution Phases

> Each phase ends with a **Phase Gate**. Do not proceed until it passes.

---

### Phase 0 — Project bootstrap & scaffolding

**Goal:** A running, empty Tauri + React + TS app that builds on all 3 OSes.

- **Task 0.1 — Init repo tooling** `[skill: gsd-new-project]`
  - Files: `package.json`, `.gitignore`, `.editorconfig`, `tsconfig.json`,
    `.nvmrc`.
  - `.gitignore` MUST include: `mods/`, `node_modules/`, `dist/`,
    `src-tauri/target/`, `.env*`, `*.log`.
  - Acceptance: `git status` clean except intended files; no secrets tracked.

- **Task 0.2 — Scaffold Tauri v2 + Vite + React + TS**
  - Use `create-tauri-app` (React-TS template) or manual scaffold.
  - Files: `src-tauri/` (Cargo.toml, tauri.conf.json, main.rs), `src/main.tsx`,
    `vite.config.ts`, `index.html`.
  - Set app identifier `com.litetify.app`, product name `Litetify`.
  - Acceptance: `npm run tauri dev` opens a window rendering a React page.
    `npm run tauri build` produces a binary.

- **Task 0.3 — Linting / formatting / hooks**
  - Files: `eslint.config.js`, `.prettierrc`, `rustfmt.toml`, `clippy` config.
  - Add scripts: `lint`, `format`, `typecheck`.
  - Acceptance: `npm run lint && npm run typecheck` pass on the scaffold.

- **Task 0.4 — CI**
  - Files: `.github/workflows/ci.yml`.
  - CI matrix: ubuntu/macos/windows → install, lint, typecheck, `tauri build`.
  - Acceptance: workflow file valid; build job defined for all 3 OSes.

- **Task 0.5 — Baseline docs**
  - Files: `docs/ARCHITECTURE.md` (copy section 2 here), `README.md`.
  - Acceptance: docs render; README explains Premium-only + how to set Client ID.

**Phase 0 Gate:**

- [ ] `npm run tauri dev` runs and shows a window.
- [ ] `npm run tauri build` succeeds locally.
- [ ] Lint + typecheck clean.
- [ ] No secrets in git; `mods/` ignored.

---

### Phase 1 — Spotify OAuth (PKCE) & token lifecycle

**Goal:** User clicks "Log in with Spotify", completes OAuth, and the app holds
a valid, auto-refreshing access token stored in the OS keychain.

> **Prereq the user must do (document in README):** Create a Spotify app at
> developer.spotify.com, note the **Client ID**, and add redirect URI
> `http://127.0.0.1:<fixed-or-range>/callback`. App must NOT request a client
> secret usage path.

- **Task 1.1 — PKCE utilities (Rust)**
  - File: `src-tauri/src/auth/pkce.rs`.
  - Generate `code_verifier` (43–128 chars, high entropy) and
    `code_challenge` = base64url(SHA256(verifier)), method `S256`.
  - Acceptance: unit test proves challenge derivation matches a known vector.
    `[skill: tdd]` — write the test first.

- **Task 1.2 — Loopback callback server (Rust)**
  - File: `src-tauri/src/auth/server.rs`.
  - Bind `127.0.0.1` on a port (fixed default, fallback to ephemeral if taken),
    serve `/callback`, capture `code` + `state`, return a "you can close this
    tab" HTML page, then shut down.
  - Validate `state` matches the value sent (CSRF protection).
  - Acceptance: integration test hits the local server with a mock redirect and
    the `code` is captured; mismatched `state` is rejected.

- **Task 1.3 — Authorization request + token exchange**
  - File: `src-tauri/src/auth/mod.rs`.
  - Build authorize URL with scopes:
    `streaming user-read-email user-read-private user-read-playback-state
 user-modify-playback-state user-library-read user-library-modify
 playlist-read-private playlist-read-collaborative`.
  - Open system browser to authorize URL (Tauri opener).
  - On callback `code`, POST to `/api/token` with PKCE verifier (no secret) to
    get `access_token`, `refresh_token`, `expires_in`.
  - Acceptance: end-to-end manual login yields a token; token JSON validated.

- **Task 1.4 — Keychain token storage + refresh**
  - File: `src-tauri/src/auth/tokens.rs`.
  - Use Tauri keychain/stronghold plugin (or OS keyring crate) to store tokens.
  - Auto-refresh: refresh when `< 60s` to expiry; expose a
    `get_valid_access_token()` command.
  - Acceptance: kill app, relaunch → still logged in (refresh works); tokens
    not present in any plaintext file or log.

- **Task 1.5 — Auth UI + state**
  - Files: `src/features/auth/LoginScreen.tsx`, `src/features/auth/authStore.ts`.
  - Login screen (clean, on-brand) `[skill: frontend-design]`; gated app shell
    that shows player only when authenticated.
  - Surface a clear **"Premium required"** message if the account is non-Premium
    (detect via `product` field from `/me`).
  - Acceptance: login → app shell; logout clears keychain + returns to login.

- **Task 1.6 — Config: Client ID input**
  - Files: `src/features/auth/settings`, persisted config (Tauri store).
  - First-run: prompt for Spotify Client ID (since we ship none); persist it.
  - Acceptance: app with no Client ID prompts for one; valid ID enables login.

**Phase 1 Gate:**

- [ ] Full PKCE login works against real Spotify.
- [ ] Token persists across restarts and auto-refreshes.
- [ ] No token/secret in git, logs, or plaintext on disk.
- [ ] Non-Premium accounts get a clear, blocking message.

---

### Phase 2 — Spotify Web API client & data layer

**Goal:** Typed, rate-limit-aware access to the Spotify Web API powering the UI.

- **Task 2.1 — API client (Rust proxy)** `[skill: full-output-enforcement]`
  - File: `src-tauri/src/api/`.
  - Wrap Web API calls behind Tauri commands so the access token never leaves
    Rust. Handle `429` (honor `Retry-After`), `401` (trigger refresh + retry
    once), exponential backoff on `5xx`.
  - Acceptance: unit tests for retry/backoff; a `/me` command returns profile.

- **Task 2.2 — TS API hooks (TanStack Query)**
  - Files: `src/lib/api.ts`, `src/lib/queries/*`.
  - Hooks: `useMe`, `usePlaylists`, `usePlaylist(id)`, `useLikedSongs`,
    `useAlbum`, `useArtist`, `useSearch(q)`, `useBrowseHome`.
  - Acceptance: hooks typed; loading/error states handled; cache configured
    (staleTime tuned to cut requests).

- **Task 2.3 — Domain types**
  - File: `src/lib/types.ts` (shared shape; keep in sync with Rust if mirrored).
  - Acceptance: `typecheck` passes; no `any` in API surface.

**Phase 2 Gate:**

- [ ] Authenticated calls to `/me`, playlists, search succeed.
- [ ] Rate-limit + 401-refresh-retry paths covered by tests.
- [ ] Access token never exposed to the renderer.

---

### Phase 3 — Playback engine (abstraction + Web Playback SDK)

**Goal:** Music plays. Controls (play/pause/seek/volume/next/prev) work via the
**default Web Playback SDK** engine, behind the `PlaybackEngine` abstraction.

- **Task 3.1 — Define `PlaybackEngine` trait (Rust) + TS mirror**
  - Files: `src-tauri/src/playback/mod.rs`, `src/playback/engine.ts`.
  - Exactly the trait in section 2. TS side defines a matching interface so the
    UI codes against the abstraction, not a backend.
  - Acceptance: compiles; UI imports the interface, never a concrete engine.

- **Task 3.2 — Web Playback SDK integration (JS)**
  - Files: `src/playback/websdk.ts`, load Spotify SDK script, create a
    `Spotify.Player` with `getOAuthToken` wired to the Rust token command.
  - Handle `ready` (capture `device_id`), `player_state_changed`,
    `not_ready`, and error events (auth/account/playback).
  - Acceptance: a Premium login can transfer playback to the Litetify device
    and play a track; state events update a store.

- **Task 3.3 — `WebSdkEngine` bridge (Rust ↔ JS)**
  - File: `src-tauri/src/playback/websdk.rs`.
  - Engine commands proxy to the renderer (and/or Web API
    `PUT /me/player` with the captured `device_id`).
  - Acceptance: calling engine `play(uri)` starts the track on the Litetify
    device; `pause/seek/volume/next/previous` all reflect in real playback.

- **Task 3.4 — Player UI** `[skill: frontend-design]`
  - Files: `src/features/player/*` — now-playing bar, transport controls,
    progress scrubber, volume, queue panel, shuffle/repeat.
  - Bind strictly to the engine interface + playback store.
  - Acceptance: controls drive real playback; progress + metadata update live;
    UI stays responsive (no jank) during playback.

- **Task 3.5 — Device & connect handling**
  - Capture `device_id`, allow transfer to/from other Spotify Connect devices,
    reflect external state changes.
  - Acceptance: starting playback elsewhere reflects in Litetify and vice versa.

**Phase 3 Gate:**

- [ ] Track plays end-to-end on the Litetify device (Premium).
- [ ] All transport controls work through the `PlaybackEngine` interface.
- [ ] No backend type is referenced directly by UI code.

---

### Phase 4 — Core UI: library, search, browse

**Goal:** A usable music client: browse home, search, view/play library content.

> Run `[skill: frontend-design]` once at phase start to set the visual system
> (tokens, type scale, spacing, density). Themes will hook these tokens later.

- **Task 4.1 — App shell & navigation**
  - Files: `src/app/*` — sidebar (Home/Search/Library), main view router,
    persistent player bar.
  - Acceptance: navigation works; player bar persists across routes.

- **Task 4.2 — Library views**
  - Playlists list, playlist detail (track table, play track/whole list),
    liked songs, albums, artists.
  - Acceptance: clicking a track plays it; "play" on a list queues it.

- **Task 4.3 — Search**
  - Debounced query → tracks/artists/albums/playlists tabs; play from results.
  - Acceptance: typing returns results < 400ms after Spotify responds; play
    works from any result.

- **Task 4.4 — Browse/Home**
  - Featured/new releases/recommendations as available from Web API.
  - Acceptance: home renders real data; empty/loading states handled.

- **Task 4.5 — Design tokens = theming contract**
  - File: `src/styles/tokens.css` — define **all** colors, spacing, radii, fonts
    as CSS custom properties. UI components reference only tokens.
  - Acceptance: changing a token value restyles the app globally (proves the
    theming surface works before the mod system exists).

**Phase 4 Gate:**

- [ ] Browse, search, and library are fully navigable and playable.
- [ ] Every visual style flows through CSS custom properties (no hardcoded
      colors in components).
- [ ] Idle RAM and cold-start budgets still met (re-measure; see section 6).

---

### Phase 5 — Mod system (Spicetify-parity)

**Goal:** Users install **themes**, **extensions**, and **custom apps** from a
`mods/` folder, managed in a settings UI — no recompile.

- **Task 5.1 — Mod manifest format**
  - File: `docs/MODDING.md` + `src/mods/manifest.ts` (Zod schema).
  - `manifest.json` fields: `name`, `version`, `type`
    (`theme|extension|app`), `entry`, `description`, `author`,
    `litetifyApiVersion`, optional `permissions` (for extensions).
  - Acceptance: schema validates good manifests, rejects malformed ones (tests).

- **Task 5.2 — Mod loader (discover + load)**
  - File: `src/mods/loader.ts` + Rust `src-tauri/src/mods/` to enumerate the
    `mods/` directory and read manifests safely.
  - On startup: scan `mods/`, validate manifests, build a registry, load only
    **enabled** mods (state persisted in config).
  - Acceptance: dropping a valid mod folder makes it appear in settings as
    available; invalid ones are listed with the validation error.

- **Task 5.3 — Theme engine**
  - Themes are CSS that override the design tokens from Task 4.5 (and optionally
    add scoped rules). Loader injects enabled theme `<style>` at runtime; one
    active theme at a time; live toggle without restart.
  - Acceptance: a sample dark + a sample high-contrast theme each restyle the
    app instantly when toggled.

- **Task 5.4 — `window.Litetify` extension API**
  - File: `src/mods/api.ts`. Expose a **stable, documented, versioned** API:
    - `Litetify.player` (play/pause/seek/volume/getState, subscribe to events)
    - `Litetify.library` (read playlists/liked — via the Rust API proxy, never
      raw tokens)
    - `Litetify.ui` (add sidebar item, register a route/tab, toast, modal)
    - `Litetify.storage` (per-mod scoped key/value)
    - `Litetify.events` (on/off for playback + navigation events)
  - **No raw access** to tokens, Node, `fetch` to arbitrary hosts, or Tauri
    `invoke` for non-whitelisted commands.
  - Acceptance: a sample extension uses the API to add a "skip to favorite part"
    button and a toast; it cannot read the access token or call disallowed IPC.

- **Task 5.5 — Extension sandbox**
  - File: `src/mods/sandbox.ts`. Run extension JS with restricted globals
    (no `window.__TAURI__` passthrough, no raw `fetch` to non-Spotify hosts,
    CSP enforced). Extensions interact **only** through `window.Litetify`.
  - Tauri capabilities (`src-tauri/capabilities/`) scoped to the minimum.
  - Acceptance: a hostile sample extension attempting token theft / arbitrary
    IPC / network exfiltration is blocked; logged, not crashed.
  - `[skill: gsd-secure-phase]` — verify the sandbox threat model after build.

- **Task 5.6 — Custom apps (new tabs)**
  - `type: app` mods register a sidebar entry + a React-rendered view via the
    `Litetify.ui` API. Lazy-loaded.
  - Acceptance: a sample "Stats" custom app appears as a tab and renders.

- **Task 5.7 — Mods settings UI** `[skill: frontend-design]`
  - File: `src/features/settings/Mods.tsx` — list installed mods, enable/disable,
    pick active theme, show manifest info, open `mods/` folder, show errors.
  - Acceptance: full enable/disable/select flow works and persists.

- **Task 5.8 — Sample mods + authoring docs**
  - Files: `mods/examples/*` (one theme, one extension, one app) +
    finish `docs/MODDING.md` with API reference and a quick-start.
  - Acceptance: a new user can follow MODDING.md and ship a working theme +
    extension without reading source.

**Phase 5 Gate:**

- [x] Themes, extensions, and custom apps all load from `mods/` with no rebuild.
- [x] `window.Litetify` API is documented and versioned.
- [x] Sandbox blocks token theft, arbitrary IPC, and exfiltration (verified).
- [x] Settings UI manages all three mod types.

---

### Phase 6 — librespot engine (opt-in, feature-gated)

**Goal:** An optional native-audio backend, fully behind the `PlaybackEngine`
abstraction and **off by default**.

- **Task 6.1 — Feature-gate + dependency**
  - File: `src-tauri/Cargo.toml` add `librespot` under
    `[features] librespot = [...]`; not in default features.
  - Acceptance: default build excludes librespot entirely (verify with
    `cargo tree`); `--features librespot` includes it.

- **Task 6.2 — `LibrespotEngine` impl**
  - File: `src-tauri/src/playback/librespot.rs` implementing `PlaybackEngine`.
  - Authenticate via the existing OAuth token flow where possible.
  - Acceptance: with the feature on, native playback works for play/pause/seek/
    volume/next/prev through the same interface.

- **Task 6.3 — Engine selection + warning UI**
  - Settings toggle: "Native audio engine (experimental, unofficial)" with a
    clear ToS/risk warning and explicit opt-in.
  - Acceptance: switching engines at runtime (or with restart) routes all
    controls to the selected engine; default remains Web SDK.

**Phase 6 Gate:**

- [ ] Default build has no librespot code/deps.
- [ ] Opt-in build plays audio natively via the same interface.
- [ ] User sees and must accept the unofficial-engine warning.

---

### Phase 7 — Performance, polish, packaging, release

**Goal:** Ship a fast, signed, auto-updating, documented v1.

- **Task 7.1 — Performance pass** `[skill: fixing-motion-performance]`
  - Measure cold start, idle RAM, interaction latency. Code-split routes,
    lazy-load heavy views, virtualize long lists, debounce expensive renders,
    audit animations for compositor-only properties.
  - Acceptance: **cold start < 1.5s, idle RAM < 100MB, binary < 25MB**
    (record actual numbers in `docs/PERF.md`). If a budget is missed, fix or
    document the justified exception.

- **Task 7.2 — Error handling & resilience**
  - Global error boundary, offline detection, token-expiry recovery, friendly
    empty/error states everywhere.
  - Acceptance: pulling network mid-session degrades gracefully and recovers.

- **Task 7.3 — Accessibility & keyboard**
  - Media keys, keyboard shortcuts (space=play/pause, etc.), focus management,
    ARIA on controls.
  - Acceptance: core flows operable by keyboard; media keys control playback.

- **Task 7.4 — Auto-update + signing**
  - Tauri updater configured; code-sign per OS where feasible; build artifacts
    for Win/macOS/Linux in CI release workflow.
  - Acceptance: a release build produces installers for all 3 OSes; updater
    config validated.

- **Task 7.5 — Code review + security audit**
  - `[skill: gsd-code-review]` then `[skill: gsd-secure-phase]` across the whole
    app, focusing on: token handling, mod sandbox, IPC capability scoping, no
    secrets, dependency audit (`cargo audit`, `npm audit`).
  - Acceptance: no high/critical findings open; medium findings triaged in
    `docs/SECURITY.md`.

- **Task 7.6 — Docs finalization**
  - `README.md` (setup, Client ID, Premium note, build), `docs/MODDING.md`,
    `docs/ARCHITECTURE.md`, `docs/PERF.md`, `docs/SECURITY.md`, `CHANGELOG.md`.
  - Acceptance: a fresh user can install, configure a Client ID, log in, play,
    and install a mod using only the docs.

**Phase 7 Gate (v1 Definition of Done):**

- [ ] Performance budgets met and recorded.
- [ ] Signed installers for Windows, macOS, Linux.
- [ ] Auto-update configured.
- [ ] Security audit clean (no high/critical).
- [ ] Docs complete; mod authoring works end-to-end.
- [ ] All earlier phase gates still green.

---

## 5. Skills Reference (for the executor)

Invoke these skills (from `.agents/skills`) at the tasks indicated. Always
follow the using-superpowers rule: if a skill might apply, invoke it.

| Skill                                  | Use it for                                                           |
| -------------------------------------- | -------------------------------------------------------------------- |
| `gsd-new-project`                      | Phase 0 project initialization                                       |
| `tdd`                                  | Auth crypto (1.1), API retry logic, manifest validation — test-first |
| `frontend-design`                      | Login (1.5), player UI (3.4), core UI (Phase 4), settings (5.7)      |
| `full-output-enforcement`              | Large, complete files (API client, engines) — no placeholders        |
| `fixing-motion-performance`            | Phase 7 performance pass                                             |
| `gsd-code-review`                      | Phase 7 review                                                       |
| `gsd-secure-phase`                     | Mod sandbox (5.5) + final security audit (7.5)                       |
| `gsd-execute-phase` / `gsd-plan-phase` | If you want finer-grained per-phase planning/execution               |
| `ui-ux-pro-max` / `impeccable`         | Optional: deeper UI polish on Phase 4/7                              |

> If unsure whether a UI task needs a skill: it does — invoke `frontend-design`.

---

## 6. Acceptance / Quality Gates (global)

Run at **every Phase Gate**, not just at the end:

1. **Build:** `npm run tauri build` succeeds.
2. **Types/lint:** `npm run typecheck && npm run lint` clean.
3. **Tests:** all unit/integration tests green (`cargo test`, vitest).
4. **Perf budget (spot check):** cold start < 1.5s, idle RAM < 100MB,
   binary < 25MB. Record drift.
5. **Security:** no secrets in git; tokens only in keychain; `cargo audit` /
   `npm audit` reviewed.
6. **Docs:** any new surface (API, manifest field, command) is documented.

---

## 7. Definition of Done (v1)

Litetify is "done" for v1 when **all** are true:

- A Spotify **Premium** user can log in via OAuth/PKCE and play music with full
  transport controls.
- Browse, search, and full library management work.
- Users can install **themes, extensions, and custom apps** from `mods/` with no
  rebuild, managed in a settings UI, documented in `docs/MODDING.md`.
- The **librespot** native engine exists as a feature-gated, opt-in, clearly
  warned alternative behind the same `PlaybackEngine` interface.
- Performance budgets are met and recorded; the app is demonstrably lighter than
  the official Electron client.
- Signed installers exist for Windows, macOS, and Linux with auto-update.
- Security audit is clean; no secrets shipped; mod sandbox verified.

---

## 8. Out of Scope / Future (do not build in v1)

- Mod marketplace / remote install (v1 is local `mods/` only).
- Offline downloads, local file playback.
- Lyrics, canvas video, advanced visualizers (good first community mods).
- Mobile/web builds.
- Collaborative/social features beyond Web API basics.
