# Performance

## Targets

| Metric      | Target    | Measured | Status |
|-------------|-----------|----------|--------|
| Cold start  | < 1.5s    | TBD      | TBD    |
| Idle RAM    | < 100MB   | TBD      | TBD    |
| Binary size | < 25MB    | TBD      | TBD    |

*Recorded: TBD*

## Optimizations applied

- **Code splitting**: All views (Home, Search, Library, PlaylistDetail, AlbumView, ArtistView, Settings) are lazy-loaded via `React.lazy()` + `Suspense`.
- **Manual Vite chunks**: vendor (React), query (TanStack), player, auth, settings, and mods are split into separate chunks to parallelize download and improve cache invalidation.
- **Animations**: All CSS transitions use compositor-only properties (`transform`, `opacity`). No layout-triggering animation properties (`width`, `height`, `top`, `left`) are animated.
- **Build profile**: Rust release uses `opt-level = "s"`, `lto`, `strip = true`, `panic = "abort"`.
- **Image lazy-loading**: All `<img>` elements use `loading="lazy"`.

## How to measure

```bash
# Binary size
ls -lh src-tauri/target/release/litetify.exe

# Cold start (manual)
# 1. Close all Litetify processes
# 2. Start with: measure-command { .\src-tauri\target\release\litetify.exe }
# 3. Time from launch to "Checking authentication..." disappearing

# Idle RAM (after login, no playback)
# Task Manager or: Get-Process litetify | Select-Object WorkingSet64
```
