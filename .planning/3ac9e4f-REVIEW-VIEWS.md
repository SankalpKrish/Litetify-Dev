---
status: findings (fixed: CR-1, WR-1, WR-2, WR-4, WR-6, WR-7, WR-8)
phase: 1-4,6-7
phase_name: Frontend Features, Auth, API, Views
depth: deep
files_reviewed: 25
critical: 1
warning: 8
info: 7
total: 16
fixes_applied: 7
---

## Critical

### CR-1. Recommendations query permanently disabled — dead section

**File:** `src/features/browse/HomeView.tsx:27-31`, `src/lib/queries/useBrowse.ts:43-51`

`HomeView` calls `useRecommendations(undefined, undefined, undefined, 10)`. Inside `useBrowse.ts`, `seedKey` is computed as `[undefined, undefined, undefined].filter(Boolean).join(',')` which yields `''`. The query has `enabled: seedKey.length > 0`, so `enabled` resolves to `false`. The query never fires, `data` is perpetually `undefined`, `isLoading` is always `false`. The entire "Recommended for You" section at lines 125-157 is dead code — it never renders under any condition.

**Fix:** Pass at least one valid seed to `useRecommendations`. Either fetch a seed genre/track/artist from the user's library first, or omit the recommendations section entirely. The `useBrowse.ts` guard is correct (API requires seeds); the caller is wrong.

---

## Warnings

### WR-1. onClick fires playTrack before onDoubleClick, causing double execution

**File:**
- `src/features/library/AlbumView.tsx:93-94`
- `src/features/library/ArtistView.tsx:86-87`
- `src/features/library/LikedSongs.tsx:95-96`
- `src/features/library/PlaylistDetail.tsx:88-89`
- `src/features/search/SearchView.tsx:122-123`

Every track row attaches both `onClick={() => playTrack(track.uri)}` and `onDoubleClick={() => playTrack(track.uri)}`. Browser event order for a double-click is: `click` → `click` → `dblclick`. This means `playTrack` fires three times on a double-click (two from click, one from dblclick). Even a single click fires the handler once. The `onDoubleClick` handler provides no value and causes duplicate playback attempts.

**Fix:** Remove `onDoubleClick` from all track rows. Single-click play is sufficient. If double-click behavior is desired, use a single `onClick` with a debounce to distinguish single from double clicks.

### WR-2. React key collisions from null track IDs

**File:**
- `src/features/library/AlbumView.tsx:91`
- `src/features/library/ArtistView.tsx:84`
- `src/features/library/LikedSongs.tsx:93`
- `src/features/library/PlaylistDetail.tsx:86`
- `src/features/search/SearchView.tsx:120`

Every track row uses `key={track.id ?? idx}`. The `SpotifyTrack.id` type is `string | null`. When Spotify returns null track IDs (which happens for unavailable/local tracks), multiple rows fall back to array index keys. If the track list is filtered, reordered, or paginated, React will reuse DOM nodes incorrectly, causing stale state, focus loss, or wrong track metadata displayed.

**Fix:** Use a composite key: `key={track.id ?? \`local-${idx}-${track.uri}\`}`. The `uri` is always present per the type definition and is globally unique.

### WR-3. LikedSongs and PlaylistList limited to 50 items with no pagination

**File:**
- `src/features/library/LikedSongs.tsx:10`
- `src/features/library/PlaylistList.tsx:9`

Both components call their respective hooks with a hardcoded `limit=50` and never pass `offset`. Users with more than 50 liked songs or playlists cannot access the rest. The API types (`LikedTracks`, `SpotifyPlaylists`) include `next`, `offset`, and `total` fields, indicating server-side pagination is available.

**Fix:** Implement offset-based pagination with a "Load more" button or infinite scroll. Use React Query's `keepPreviousData` or `placeholderData` to avoid flicker during page transitions. For LikedSongs, also consider using the `total` field (already displayed at line 59) to show the actual count.

