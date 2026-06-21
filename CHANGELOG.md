# Changelog

## [0.1.0] — 2026-06-21

### Added
- Spotify OAuth (PKCE) login with OS keychain token storage.
- Spotify Web API client with rate-limit handling and auto-refresh.
- Playback engine abstraction (PlaybackEngine trait + TS interface).
- Web Playback SDK engine (default).
- librespot native audio engine (opt-in, feature-gated, with ToS warning).
- Full UI: browse home, search, library (playlists, liked, albums, artists).
- Player bar: now-playing info, transport controls, progress scrubber, volume, device selector.
- Mod system: themes (CSS injection), extensions (iframe sandbox), custom apps (tabs).
- Design tokens system (72 CSS custom properties) as theming contract.
- Accessibility: ARIA labels, keyboard nav, skip-link, reduced-motion, focus-visible.
- Performance: lazy-loaded views, code-split chunks, compositor-only animations.
- Error boundary, keyboard shortcuts (Space, arrows), Media Session API (OS media keys).
- Example mods: dark theme, stats app, skip-to-favorite extension.

### Changed
- N/A

### Fixed
- N/A

### Known issues
- librespot engine requires `--features librespot` build flag.
- Web Playback SDK requires Widevine DRM on Linux (WebKitGTK).
- No offline playback or local file support.
