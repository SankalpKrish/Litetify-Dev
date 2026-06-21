use crate::auth::tokens;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, RETRY_AFTER};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};
use std::time::Duration;

const BASE_URL: &str = "https://api.spotify.com/v1";
const MAX_RETRIES: u32 = 3;
const BASE_BACKOFF_MS: u64 = 500;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyUserProfile {
    pub id: String,
    pub display_name: Option<String>,
    pub email: Option<String>,
    pub product: Option<String>,
    pub country: Option<String>,
    pub images: Vec<SpotifyImage>,
    pub followers: Option<Followers>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyImage {
    pub url: String,
    pub height: Option<i32>,
    pub width: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Followers {
    pub total: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyPlaylists {
    pub items: Vec<SpotifyPlaylist>,
    pub total: i32,
    pub offset: i32,
    pub limit: i32,
    pub next: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyPlaylist {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub public: Option<bool>,
    pub collaborative: bool,
    pub owner: SpotifyOwner,
    pub images: Vec<SpotifyImage>,
    pub tracks: PlaylistTracksRef,
    #[serde(rename = "type")]
    pub type_: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyOwner {
    pub id: String,
    pub display_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistTracksRef {
    pub total: i32,
    pub href: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistDetail {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub images: Vec<SpotifyImage>,
    pub owner: SpotifyOwner,
    pub tracks: PlaylistTracks,
    #[serde(rename = "type")]
    pub type_: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistTracks {
    pub items: Vec<PlaylistTrackItem>,
    pub total: i32,
    pub offset: i32,
    pub limit: i32,
    pub next: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistTrackItem {
    pub added_at: Option<String>,
    pub track: Option<SpotifyTrack>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyTrack {
    pub id: Option<String>,
    pub name: String,
    pub uri: String,
    pub duration_ms: i32,
    pub artists: Vec<SpotifyArtistBrief>,
    pub album: Option<SpotifyAlbumBrief>,
    pub disc_number: Option<i32>,
    pub track_number: Option<i32>,
    pub explicit: Option<bool>,
    #[serde(rename = "type")]
    pub type_: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyArtistBrief {
    pub id: String,
    pub name: String,
    pub uri: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyAlbumBrief {
    pub id: String,
    pub name: String,
    pub images: Vec<SpotifyImage>,
    pub uri: String,
    pub release_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyAlbum {
    pub id: String,
    pub name: String,
    pub artists: Vec<SpotifyArtistBrief>,
    pub images: Vec<SpotifyImage>,
    pub tracks: AlbumTracks,
    pub uri: String,
    pub release_date: Option<String>,
    pub total_tracks: i32,
    pub label: Option<String>,
    pub popularity: Option<i32>,
    pub genres: Vec<String>,
    #[serde(rename = "type")]
    pub type_: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlbumTracks {
    pub items: Vec<SpotifyTrack>,
    pub total: i32,
    pub offset: i32,
    pub limit: i32,
    pub next: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyArtist {
    pub id: String,
    pub name: String,
    pub images: Vec<SpotifyImage>,
    pub genres: Vec<String>,
    pub popularity: Option<i32>,
    pub followers: Option<Followers>,
    pub uri: String,
    #[serde(rename = "type")]
    pub type_: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtistAlbums {
    pub items: Vec<SpotifyAlbumBrief>,
    pub total: i32,
    pub offset: i32,
    pub limit: i32,
    pub next: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LikedTracks {
    pub items: Vec<LikedTrackItem>,
    pub total: i32,
    pub offset: i32,
    pub limit: i32,
    pub next: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LikedTrackItem {
    pub added_at: String,
    pub track: SpotifyTrack,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    pub tracks: Option<SearchTracks>,
    pub artists: Option<SearchArtists>,
    pub albums: Option<SearchAlbums>,
    pub playlists: Option<SearchPlaylists>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchTracks {
    pub items: Vec<SpotifyTrack>,
    pub total: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchArtists {
    pub items: Vec<SpotifyArtist>,
    pub total: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchAlbums {
    pub items: Vec<SpotifyAlbum>,
    pub total: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchPlaylists {
    pub items: Vec<SpotifyPlaylist>,
    pub total: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewReleases {
    pub albums: PaginatedAlbums,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PaginatedAlbums {
    pub items: Vec<SpotifyAlbum>,
    pub total: i32,
    pub offset: i32,
    pub limit: i32,
    pub next: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Recommendations {
    pub tracks: Vec<SpotifyTrack>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeaturedPlaylists {
    pub playlists: SpotifyPlaylists,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoriesList {
    pub categories: CategoryPage,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CategoryPage {
    pub items: Vec<Category>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Category {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtistTopTracks {
    pub tracks: Vec<SpotifyTrack>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArtistRelatedArtists {
    pub artists: Vec<SpotifyArtist>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrentlyPlaying {
    pub item: Option<SpotifyTrackWrapper>,
    pub is_playing: bool,
    pub progress_ms: Option<i32>,
    pub device: Option<Device>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyTrackWrapper {
    pub id: Option<String>,
    pub name: String,
    pub uri: String,
    pub duration_ms: i32,
    pub artists: Vec<SpotifyArtistBrief>,
    pub album: Option<SpotifyAlbumBrief>,
    #[serde(rename = "type")]
    pub type_: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Device {
    pub id: String,
    pub name: String,
    pub is_active: bool,
    pub volume_percent: Option<i32>,
}

fn build_headers(token: &str) -> Result<HeaderMap, String> {
    let mut headers = HeaderMap::new();
    headers.insert(
        AUTHORIZATION,
        HeaderValue::from_str(&format!("Bearer {token}")).map_err(|e| e.to_string())?,
    );
    headers.insert(
        reqwest::header::CONTENT_TYPE,
        HeaderValue::from_static("application/json"),
    );
    Ok(headers)
}

fn parse_retry_after(resp: &reqwest::Response) -> u64 {
    resp.headers()
        .get(RETRY_AFTER)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse::<u64>().ok())
        .unwrap_or(1)
}

async fn call_api<T: DeserializeOwned>(
    client_id: &str,
    method: reqwest::Method,
    path: &str,
    query: &[(&str, &str)],
    body: Option<serde_json::Value>,
) -> Result<T, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|e| format!("build client: {e}"))?;

    let mut retry_count = 0u32;
    let mut has_retried_401 = false;

    loop {
        let token = tokens::get_valid_access_token(client_id).await?;
        let headers = build_headers(&token)?;
        let url = format!("{BASE_URL}{path}");

        let mut req = client.request(method.clone(), &url).headers(headers);
        if !query.is_empty() {
            req = req.query(query);
        }
        if let Some(b) = &body {
            req = req.json(b);
        }

        let resp = match req.send().await {
            Ok(r) => r,
            Err(e) => {
                if retry_count < MAX_RETRIES {
                    retry_count += 1;
                    tokio::time::sleep(Duration::from_millis(
                        BASE_BACKOFF_MS * 2u64.pow(retry_count - 1),
                    ))
                    .await;
                    continue;
                }
                return Err(format!("request failed after {MAX_RETRIES} retries: {e}"));
            }
        };

        let status = resp.status();

        if status.is_success() {
            let body_text = resp.text().await.map_err(|e| format!("read body: {e}"))?;
            return serde_json::from_str(&body_text)
                .map_err(|e| format!("parse: {e} — body: {body_text:.200}"));
        }

        if status == reqwest::StatusCode::UNAUTHORIZED {
            if !has_retried_401 {
                has_retried_401 = true;
                tokio::time::sleep(Duration::from_millis(100)).await;
                continue;
            }
            let body_text = resp.text().await.unwrap_or_else(|_| "(no body)".to_string());
            return Err(format!("unauthorized after refresh: {body_text}"));
        }

        if status == reqwest::StatusCode::TOO_MANY_REQUESTS {
            let wait = parse_retry_after(&resp);
            if retry_count < MAX_RETRIES {
                retry_count += 1;
                tokio::time::sleep(Duration::from_secs(wait)).await;
                continue;
            }
            let body_text = resp.text().await.unwrap_or_else(|_| "(no body)".to_string());
            return Err(format!("rate limited: {body_text}"));
        }

        if status.is_server_error() {
            if retry_count < MAX_RETRIES {
                retry_count += 1;
                let backoff = BASE_BACKOFF_MS * 2u64.pow(retry_count - 1);
                tokio::time::sleep(Duration::from_millis(backoff)).await;
                continue;
            }
            let body_text = resp.text().await.unwrap_or_else(|_| "(no body)".to_string());
            return Err(format!("server error ({}): {body_text}", status.as_u16()));
        }

        let body_text = resp.text().await.unwrap_or_else(|_| "(no body)".to_string());
        return Err(format!("{}: {body_text}", status.as_u16()));
    }
}

async fn get_json<T: DeserializeOwned>(client_id: &str, path: &str, query: &[(&str, &str)]) -> Result<T, String> {
    call_api(client_id, reqwest::Method::GET, path, query, None).await
}

#[tauri::command]
pub async fn api_get_me(client_id: String) -> Result<SpotifyUserProfile, String> {
    get_json(&client_id, "/me", &[]).await
}

#[tauri::command]
pub async fn api_get_playlists(
    client_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<SpotifyPlaylists, String> {
    let mut params: Vec<(&str, String)> = Vec::new();
    if let Some(l) = limit {
        params.push(("limit", l.to_string()));
    }
    if let Some(o) = offset {
        params.push(("offset", o.to_string()));
    }
    let refs: Vec<(&str, &str)> = params.iter().map(|(k, v)| (*k, v.as_str())).collect();
    get_json(&client_id, "/me/playlists", &refs).await
}

#[tauri::command]
pub async fn api_get_playlist(
    client_id: String,
    playlist_id: String,
    fields: Option<String>,
) -> Result<PlaylistDetail, String> {
    let path = format!("/playlists/{playlist_id}");
    let params: &[(&str, &str)] = match &fields {
        Some(f) => &[("fields", f.as_str())],
        None => &[],
    };
    get_json(&client_id, &path, params).await
}

#[tauri::command]
pub async fn api_get_playlist_tracks(
    client_id: String,
    playlist_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<PlaylistTracks, String> {
    let path = format!("/playlists/{playlist_id}/items");
    let mut params: Vec<(&str, String)> = Vec::new();
    if let Some(l) = limit {
        params.push(("limit", l.to_string()));
    }
    if let Some(o) = offset {
        params.push(("offset", o.to_string()));
    }
    let refs: Vec<(&str, &str)> = params.iter().map(|(k, v)| (*k, v.as_str())).collect();
    get_json(&client_id, &path, &refs).await
}

#[tauri::command]
pub async fn api_get_liked_tracks(
    client_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<LikedTracks, String> {
    let mut params: Vec<(&str, String)> = Vec::new();
    if let Some(l) = limit {
        params.push(("limit", l.to_string()));
    }
    if let Some(o) = offset {
        params.push(("offset", o.to_string()));
    }
    let refs: Vec<(&str, &str)> = params.iter().map(|(k, v)| (*k, v.as_str())).collect();
    get_json(&client_id, "/me/tracks", &refs).await
}

#[tauri::command]
pub async fn api_get_album(client_id: String, album_id: String) -> Result<SpotifyAlbum, String> {
    let path = format!("/albums/{album_id}");
    get_json(&client_id, &path, &[]).await
}

#[tauri::command]
pub async fn api_get_artist(client_id: String, artist_id: String) -> Result<SpotifyArtist, String> {
    let path = format!("/artists/{artist_id}");
    get_json(&client_id, &path, &[]).await
}

#[tauri::command]
pub async fn api_get_artist_top_tracks(
    client_id: String,
    artist_id: String,
    market: Option<String>,
) -> Result<ArtistTopTracks, String> {
    let path = format!("/artists/{artist_id}/top-tracks");
    let market = market.unwrap_or_else(|| "from_token".into());
    get_json(&client_id, &path, &[("market", &market)]).await
}

#[tauri::command]
pub async fn api_get_artist_albums(
    client_id: String,
    artist_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<ArtistAlbums, String> {
    let path = format!("/artists/{artist_id}/albums");
    let mut params: Vec<(&str, String)> = vec![("include_groups", "album,single".into())];
    if let Some(l) = limit {
        params.push(("limit", l.to_string()));
    }
    if let Some(o) = offset {
        params.push(("offset", o.to_string()));
    }
    let refs: Vec<(&str, &str)> = params.iter().map(|(k, v)| (*k, v.as_str())).collect();
    get_json(&client_id, &path, &refs).await
}

#[tauri::command]
pub async fn api_get_related_artists(
    client_id: String,
    artist_id: String,
) -> Result<ArtistRelatedArtists, String> {
    let path = format!("/artists/{artist_id}/related-artists");
    get_json(&client_id, &path, &[]).await
}

#[tauri::command]
pub async fn api_search(
    client_id: String,
    query: String,
    types: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<SearchResult, String> {
    let mut params: Vec<(&str, String)> = vec![
        ("q", query),
        ("type", types),
    ];
    if let Some(l) = limit {
        params.push(("limit", l.to_string()));
    }
    if let Some(o) = offset {
        params.push(("offset", o.to_string()));
    }
    let refs: Vec<(&str, &str)> = params.iter().map(|(k, v)| (*k, v.as_str())).collect();
    get_json(&client_id, "/search", &refs).await
}

#[tauri::command]
pub async fn api_get_new_releases(
    client_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<NewReleases, String> {
    let mut params: Vec<(&str, String)> = Vec::new();
    if let Some(l) = limit {
        params.push(("limit", l.to_string()));
    }
    if let Some(o) = offset {
        params.push(("offset", o.to_string()));
    }
    let refs: Vec<(&str, &str)> = params.iter().map(|(k, v)| (*k, v.as_str())).collect();
    get_json(&client_id, "/browse/new-releases", &refs).await
}

#[tauri::command]
pub async fn api_get_featured_playlists(
    client_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<FeaturedPlaylists, String> {
    let mut params: Vec<(&str, String)> = Vec::new();
    if let Some(l) = limit {
        params.push(("limit", l.to_string()));
    }
    if let Some(o) = offset {
        params.push(("offset", o.to_string()));
    }
    let refs: Vec<(&str, &str)> = params.iter().map(|(k, v)| (*k, v.as_str())).collect();
    get_json(&client_id, "/browse/featured-playlists", &refs).await
}

#[tauri::command]
pub async fn api_get_recommendations(
    client_id: String,
    seed_artists: Option<String>,
    seed_tracks: Option<String>,
    seed_genres: Option<String>,
    limit: Option<i32>,
) -> Result<Recommendations, String> {
    let mut params: Vec<(&str, String)> = Vec::new();
    if let Some(a) = seed_artists {
        params.push(("seed_artists", a));
    }
    if let Some(t) = seed_tracks {
        params.push(("seed_tracks", t));
    }
    if let Some(g) = seed_genres {
        params.push(("seed_genres", g));
    }
    params.push(("limit", limit.unwrap_or(10).to_string()));
    let refs: Vec<(&str, &str)> = params.iter().map(|(k, v)| (*k, v.as_str())).collect();
    get_json(&client_id, "/recommendations", &refs).await
}

#[tauri::command]
pub async fn api_get_categories(client_id: String) -> Result<CategoriesList, String> {
    get_json(&client_id, "/browse/categories", &[("limit", "50")]).await
}

#[tauri::command]
pub async fn api_get_currently_playing(
    client_id: String,
) -> Result<CurrentlyPlaying, String> {
    get_json(&client_id, "/me/player/currently-playing", &[("market", "from_token")]).await
}

#[tauri::command]
pub async fn api_transfer_playback(
    client_id: String,
    device_ids: Vec<String>,
    play: Option<bool>,
) -> Result<(), String> {
    let body = serde_json::json!({
        "device_ids": device_ids,
        "play": play.unwrap_or(false),
    });
    let token = tokens::get_valid_access_token(&client_id).await?;
    let headers = build_headers(&token)?;
    let client = reqwest::Client::new();
    let resp = client
        .put(format!("{BASE_URL}/me/player"))
        .headers(headers)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("transfer failed: {e}"))?;
    if resp.status().is_success() {
        Ok(())
    } else {
        let status = resp.status();
        let body_text = resp.text().await.unwrap_or_else(|_| "(no body)".to_string());
        Err(format!("transfer failed ({status}): {body_text}"))
    }
}

#[tauri::command]
pub async fn api_get_available_devices(client_id: String) -> Result<Vec<Device>, String> {
    #[derive(Deserialize)]
    struct DeviceResponse {
        devices: Vec<Device>,
    }
    let resp: DeviceResponse = get_json(&client_id, "/me/player/devices", &[]).await?;
    Ok(resp.devices)
}

#[tauri::command]
pub async fn api_play(
    client_id: String,
    device_id: String,
    uri: Option<String>,
    uris: Option<Vec<String>>,
    context_uri: Option<String>,
) -> Result<(), String> {
    let token = tokens::get_valid_access_token(&client_id).await?;
    let headers = build_headers(&token)?;
    let client = reqwest::Client::new();
    let url = format!("{BASE_URL}/me/player/play");

    let mut body = serde_json::json!({});
    if uri.is_some() && (uris.is_some() || context_uri.is_some()) {
        // TODO: use structured logging (e.g., log::warn!) when logging crate is added
        eprintln!("[warn] api_play: multiple playback parameters provided; using uri, ignoring others");
    }
    if let Some(u) = uri {
        body = serde_json::json!({ "uris": [u] });
    } else if let Some(u) = uris {
        body = serde_json::json!({ "uris": u });
    } else if let Some(ctx) = context_uri {
        body = serde_json::json!({ "context_uri": ctx });
    }

    let resp = client
        .put(&url)
        .headers(headers)
        .query(&[("device_id", &device_id)])
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("play request failed: {e}"))?;

    if resp.status().is_success() || resp.status().as_u16() == 204 {
        Ok(())
    } else {
        let status = resp.status();
        let body_text = resp.text().await.unwrap_or_else(|_| "(no body)".to_string());
        Err(format!("play failed ({status}): {body_text}"))
    }
}

#[tauri::command]
pub async fn api_pause(client_id: String, device_id: String) -> Result<(), String> {
    let token = tokens::get_valid_access_token(&client_id).await?;
    let headers = build_headers(&token)?;
    let client = reqwest::Client::new();
    let url = format!("{BASE_URL}/me/player/pause");

    let resp = client
        .put(&url)
        .headers(headers)
        .query(&[("device_id", &device_id)])
        .send()
        .await
        .map_err(|e| format!("pause request failed: {e}"))?;

    if resp.status().is_success() || resp.status().as_u16() == 204 {
        Ok(())
    } else {
        let status = resp.status();
        let body_text = resp.text().await.unwrap_or_else(|_| "(no body)".to_string());
        Err(format!("pause failed ({status}): {body_text}"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_spotify_user_profile_deserialize() {
        let json = r#"{
            "id": "testuser",
            "display_name": "Test User",
            "email": "test@example.com",
            "product": "premium",
            "country": "US",
            "images": [{"url": "https://example.com/img.jpg", "height": 300, "width": 300}],
            "followers": {"total": 42}
        }"#;
        let profile: SpotifyUserProfile = serde_json::from_str(json).unwrap();
        assert_eq!(profile.id, "testuser");
        assert_eq!(profile.product.unwrap(), "premium");
    }

    #[test]
    fn test_spotify_track_deserialize() {
        let json = r#"{
            "id": "track123",
            "name": "Test Track",
            "uri": "spotify:track:track123",
            "duration_ms": 200000,
            "artists": [{"id": "artist1", "name": "Artist One", "uri": "spotify:artist:artist1"}],
            "album": {"id": "album1", "name": "Test Album", "images": [], "uri": "spotify:album:album1", "release_date": "2024-01-01"},
            "disc_number": 1,
            "track_number": 3,
            "explicit": false,
            "type": "track"
        }"#;
        let track: SpotifyTrack = serde_json::from_str(json).unwrap();
        assert_eq!(track.name, "Test Track");
        assert_eq!(track.artists.len(), 1);
        assert_eq!(track.artists[0].name, "Artist One");
    }

    #[test]
    fn test_search_result_deserialize() {
        let json = r#"{
            "tracks": {
                "items": [{"id": "t1", "name": "Track 1", "uri": "spotify:track:t1", "duration_ms": 180000, "artists": [{"id": "a1", "name": "A1", "uri": "spotify:artist:a1"}], "type": "track"}],
                "total": 1
            },
            "artists": null,
            "albums": null,
            "playlists": null
        }"#;
        let result: SearchResult = serde_json::from_str(json).unwrap();
        assert!(result.tracks.is_some());
        assert_eq!(result.tracks.unwrap().items[0].name, "Track 1");
    }

    #[test]
    fn test_pagination_fields() {
        let json = r#"{
            "items": [],
            "total": 0,
            "offset": 0,
            "limit": 20,
            "next": null
        }"#;
        let playlists: SpotifyPlaylists = serde_json::from_str(json).unwrap();
        assert_eq!(playlists.total, 0);
        assert!(playlists.next.is_none());
    }

    #[test]
    fn test_playlist_detail_deserialize() {
        let json = r#"{
            "id": "pl123",
            "name": "My Playlist",
            "description": "A test playlist",
            "images": [],
            "owner": {"id": "user1", "display_name": "User 1"},
            "tracks": {
                "items": [],
                "total": 0,
                "offset": 0,
                "limit": 20,
                "next": null
            },
            "type": "playlist"
        }"#;
        let pl: PlaylistDetail = serde_json::from_str(json).unwrap();
        assert_eq!(pl.name, "My Playlist");
        assert_eq!(pl.owner.id, "user1");
    }

    #[test]
    fn test_recommendations_deserialize() {
        let json = r#"{
            "tracks": [{"id": "t1", "name": "Rec Track", "uri": "spotify:track:t1", "duration_ms": 200000, "artists": [], "type": "track"}]
        }"#;
        let recs: Recommendations = serde_json::from_str(json).unwrap();
        assert_eq!(recs.tracks.len(), 1);
    }

    #[test]
    fn test_device_deserialize() {
        let json = r#"{"id": "dev1", "name": "Test Device", "is_active": true, "volume_percent": 80}"#;
        let device: Device = serde_json::from_str(json).unwrap();
        assert_eq!(device.name, "Test Device");
        assert!(device.is_active);
        assert_eq!(device.volume_percent, Some(80));
    }
}
