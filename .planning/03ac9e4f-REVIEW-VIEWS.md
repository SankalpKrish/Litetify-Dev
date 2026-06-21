---
status: findings
files_reviewed: 12
critical: 0
warning: 2
info: 3
total: 5
---

## Findings

### WR-01 — Toast auto-dismiss timer resets on unstable `onClose`
**File:** `src/features/settings/Toast.tsx:12-19`
**Severity:** Warning

The `useEffect` debounces toast visibility with `onClose` in its dependency array. If the parent passes an unstable inline function for `onClose`, the effect cleanup clears the 3s timer on every parent render, then re-schedules a new one. This prevents the toast from ever auto-dismissing when the parent re-renders frequently.

**Fix:** Remove `onClose` from deps and use a ref to store the latest callback, or ensure `onClose` is stable at the call site.

### WR-02 — Unnecessary non-null assertions after truthy guard
**File:** `src/features/library/LikedSongs.tsx:134`, `src/features/library/PlaylistDetail.tsx:128`
**Severity:** Warning

Both files use `track.album!` inside a `track.album &&` block. TypeScript's control-flow narrowing already guarantees `track.album` is truthy here — the `!` is redundant. If the runtime type shape diverges from the types (e.g., `null` slips past the guard), the assertion could cause a runtime crash that the guard intended to prevent.

**Fix:** Remove the `!` non-null assertion — TypeScript will narrow correctly.

### INF-01 — Unnested `setTimeout` not cleaned up on unmount
**File:** `src/features/settings/Toast.tsx:16`
**Severity:** Info

The inner `setTimeout(onClose, 200)` inside the outer timer's callback is not stored in a ref or cleared on unmount. If the component unmounts during the 200ms window, `onClose` will still fire after the component is gone. While this is unlikely to crash (it's just a callback to hide a toast), it could notify a parent that has already cleaned up its own state.

**Fix:** Store the inner timeout ref and clear it in the effect cleanup.

### INF-02 — `return null` inside `.map()` causes index mismatch
**File:** `src/features/library/PlaylistDetail.tsx:84`
**Severity:** Info

When a track item lacks a `track` property, the callback returns `null` — React skips rendering this row. However, `idx` still reflects the position in the API response rather than the rendered position. The track number displayed as `idx + 1` will skip numbers when rows are omitted, creating a confusing UX (e.g., track numbers 1, 2, 4, 5 with no visible row 3).

**Fix:** Filter out null items before mapping: `.filter((item) => item.track).map((item, idx) => ...)`.

### INF-03 — Redundant type annotations on already-typed variables
**File:** `src/features/search/SearchView.tsx:118,127,182,213,246`
**Severity:** Info

Inline type annotations like `(track: SpotifyTrack)` and `(artist: SpotifyArtist)` are applied to variables that already carry their type from the parent array (`data.tracks.items`). This adds noise and can mask type-narrowing bugs if the API shape changes.

**Fix:** Remove explicit type annotations — TypeScript infers them from the generic `useSearch` return type.
