# API

Litetify proxies Spotify Web API requests through the **Rust core** so the access token never reaches the renderer, except when required by the Web Playback SDK.

## Architecture

```
React component
  → src/lib/api.ts (TS API client)
    → invoke('api_*')   [Tauri IPC]
      → src-tauri/src/api/mod.rs (Rust proxy)
        → HTTPS → api.spotify.com
```

All API calls include the user's `client_id` to identify which account's token to use.

## Available endpoints

### User profile

| IPC command | Spotify API | Description |
|-------------|-------------|-------------|
| `api_get_me` | `GET /v1/me` | Current user's profile and subscription level |

### Library

| IPC command | Spotify API | Description |
|-------------|-------------|-------------|
| `api_get_playlists` | `GET /v1/me/playlists` | Current user's playlists |
| `api_get_playlist` | `GET /v1/playlists/{id}` | Single playlist detail |
| `api_get_playlist_tracks` | `GET /v1/playlists/{id}/tracks` | Tracks in a playlist |
| `api_get_liked_tracks` | `GET /v1/me/tracks` | User's saved tracks |
| `api_get_album` | `GET /v1/albums/{id}` | Single album detail |
| `api_get_artist` | `GET /v1/artists/{id}` | Single artist detail |
| `api_get_artist_top_tracks` | `GET /v1/artists/{id}/top-tracks` | Artist's top tracks |
| `api_get_artist_albums` | `GET /v1/artists/{id}/albums` | Artist's discography |
| `api_get_related_artists` | `GET /v1/artists/{id}/related-artists` | Similar artists |
| `api_save_to_library` | `PUT /v1/me/tracks` | Save tracks to library |
| `api_remove_from_library` | `DELETE /v1/me/tracks` | Remove tracks from library |
| `api_check_library` | `GET /v1/me/tracks/contains` | Check if tracks are saved |
| `api_add_to_playlist` | `POST /v1/playlists/{id}/tracks` | Add tracks to a playlist |
| `api_remove_from_playlist` | `DELETE /v1/playlists/{id}/tracks` | Remove tracks from a playlist |

### Search

| IPC command | Spotify API | Description |
|-------------|-------------|-------------|
| `api_search` | `GET /v1/search` | Search tracks, artists, albums, playlists |

### Browse / Home

| IPC command | Spotify API | Description |
|-------------|-------------|-------------|
| `api_get_new_releases` | `GET /v1/browse/new-releases` | New album releases |
| `api_get_featured_playlists` | `GET /v1/browse/featured-playlists` | Featured playlists |
| `api_get_recommendations` | `GET /v1/recommendations` | Track recommendations |
| `api_get_categories` | `GET /v1/browse/categories` | Spotify categories |
| `api_get_top_artists` | `GET /v1/me/top/artists` | User's top artists |
| `api_get_top_tracks` | `GET /v1/me/top/tracks` | User's top tracks |
| `api_get_recently_played` | `GET /v1/me/player/recently-played` | Recently played tracks |

### Playback

| IPC command | Spotify API | Description |
|-------------|-------------|-------------|
| `api_get_currently_playing` | `GET /v1/me/player/currently-playing` | Currently playing track |
| `api_transfer_playback` | `PUT /v1/me/player` | Transfer playback to a device |
| `api_get_available_devices` | `GET /v1/me/player/devices` | List available devices |
| `api_play` | `PUT /v1/me/player/play` | Start/resume playback |
| `api_pause` | `PUT /v1/me/player/pause` | Pause playback |
| `api_next` | `POST /v1/me/player/next` | Skip to next track |
| `api_previous` | `POST /v1/me/player/previous` | Go to previous track |
| `api_set_shuffle` | `PUT /v1/me/player/shuffle` | Toggle shuffle |
| `api_set_repeat` | `PUT /v1/me/player/repeat` | Set repeat mode |
| `api_add_to_queue` | `POST /v1/me/player/queue` | Add track to queue |

## Rate limiting

The Rust API proxy uses reqwest and does not currently implement explicit rate-limit handling beyond what the HTTP client provides. <!-- VERIFY: no exponential backoff or Retry-After handling is implemented in the Rust proxy -->

When the Spotify API returns `429 Too Many Requests`, the `Retry-After` header (if present) is available in the error response but not automatically consumed.

## Authentication

All API calls require an authenticated session. The `api_*` commands automatically retrieve a valid token from the OS keychain — if the token is expired, they refresh it before making the request.

## TypeScript API client

The TS-side client in `src/lib/api.ts` wraps every Tauri command with typed response interfaces from `src/lib/types.ts`:

```typescript
import { apiGetPlaylists, apiGetAlbum } from '../lib/api';

const playlists = await apiGetPlaylists(50, 0);
const album = await apiGetAlbum('4aawyAB9vmqN3uQ7FjRGTy');
```

React Query hooks in `src/lib/queries/` provide caching, refetching, and error handling:

```typescript
import { usePlaylist } from '../lib/queries/usePlaylist';

function MyComponent({ playlistId }: { playlistId: string }) {
  const { data, isLoading } = usePlaylist(playlistId);
}
```
