---
status: findings (fixed: CR-1, CR-2, WR-1, WR-2, WR-3, WR-4)
phase: 1-4,6-7
phase_name: Rust Backend (auth, API, playback)
depth: deep
files_reviewed: 9
critical: 2
warning: 4
info: 7
total: 13
fixes_applied: 6
---

## Critical

### CR-1. Path traversal via uncontrolled `mod_path` in `read_mod_file`

**File:** `src-tauri/src/mods/mod.rs:137-144` and `src-tauri/src/lib.rs:19-21`

The `read_mod_file` Tauri command accepts arbitrary `mod_path` and `file_path` strings. The canonicalization check only verifies that `file_path` resolves within `mod_path` -- it does NOT validate that `mod_path` itself is within the application's mods directory. An attacker with frontend control (or via a compromised mod/extension) can read any file on the filesystem that they can guess a parent directory for.

Example exploit: `mod_path = "C:\\Users\\Public"`, `file_path = "Documents\\notes.txt"` would pass the canonicalization check and leak file contents.

**Fix:** Resolve the mods base directory once (via `mods_path()`), then verify `mod_path` is a subdirectory of it before proceeding. Or remove `mod_path` as a parameter entirely and derive it from the mods directory + the mod's folder name.

```rust
pub fn read_mod_file(mod_path: &str, file_path: &str) -> Result<String, String> {
    let base = mods_path().canonicalize().map_err(|_| "Invalid mods directory")?;
    let mod_dir = PathBuf::from(mod_path).canonicalize().map_err(|e| format!("Invalid mod path: {}", e))?;
    if !mod_dir.starts_with(&base) {
        return Err("Access denied: mod path outside mods directory".into());
    }
    let requested = mod_dir.join(file_path);
    let canonical = requested.canonicalize().map_err(|e| format!("Cannot access file: {}", e))?;
    if !canonical.starts_with(&mod_dir) {
        return Err("Path traversal denied".into());
    }
    fs::read_to_string(&canonical).map_err(|e| format!("Failed to read {}: {}", canonical.display(), e))
}
```

### CR-2. Shared `retry_count` across error types causes premature auth-failure bailout

**File:** `src-tauri/src/api/mod.rs:333-405`

`retry_count` is a single counter shared across transport errors, 401 (unauthorized), 429 (rate-limit), and 5xx retries. After a transport error, 429, or 5xx increments the counter, the 401 retry guard (`retry_count < 1`) at line 372 becomes permanently false. This means: transport error (count=1) + subsequent 401 = the function returns `"unauthorized after refresh"` even though the token was just refreshed and the 401 might be transient.

**Fix:** Use a dedicated `bool` for 401 retry instead of sharing the counter, or reset `retry_count` for the 401 path. The simplest fix:

```rust
let mut retry_count = 0u32;
let mut has_retried_401 = false;

// ... inside the 401 handler:
if !has_retried_401 {
    has_retried_401 = true;
    tokio::time::sleep(Duration::from_millis(100)).await;
    continue;
}
```

## Warnings

### WR-1. Device ID not URL-encoded in playback endpoints

**File:** `src-tauri/src/api/mod.rs:676,712`

`device_id` is interpolated directly into a URL query string:
```rust
let url = format!("{BASE_URL}/me/player/play?device_id={device_id}");
```

If `device_id` contains `&`, `#`, or other query-special characters, the Spotify API will misinterpret the request. While Spotify device IDs are usually alphanumeric, the value passes through the frontend and could be tampered with.

**Fix:** Use `reqwest::Url::parse_with_params` or `serde_urlencoded` to properly encode the parameter. Also affects `api_pause` at line 712.

### WR-2. `CallbackServer::drop` blocks indefinitely on thread join

**File:** `src-tauri/src/auth/server.rs:139-143`

```rust
impl Drop for CallbackServer {
    fn drop(&mut self) {
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}
```

The thread spawned in `start()` calls `server.incoming_requests().next()` which blocks until a request arrives. If no callback request is ever received (user closes browser, network issue), `drop` will block the main thread indefinitely, hanging the application on shutdown.

**Fix:** Use a timeout on the join, or restructure so the server thread exits after a timeout. Options:
1. Spawn a watchdog that sends a shutdown signal after N seconds.
2. Use `handle.join()` with `std::thread::scope` and a timeout pattern.
3. Detach the thread (remove `JoinHandle`) and accept a brief resource leak on abnormal shutdown.

### WR-3. `eprintln!` used for production logging

**File:** `src-tauri/src/api/mod.rs:680`

```rust
eprintln!("[warn] api_play: multiple playback parameters provided; using uri, ignoring others");
```

Using `eprintln!` for warnings bypasses any structured logging system, cannot be filtered, and writes to stderr which may not be visible in all deployment scenarios.

