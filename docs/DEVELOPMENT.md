# Development

## Project structure

```
Litetify/
├── src-tauri/               # Rust core (Tauri v2)
│   ├── src/
│   │   ├── main.rs          # Binary entry point
│   │   ├── lib.rs           # Tauri builder + IPC handler registration
│   │   ├── auth/            # PKCE, loopback server, OS keychain
│   │   ├── api/             # Spotify Web API proxy (~1292 lines)
│   │   ├── playback/        # PlaybackEngine trait + websdk/librespot impls
│   │   └── mods/            # Mod loader filesystem access
│   ├── Cargo.toml           # Rust dependencies and features
│   └── tauri.conf.json      # Tauri window, bundle, and CSP config
├── src/                     # React + TypeScript renderer
│   ├── main.tsx             # App entry point
│   ├── App.tsx              # Root component with shell layout
│   ├── app/                 # Layout, sidebar, theme provider
│   ├── features/            # Feature modules (auth, player, library, search, browse, settings)
│   ├── lib/                 # API client, types, React Query hooks, utilities
│   ├── playback/            # TS-side playback engine adapters
│   ├── mods/                # Mod loader, sandbox, runtime, theme engine
│   └── styles/              # CSS custom property tokens, global styles
├── mods/                    # User-installed mods (gitignored)
├── docs/                    # Project documentation
├── .env.example             # Environment variable template
├── .nvmrc                   # Node.js version pin
├── vite.config.ts           # Vite bundler config
├── tsconfig.json            # TypeScript config
└── plan.md                  # Phase roadmap
```

## Workflow

### Frontend development

```bash
npm run dev          # Vite web-only server (browser, no Tauri window)
npm run tauri dev    # Full desktop app with HMR
```

For rapid UI iteration, `npm run dev` is faster — it skips the Rust compilation. The Tauri IPC calls fall back gracefully.

### Adding a new feature

1. If it needs a new Spotify API endpoint, add the Rust handler in `src-tauri/src/api/mod.rs` and register it in `lib.rs`'s `invoke_handler`.
2. Add the TypeScript function in `src/lib/api.ts` that calls the Tauri command.
3. Add a React Query hook in `src/lib/queries/` (or use the API function directly).
4. Create the view component in `src/features/<feature-name>/`.

### Adding a new IPC command

1. Define a `#[tauri::command] async fn` in the appropriate Rust module.
2. Register it in the `tauri::generate_handler![]` macro in `src-tauri/src/lib.rs`.
3. Call it from the renderer via `invoke('command_name', { args })` from `@tauri-apps/api/core`.

### Code quality

```bash
npm run lint            # ESLint — zero-warning policy
npm run typecheck       # tsc --noEmit — strict TypeScript
npm run format:check    # Prettier formatting check
npm run format          # Auto-fix formatting
npm test                # Vitest
```

All lint and typecheck warnings must be resolved before committing. The CI pipeline will enforce this once configured.

### Rust development

```bash
cd src-tauri
cargo build                              # Debug build
cargo build --features librespot         # With librespot native engine
cargo test                               # Run Rust tests
cargo clippy                             # Lint Rust code
```

The librespot feature is off by default. To use the native audio engine:

```bash
npm run tauri dev -- --features librespot
```

### Release build

```bash
npm run tauri build
```

This produces native installers in `src-tauri/target/release/bundle/`. The Rust release profile applies LTO, single-CGU, size optimization (`opt-level = "s"`), and symbol stripping.

## Known limitations

- **librespot engine:** `next`/`prev` not supported in Rust; `cycleRepeat` is a no-op. Web SDK is the fully supported default.
- **Browse/Explore endpoints:** API proxy handlers exist for new releases, featured playlists, categories, and recommendations, but no UI views are built yet.
- **Related artists:** The API hook (`useArtist.ts`) fetches related artists but the artist detail view does not display them.
- **CI/CD:** Not yet configured — all builds are local.
- **Tests:** Minimal. Only a smoke test exists (`src/smoke.test.ts`). Real unit tests will arrive per the phase plan.