### WR-4. Inner timer in Toast has dead cleanup and can fire after unmount

**File:** `src/features/settings/Toast.tsx:16-23`

The `useEffect` creates a 3000ms outer timer, then after that fires, creates a 200ms inner timer. The `return () => clearTimeout(innerTimer)` on line 21 is inside the `setTimeout` callback — it is a return value of the `setTimeout` callback which is never used by the runtime. It is dead code. If the Toast component unmounts during the 200ms window between outer timer firing and inner timer resolving, `onCloseRef.current()` (which calls `setToast(null)` in the parent) will execute on an unmounted component.

**Fix:** Store both timer IDs in refs and clear them both on cleanup:

```
const timerRef = useRef<ReturnType<typeof setTimeout>>();
const innerRef = useRef<ReturnType<typeof setTimeout>>();
useEffect(() => {
  requestAnimationFrame(() => setVisible(true));
  timerRef.current = setTimeout(() => {
    setVisible(false);
    innerRef.current = setTimeout(() => onCloseRef.current(), 200);
  }, 3000);
  return () => {
    clearTimeout(timerRef.current);
    clearTimeout(innerRef.current);
  };
}, []);
```

### WR-5. No request cancellation via AbortController in API layer

**File:** `src/lib/api.ts:1-228`

Every API function calls `invoke<T>(command, args)` without passing an `AbortSignal`. React Query supports the `signal` parameter in `queryFn: ({ signal }) => ...`, and this signal should be forwarded to the API layer. Without cancellation, when the user types a search query or switches views rapidly, stale in-flight requests compete with fresh ones. This can cause:
- UI flicker (stale data overwrites fresh data)
- Unnecessary network/CPU usage from orphaned requests
- In Tauri, unnecessary IPC round-trips to the Rust backend

**Fix:** Accept an optional `AbortSignal` in every `api*` function and pass it through to `invoke` (if the Tauri invoke API supports it). In each `useQuery`, destructure `signal` from the `QueryFunctionContext` and pass it: `queryFn: ({ signal }) => apiGetAlbum(id, signal)`.

### WR-6. clientId() throws synchronously on every API call when unconfigured

**File:** `src/lib/api.ts:24-28`

`clientId()` throws synchronously if `getStoredClientId()` returns an empty string. Every `api*` function calls `clientId()` eagerly before `invoke`. If the client ID is cleared while the user is browsing (e.g., via logout or manual localStorage deletion), every React Query with `retry: 2` will fail 3 times consecutively with the same synchronous error. No query will degrade gracefully — they all throw identically.

**Fix:** Either (a) allow `undefined` clientId and let the Rust backend handle the validation, or (b) return a meaningful error string instead of throwing, and let React Query's `onError` handle it.

### WR-7. Missing error state for usePlaylistTracks in PlaylistDetail

**File:** `src/features/library/PlaylistDetail.tsx:12-13,24`

The component destructures `error` from `usePlaylist` (as `plError`) but ignores the error from `usePlaylistTracks`. If the tracks query fails but the playlist metadata query succeeds, the UI shows "Could not load playlist" (because `trackItems` falls back to `playlist.tracks.items` which may be truncated or empty). The actual error is silently swallowed.

**Fix:** Destructure and check `error: trError` from `usePlaylistTracks`. Show a distinct error message when tracks fail to load (e.g., "Could not load all tracks").

### WR-8. Auth status transition does not re-verify token

**File:** `src/App.tsx:51-55,78-80`

On mount, `checkAuth()` verifies the token. When `LoginScreen` calls `onAuthenticated()`, the `handleAuthenticated` callback sets `authStatus` to `'authenticated'` immediately without calling `checkAuth()` again. The app trusts that `invoke('login')` in `authStore.ts:56` completed the OAuth PKCE flow. If `invoke('login')` resolves before the OAuth callback is received (e.g., the Rust backend opens the browser and returns immediately), the app enters an authenticated state with no valid token.

