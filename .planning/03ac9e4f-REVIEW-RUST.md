---
status: findings
files_reviewed: 8
critical: 0
warning: 3
info: 5
total: 8
---

# Commit 3ac9e4f — Rust Backend Code Review

## Files Reviewed

| # | File | Lines |
|---|------|-------|
| 1 | `src-tauri/src/api/mod.rs` | 836 |
| 2 | `src-tauri/src/auth/mod.rs` | 182 |
| 3 | `src-tauri/src/auth/pkce.rs` | 75 |
| 4 | `src-tauri/src/auth/server.rs` | 206 |
| 5 | `src-tauri/src/auth/tokens.rs` | 146 |
| 6 | `src-tauri/src/playback/mod.rs` | 44 |
| 7 | `src-tauri/src/playback/websdk.rs` | 56 |
| 8 | `src-tauri/src/lib.rs` | 87 |

---

## Warnings

### WR-01: Token refresh may silently fail when Spotify omits `refresh_token`
**File:** `src-tauri/src/auth/tokens.rs:96-97`

```rust
let new_tokens = refresh_access_token(client_id, &stored.refresh_token).await?;
store_tokens(&new_tokens)?;
```

`store_tokens` requires `refresh_token` to be `Some` (`src-tauri/src/auth/tokens.rs:30`). The Spotify `/api/token` refresh endpoint may omit `refresh_token` in its response if the existing refresh token is still valid (per Spotify API docs, the refresh token is only returned if a new one was issued). This will cause `store_tokens` to fail, propagating an error up the call chain.

**Recommendation:** When `refresh_token` is `None` in the refresh response, preserve the existing `refresh_token` value rather than failing.

---

### WR-02: `unwrap_or_default()` on response bodies silently degrades diagnostics
**File:** `src-tauri/src/api/mod.rs:377,388,399,403,650,699,722`

Multiple error paths read the response body via `resp.text().await.unwrap_or_default()`. If reading the body fails, the error message becomes an empty string, hiding the API error detail.

**Recommendation:** Log the body read error separately or bubble it up. At minimum, include a fallback string like `"(no body)"` instead of `""`.

---

### WR-03: `read_mod_file` accepts unsanitized path strings (path traversal risk)
**File:** `src-tauri/src/lib.rs:19-21`

```rust
fn read_mod_file(mod_path: String, file_path: String) -> Result<String, String> {
    mods::read_mod_file(&mod_path, &file_path)
}
```

The command accepts arbitrary `mod_path` and `file_path` strings from the frontend. Without path sanitization in `mods::read_mod_file`, this could allow reading files outside the intended mod directory.

**Recommendation:** Review `mods::read_mod_file` for path traversal guards. Ensure both `mod_path` and `file_path` are canonicalized and constrained to an allowed root.

---

## Informational

### INF-01: `unwrap()` on hardcoded URL parse
**File:** `src-tauri/src/auth/mod.rs:25`

```rust
let mut url = Url::parse("https://accounts.spotify.com/authorize").unwrap();
```

A panic here would crash the auth flow. While the URL is a static constant and unlikely to be invalid, prefer `expect("invalid static auth URL")` to document the invariant.

---

### INF-02: Dead code — `generate_port()` defined but unused in reviewed files
**File:** `src-tauri/src/auth/pkce.rs:25-27`

`generate_port()` is defined but no call site appears in the reviewed files. If it was intended for dynamic port binding, `auth/mod.rs` uses a fixed port from `DEFAULT_REDIRECT_URI` instead.

---

### INF-03: Unused variable binding instead of `_`
**File:** `src-tauri/src/auth/server.rs:111`

```rust
let _ = err;
```

The `err` variable is bound in a `find()` closure but never used. To suppress the lint cleaner, the binding itself should be `_` rather than assigning to `_`.

**Recommendation:** Change `.find(|(k, _)| k == "error")` outcome pattern to use `_` directly.

---

### INF-04: Public `#[tauri::command]` functions lack doc comments
**Files:** All reviewed files

Every `#[tauri::command]` function is a public API surface but none have doc comments (`///`). While Tauri commands are not library APIs, doc comments improve maintainability and serve as a lightweight contract for frontend integration.

**Recommendation:** Add a single-line doc comment to each command describing its purpose and expected parameters.

---

### INF-05: `api_play` silently ignores conflicting parameters
**File:** `src-tauri/src/api/mod.rs:678-684`

```rust
if let Some(u) = uri { ... }
else if let Some(u) = uris { ... }
else if let Some(ctx) = context_uri { ... }
```

When multiple parameters are provided (e.g., both `uri` and `context_uri`), only the first in priority order is used. The remaining parameters are silently discarded.

**Recommendation:** Either document the priority order or return an error when conflicting parameters are supplied.

---

## PKCE Flow Audit (Correctness)

| Step | Status | Notes |
|------|--------|-------|
| Code verifier generation | ✅ | 32 random bytes → 43 base64 chars (RFC 7636 compliant) |
| Code challenge (S256) | ✅ | SHA-256 + URL_SAFE_NO_PAD base64 |
| State parameter | ✅ | 32 random bytes, matched on callback |
| State validation on callback | ✅ | Returns 403 on mismatch, 400 on missing |
| Redirect URI binding | ✅ | 127.0.0.1 only, port scannable |
| Token exchange | ✅ | POST with form params, `authorization_code` grant |
| Token storage | ✅ | OS keyring via `keyring` crate |
| Token refresh | ⚠️ | See WR-01 |
| Premium check | ✅ | Logout + clear tokens if not premium |

**PKCE Flow Verdict:** Correctly implemented. The single issue is the missing fallback for absent `refresh_token` on re-refresh (WR-01).

## Overall

The code is **well-structured** with good error propagation, proper retry logic in the API layer, and a correct PKCE OAuth flow. No critical security issues found. The main actionable item is WR-01 (token refresh fallback), which could cause real-world login failures for users whose session persists past a single token refresh cycle.