**Fix:** Use a proper logging crate like `log` (with `info!`, `warn!`) or Tauri's plugin logger. Initialize with `env_logger` or `fern` in the app entry point.

### WR-4. `mods_path()` silently falls back to CWD when `current_exe()` fails

**File:** `src-tauri/src/mods/mod.rs:147-160`

```rust
let exe = std::env::current_exe().unwrap_or_default();
let exe_dir = exe.parent().unwrap_or(std::path::Path::new("."));
```

If `current_exe()` fails (restricted sandbox, process info unavailable), the mods directory resolves to `./mods` relative to the working directory. This could cause mods to load from unexpected locations, and combined with CR-1, increases the path traversal attack surface.

**Fix:** Use a compile-time path or app-data directory instead of `current_exe()`. At minimum, log a warning when the fallback is triggered:

```rust
let exe = std::env::current_exe().map_err(|e| {
    eprintln!("Warning: cannot resolve executable path: {}", e);
}).unwrap_or_default();
```

## Info

### INF-1. Redundant `state` field in `CallbackResult`

**File:** `src-tauri/src/auth/server.rs:126-129`

`CallbackResult` stores `state` but the calling code in `login()` (auth/mod.rs:133-136) never reads it. The state was already verified against `expected_state` in `handle_request`. Sending it back through the channel is dead data.

**Fix:** Remove `state` from `CallbackResult`. Also simplifies the struct.

### INF-2. Port range must be registered in Spotify Dashboard

**File:** `src-tauri/src/auth/mod.rs:10,42-60`

The server tries ports 14523-14532, but Spotify's developer dashboard requires explicit whitelisting of redirect URIs. If the registered URI is exactly `http://127.0.0.1:14523/callback`, binding to any other port in the range will cause Spotify to reject the redirect. Either document that all 10 ports must be registered, or try only the configured port and fail fast if it is unavailable.

### INF-3. No input validation on search query

**File:** `src-tauri/src/api/mod.rs:543-546`

The `api_search` command passes `query` and `types` directly from the frontend to Spotify's API without length or character validation. A very long query could trigger excessive API usage. Spotify has its own server-side limits, but adding a cap (e.g., 256 chars for query) would be defensive.

### INF-4. `keyring` failures on headless/WSL/CI systems

**File:** `src-tauri/src/auth/tokens.rs:38-52`

The `keyring` crate depends on platform-specific secret storage (Keychain on macOS, Credential Manager on Windows, secret-service/dbus on Linux). On headless Linux, WSL, or sandboxed environments, `Entry::new()` and `set_password()` can fail with cryptic errors. The app will fail at auth with no fallback.

**Fix:** Consider adding a fallback file-based encrypted store (e.g., using `age` or `aes-gcm` with a machine-derived key), or document the dependency clearly in the README.

### INF-5. Repetitive query-parameter conversion pattern

**File:** `src-tauri/src/api/mod.rs` (many locations, e.g., lines 423-431, 456-464, 473-481)

Every endpoint with optional parameters repeats:
```rust
let mut params: Vec<(&str, String)> = Vec::new();
if let Some(l) = limit { params.push(("limit", l.to_string())); }
let refs: Vec<(&str, &str)> = params.iter().map(|(k, v)| (*k, v.as_str())).collect();
get_json(&client_id, "/path", &refs).await
```

This is 30+ lines of boilerplate repeated 9+ times.

**Fix:** Create a small builder:
```rust
struct QueryBuilder(Vec<(String, String)>);
impl QueryBuilder {
    fn push<T: ToString>(&mut self, k: &str, v: Option<T>) -> &mut Self { ... }
    fn build(&self) -> Vec<(&str, &str)> { ... }
}
```

### INF-6. Internal error details leaked to frontend

**File:** `src-tauri/src/api/mod.rs` (all error returns)

Error strings include internal details like `"parse: ... — body: ..."` and `"build client: ..."` which are returned to the frontend via Tauri. While acceptable during development, these may expose API internals or response data in production error messages.

**Fix:** Use a structured error type that separates user-facing messages from debug details. Map errors to user-friendly strings at the Tauri boundary.

### INF-7. No bounds-checking on `limit`/`offset` parameters

**File:** `src-tauri/src/api/mod.rs` (all paginated endpoints)

Parameters like `limit: Option<i32>` are passed directly to Spotify without clamping. The Spotify API accepts 0-50 for limit, but a caller could pass negative values or values > 50. While Spotify's server handles this rejection, the resulting error is confusing to the user.

**Fix:** Clamp values:
```rust
let limit = limit.map(|l| l.clamp(1, 50));
let offset = offset.map(|o| o.max(0));
```