**Fix:** In `handleAuthenticated`, call `checkAuth()` first and only transition to `'authenticated'` if it returns `true`. If it returns `false`, stay in `'unauthenticated'` and surface an error.

---

## Info

### INF-1. AuthState interface is never imported or consumed

**File:** `src/features/auth/authStore.ts:9-13`

The `AuthState` interface is defined and exported but never imported by any file in the codebase. It appears to be dead code left over from a previous iteration (likely before Zustand was introduced for the player store).

**Fix:** Remove the unused interface, or implement it as the store shape if an auth store is planned.

### INF-2. useCurrentlyPlaying polls unconditionally every 5 seconds

**File:** `src/lib/queries/usePlayer.ts:9-16`

`useCurrentlyPlaying` uses `refetchInterval: 5000` with no `enabled` guard. It polls every 5 seconds even when no device is active or no track is playing. This generates continuous IPC calls to the Rust backend and HTTP requests to Spotify for no benefit when nothing is playing.

**Fix:** Add `enabled: (data) => data?.is_playing !== false` or check the player store for an active device before enabling polling.

### INF-3. queryKeys include undefined values when optional params are omitted

**File:**
- `src/lib/queries/useArtist.ts:23` (market can be undefined)
- `src/lib/queries/useArtist.ts:33` (limit/offset can be undefined)
- `src/lib/queries/usePlaylist.ts:7` (fields can be undefined)
- `src/lib/queries/usePlaylistTracks.ts:11` (limit/offset can be undefined)

When optional parameters are omitted, the query key includes literal `undefined` entries (e.g., `['artist', id, 'topTracks', undefined]`). This works for deduplication but makes cache inspection harder and creates fragile keys where a subsequent call with an explicit `undefined` or missing argument generates a different key.

**Fix:** Filter undefined values from the key array or provide explicit defaults: `queryKey: [...artistKeys.topTracks(id), market].filter(Boolean)`.

### INF-4. useCallback with empty deps around setState is unnecessary

**File:** `src/features/search/SearchView.tsx:39-41`

`handleQueryChange` is wrapped in `useCallback` with `[]` deps. The function body is a one-liner that calls `setQuery` (a stable dispatch function). `useCallback` provides no benefit here — the function is already stable because it captures no variables and the inline definition cost is negligible.

**Fix:** Remove `useCallback` wrapper: `const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value);`

### INF-5. formatNumber and pluralize are defined but unused in reviewed files

**File:** `src/lib/utils.ts:8-12,24-26`

The exported functions `formatNumber` and `pluralize` have no callers in any of the 25 reviewed files nor elsewhere in `src/` (confirmed via grep).

**Fix:** Remove dead code, or add a usage (e.g., `pluralize` for the "N tracks" labels that currently use inline ternaries).

### INF-6. usePlaylist imports keys from usePlaylists, creating cross-file coupling

**File:**
- `src/lib/queries/usePlaylist.ts:3`
- `src/lib/queries/usePlaylistTracks.ts:3`

Both `usePlaylist.ts` and `usePlaylistTracks.ts` import `playlistKeys` from `usePlaylists.ts`. If `playlistKeys` shape is changed in `usePlaylists.ts`, the cache keys in dependent files silently change, causing cache misses. This coupling is not immediately obvious.

**Fix:** Define `playlistKeys` in a shared `src/lib/queries/keys.ts` file that all playlist query files import from. Or co-locate all playlist query keys in `usePlaylists.ts` with documentation.

### INF-7. CurrentlyPlaying type only covers Track, not Episode

**File:** `src/lib/types.ts:227-232`

The `CurrentlyPlaying` interface defines `item: SpotifyTrack | null`. The Spotify API can return either a `track` or `episode` object as the currently playing item. Episodes have a different shape (no `artists`, different `album` structure). If an episode is playing, the type mismatch will cause runtime property access errors.

**Fix:** Add an `Episode` interface and use a union: `item: SpotifyTrack | Episode | null`. At minimum, document the limitation.
