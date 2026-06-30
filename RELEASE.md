# Release Checklist — Litetify v1.0.0

## Pre-Release

- [ ] All P0 items resolved (see [PLAN.md](./PLAN.md))
- [ ] `cargo clippy` passes with no warnings
- [ ] `npm run typecheck` passes (or `npx tsc --noEmit`)
- [ ] `npm run build` produces a clean production build
- [ ] `cargo build --release` compiles without errors
- [ ] `cargo audit` reports no known vulnerabilities
- [ ] All `ponytail:` TODOs reviewed — none block release
- [ ] Dev mode code stripped (authStore, LoginScreen, Sidebar, CSS)

## CSP Verification

- [ ] `script-src` contains no `'unsafe-eval'` or `'unsafe-inline'`
- [ ] `connect-src` covers all required endpoints
- [ ] CSP in `index.html` matches `tauri.conf.json`

## Build & Package

- [ ] Bump version in `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`
- [ ] Update `CHANGELOG.md` with v1.0.0 entry
- [ ] `npm run tauri build` succeeds
- [ ] Installer/artifact works on target OS (Windows, macOS, Linux)

## Post-Release

- [ ] Tag commit as `v1.0.0`
- [ ] Push tag to GitHub
- [ ] Attach release artifacts to GitHub Release
- [ ] Update `SECURITY.md` if CSP or permissions changed
