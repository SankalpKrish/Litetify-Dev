# Security — Litetify Mod System

## Threat Model

| Threat | Vector | Mitigation | Status |
|--------|--------|------------|--------|
| Token theft | Extension reads `window.__TAURI_INTERNALS__` to invoke `get_valid_token` | Extensions run in sandboxed `<iframe>` with `sandbox="allow-scripts"` (no `allow-same-origin`). Unique origin — no `__TAURI_INTERNALS__`, no shared `localStorage`. Communication via `postMessage` proxy. | ✅ Mitigated |
| Arbitrary IPC | Extension calls `invoke()` on any Tauri command | Same iframe isolation. Tauri IPC bridge not accessible from unique-origin sandbox. Only whitelisted `Litetify` API methods are exposed via proxy. | ✅ Mitigated |
| Network exfiltration | Extension uses `fetch()` to exfiltrate data | CSP `connect-src` restricts to `api.spotify.com`, `accounts.spotify.com`, `ipc:`. CSP is inherited by sandbox iframe. `img-src` locked to Spotify CDN only. | ✅ Mitigated |
| localStorage read | Extension reads auth state directly | Sandbox iframe has unique origin — localStorage partition is separate. Cannot read app's localStorage. | ✅ Mitigated |
| Mod file path traversal | Extension reads arbitrary files via `read_mod_file` | `read_mod_file` joins mod path + relative entry path. Rust-side validation checks existence. Extensions sandboxed — cannot call Tauri commands. | ✅ Mitigated |

## Sandbox Architecture

Extensions load in a hidden `<iframe>` with:
- `sandbox="allow-scripts"` (no `allow-same-origin`, no `allow-top-navigation`)
- Unique origin — no shared globals with the main app
- Only communication channel: `postMessage` protocol

### `postMessage` protocol

**Extension → App:**
- `{ type: 'invoke', id, method, args }` — API call
- `{ type: 'console', method, modId, args }` — logging

**App → Extension:**
- `{ type: 'result', id, result }` — API return value
- `{ type: 'error', id, error }` — API error

### Exposed APIs (via proxy)

Only `Litetify` global is available:
- `player` — playback control
- `library` — read playlists/liked tracks
- `ui` — sidebar items, toasts
- `storage` — scoped key/value (persisted in app)
- `events` — event subscription

## CSP

```csp
default-src 'self'
img-src       'self' data: https://i.scdn.co https://*.spotifycdn.com
connect-src   'self' https://api.spotify.com https://accounts.spotify.com ipc: http://ipc.localhost
script-src    'self' https://sdk.scdn.co
style-src     'self' 'unsafe-inline'
frame-src     'self' https://sdk.scdn.co
```

CSP is inherited by sandbox iframes. `connect-src` blocks exfiltration to arbitrary hosts.

## Tauri Capabilities

```json
{
  "windows": ["main"],
  "permissions": ["core:default", "opener:default"]
}
```

Minimal permissions — no raw `shell`, `fs`, or `http` plugin permissions are granted.
