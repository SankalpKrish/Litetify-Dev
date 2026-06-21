# Security

## Threat model

| Threat | Mitigation |
|--------|-----------|
| Token theft (filesystem) | Tokens stored in OS keychain via `keyring` crate; never plaintext on disk. |
| Token theft (network) | PKCE flow; no client secret shipped. All API calls go through Rust proxy; token never leaves Rust process. |
| Token theft (logs) | All error handling redacts tokens. `console.error` never logs token values. |
| Token theft (renderer) | Access token is passed to renderer for Web Playback SDK — accepted design constraint. |
| Malicious mods (extensions) | Extensions run in sandboxed iframe with restricted globals. No `window.__TAURI__`, no raw `fetch` to non-Spotify hosts. Only `window.Litetify` API available. |
| Malicious mods (themes) | Themes are CSS only; injected as `<style>` element. Cannot execute JS or access IPC. |
| Malicious mods (path traversal) | `read_mod_file` canonicalizes paths and rejects traversal outside mod directory. |
| XSS | CSP enforced: `default-src 'self'`. Scripts only from `'self'` and `https://sdk.scdn.co`. |
| Update tampering | Auto-updater configured but disabled until release (pubkey not yet set). |
| Supply chain | `cargo audit` and `npm audit` run in CI. |

## Accepted risks

| Risk | Rationale |
|------|-----------|
| `script-src` includes `https://sdk.scdn.co` | Required for Spotify Web Playback SDK. Monitored for changes. |
| `style-src 'unsafe-inline'` | Required for CSS-in-JS and mod theme injection. |
| `core:default` grant in capabilities | Renderer is same-origin; all IPC commands implicitly allowed. Per-command scoping would require custom permission definitions. |
| No update signature verification | Updater plugin configured but not wired until release infrastructure is ready. |

## Dependencies audited

- `cargo audit` — run via CI on every push
- `npm audit` — run via CI on every push

## Reporting

Report vulnerabilities by opening an issue at the project repository.
