use crate::auth::tokens;
use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_LENGTH, RETRY_AFTER};
use serde::de::{DeserializeOwned, Deserializer};
use serde::{Deserialize, Serialize};
use std::time::Duration;

fn deserialize_null_to_default<'de, D, T>(d: D) -> Result<T, D::Error>
where
    D: Deserializer<'de>,
    T: Default + Deserialize<'de>,
{
    Option::<T>::deserialize(d).map(|x| x.unwrap_or_default())
}

/// Spotify's `/search` (and some paging) responses can include `null` entries
/// inside `items` arrays for content that is unavailable/deprecated. A plain
/// `Vec<T>` fails to deserialize on those nulls, so we accept `Vec<Option<T>>`
/// and drop the `null`s.
fn deserialize_vec_skip_nulls<'de, D, T>(d: D) -> Result<Vec<T>, D::Error>
where
    D: Deserializer<'de>,
    T: Deserialize<'de>,
{
    let opts = Option::<Vec<Option<T>>>::deserialize(d)?;
    Ok(opts.unwrap_or_default().into_iter().flatten().collect())
}

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
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
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
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
    pub id: String,
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
    pub name: String,
    pub description: Option<String>,
    pub public: Option<bool>,
    pub collaborative: bool,
    pub owner: SpotifyOwner,
    pub images: Vec<SpotifyImage>,
    // Migration renamed the per-playlist track-count summary `tracks` -> `items`.
    // Accept either so the track count shows on list/card views.
    #[serde(default, alias = "items")]
    pub tracks: PlaylistTracksRef,
    #[serde(rename = "type")]
    pub type_: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyOwner {
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
    pub id: String,
    pub display_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistTracksRef {
    #[serde(default)]
    pub total: i32,
    #[serde(default)]
    pub href: String,
}

impl Default for PlaylistTracksRef {
    fn default() -> Self {
        Self { total: 0, href: String::new() }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistDetail {
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
    pub id: String,
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
    pub name: String,
    pub description: Option<String>,
    pub images: Vec<SpotifyImage>,
    pub owner: SpotifyOwner,
    pub public: Option<bool>,
    pub followers: Option<Followers>,
    // Feb/Mar 2026 dev-mode migration renamed the playlist `tracks` paging
    // object to `items`. Accept either so the track count + inline items
    // populate regardless of which name the API returns.
    #[serde(default, alias = "items")]
    pub tracks: PlaylistDetailTracks,
    #[serde(rename = "type")]
    pub type_: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistDetailTracks {
    #[serde(default, deserialize_with = "deserialize_vec_skip_nulls")]
    pub items: Vec<PlaylistTrackItem>,
    pub total: i32,
    #[serde(default)]
    pub offset: i32,
    #[serde(default)]
    pub limit: i32,
    #[serde(default)]
    pub next: Option<String>,
}

impl Default for PlaylistDetailTracks {
    fn default() -> Self {
        Self { items: Vec::new(), total: 0, offset: 0, limit: 0, next: None }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistTracks {
    #[serde(default, deserialize_with = "deserialize_vec_skip_nulls")]
    pub items: Vec<PlaylistTrackItem>,
    pub total: i32,
    #[serde(default)]
    pub offset: i32,
    #[serde(default)]
    pub limit: i32,
    #[serde(default)]
    pub next: Option<String>,
}

impl Default for PlaylistTracks {
    fn default() -> Self {
        Self { items: Vec::new(), total: 0, offset: 0, limit: 0, next: None }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistTrackItem {
    pub added_at: Option<String>,
    // Migration renamed the per-item `track` field to `item`. Accept both.
    #[serde(alias = "item")]
    pub track: Option<SpotifyTrack>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyTrack {
    pub id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
    pub name: String,
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
    pub uri: String,
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
    pub duration_ms: i32,
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
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
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
    pub id: String,
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
    pub name: String,
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
    pub uri: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyAlbumBrief {
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
    pub id: String,
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
    pub name: String,
    pub images: Vec<SpotifyImage>,
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
    pub uri: String,
    pub release_date: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyAlbum {
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
    pub id: String,
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
    pub name: String,
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
    pub artists: Vec<SpotifyArtistBrief>,
    pub images: Vec<SpotifyImage>,
    #[serde(default)]
    pub tracks: AlbumTracks,
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
    pub uri: String,
    pub release_date: Option<String>,
    pub total_tracks: i32,
    pub label: Option<String>,
    pub popularity: Option<i32>,
    #[serde(default)]
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

impl Default for AlbumTracks {
    fn default() -> Self {
        Self { items: Vec::new(), total: 0, offset: 0, limit: 0, next: None }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyArtist {
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
    pub id: String,
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
    pub name: String,
    pub images: Vec<SpotifyImage>,
    #[serde(default)]
    pub genres: Vec<String>,
    pub popularity: Option<i32>,
    pub followers: Option<Followers>,
    #[serde(default, deserialize_with = "deserialize_null_to_default")]
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
    #[serde(default, deserialize_with = "deserialize_vec_skip_nulls")]
    pub items: Vec<SpotifyTrack>,
    pub total: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchArtists {
    #[serde(default, deserialize_with = "deserialize_vec_skip_nulls")]
    pub items: Vec<SpotifyArtist>,
    pub total: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchAlbums {
    #[serde(default, deserialize_with = "deserialize_vec_skip_nulls")]
    pub items: Vec<SpotifyAlbum>,
    pub total: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchPlaylists {
    #[serde(default, deserialize_with = "deserialize_vec_skip_nulls")]
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
            // 204 No Content (and some 200s) return an empty body — e.g.
            // /me/player/currently-playing when nothing is playing. Treat an
            // empty body as JSON null so Option/unit return types parse cleanly.
            let to_parse = if body_text.trim().is_empty() { "null" } else { &body_text };
            return serde_json::from_str(to_parse).map_err(|e| {
                eprintln!("[litetify][api] PARSE FAIL {method} {url} (query={query:?}): {e}\n  body: {}", &body_text.chars().take(800).collect::<String>());
                format!("parse error: {e}")
            });
        }

        eprintln!("[litetify][api] HTTP {} {method} {url} (query={query:?})", status.as_u16());

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

fn query_params(limit: Option<i32>, offset: Option<i32>) -> Vec<(&'static str, String)> {
    let mut p = Vec::new();
    if let Some(l) = limit { p.push(("limit", l.to_string())); }
    if let Some(o) = offset { p.push(("offset", o.to_string())); }
    p
}

fn to_refs<'a>(params: &'a [(&'static str, String)]) -> Vec<(&'a str, &'a str)> {
    params.iter().map(|(k, v)| (*k, v.as_str())).collect()
}

#[tauri::command]
pub async fn api_get_me(client_id: String) -> Result<SpotifyUserProfile, String> {
    get_json(&client_id, "/me", &[]).await
}

#[tauri::command]
pub async fn api_create_playlist(
    client_id: String,
    name: String,
    description: Option<String>,
    public: Option<bool>,
) -> Result<(), String> {
    // Get current user's ID
    let profile: SpotifyUserProfile = get_json(&client_id, "/me", &[]).await?;
    let path = format!("/users/{}/playlists", profile.id);
    let mut body = serde_json::json!({ "name": name });
    if let Some(d) = description {
        body["description"] = serde_json::json!(d);
    }
    if let Some(p) = public {
        body["public"] = serde_json::json!(p);
    }
    call_api::<Option<serde_json::Value>>(&client_id, reqwest::Method::POST, &path, &[], Some(body)).await?;
    Ok(())
}

#[tauri::command]
pub async fn api_update_playlist(
    client_id: String,
    playlist_id: String,
    name: Option<String>,
    description: Option<String>,
    public: Option<bool>,
) -> Result<(), String> {
    let path = format!("/playlists/{playlist_id}");
    let mut body = serde_json::json!({});
    if let Some(n) = name {
        body["name"] = serde_json::json!(n);
    }
    if let Some(d) = description {
        body["description"] = serde_json::json!(d);
    }
    if let Some(p) = public {
        body["public"] = serde_json::json!(p);
    }
    call_api::<Option<serde_json::Value>>(&client_id, reqwest::Method::PUT, &path, &[], Some(body)).await?;
    Ok(())
}

#[tauri::command]
pub async fn api_get_playlists(
    client_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<SpotifyPlaylists, String> {
    let params = query_params(limit, offset);
    let refs = to_refs(&params);
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
    // Use `/items` (not the removed `/tracks`): the Feb/Mar 2026 dev-mode
    // migration removed `GET /playlists/{id}/tracks`, which now returns 403.
    let path = format!("/playlists/{playlist_id}/items");
    // `market` is intentionally omitted: with a user access token Spotify applies
    // the account's country automatically. The legacy `from_token` value is no
    // longer accepted by the endpoint validator and returns HTTP 400.
    let params = query_params(limit, offset);
    let refs = to_refs(&params);
    get_json(&client_id, &path, &refs).await
}

#[tauri::command]
pub async fn api_get_liked_tracks(
    client_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<LikedTracks, String> {
    let params = query_params(limit, offset);
    let refs = to_refs(&params);
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
    // Only pass `market` when the caller supplies a real ISO 3166-1 alpha-2 code.
    // Otherwise omit it so Spotify uses the user account's country (the legacy
    // `from_token` value is rejected with HTTP 400 by the current API).
    match market {
        Some(m) => get_json(&client_id, &path, &[("market", m.as_str())]).await,
        None => get_json(&client_id, &path, &[]).await,
    }
}

#[tauri::command]
pub async fn api_get_artist_albums(
    client_id: String,
    artist_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<ArtistAlbums, String> {
    let path = format!("/artists/{artist_id}/albums");
    let mut params = query_params(limit, offset);
    params.insert(0, ("include_groups", "album,single".into()));
    let refs = to_refs(&params);
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
    // `market` omitted: Spotify uses the user account's country from the access
    // token. Passing `from_token` here returns HTTP 400 from the search endpoint.
    let mut params = query_params(limit, offset);
    params.insert(0, ("type", types));
    params.insert(0, ("q", query));
    let refs = to_refs(&params);
    get_json(&client_id, "/search", &refs).await
}

#[tauri::command]
pub async fn api_get_new_releases(
    client_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<NewReleases, String> {
    let params = query_params(limit, offset);
    let refs = to_refs(&params);
    get_json(&client_id, "/browse/new-releases", &refs).await
}

#[tauri::command]
pub async fn api_get_featured_playlists(
    client_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<FeaturedPlaylists, String> {
    let params = query_params(limit, offset);
    let refs = to_refs(&params);
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
    let refs = to_refs(&params);
    get_json(&client_id, "/recommendations", &refs).await
}

#[tauri::command]
pub async fn api_get_categories(client_id: String) -> Result<CategoriesList, String> {
    get_json(&client_id, "/browse/categories", &[("limit", "50")]).await
}

#[tauri::command]
pub async fn api_get_currently_playing(
    client_id: String,
) -> Result<Option<CurrentlyPlaying>, String> {
    // `market` omitted: the user access token already scopes results to the
    // account's country; `from_token` is no longer an accepted value.
    // Returns None when Spotify replies 204 (nothing playing) -> empty body -> null.
    get_json(&client_id, "/me/player/currently-playing", &[]).await
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
pub async fn api_check_follow_artist(
    client_id: String,
    artist_id: String,
) -> Result<bool, String> {
    let res: Vec<bool> = call_api(
        &client_id,
        reqwest::Method::GET,
        "/me/following/contains",
        &[("type", "artist"), ("ids", &artist_id)],
        None,
    )
    .await?;
    Ok(res.first().copied().unwrap_or(false))
}

#[tauri::command]
pub async fn api_follow_artist(client_id: String, artist_id: String) -> Result<(), String> {
    call_api::<Option<serde_json::Value>>(
        &client_id,
        reqwest::Method::PUT,
        "/me/following",
        &[("type", "artist"), ("ids", &artist_id)],
        None,
    )
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn api_unfollow_artist(client_id: String, artist_id: String) -> Result<(), String> {
    call_api::<Option<serde_json::Value>>(
        &client_id,
        reqwest::Method::DELETE,
        "/me/following",
        &[("type", "artist"), ("ids", &artist_id)],
        None,
    )
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn api_follow_playlist(client_id: String, playlist_id: String) -> Result<(), String> {
    call_api::<Option<serde_json::Value>>(
        &client_id,
        reqwest::Method::PUT,
        &format!("/playlists/{playlist_id}/followers"),
        &[],
        Some(serde_json::json!({ "public": false })),
    )
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn api_unfollow_playlist(client_id: String, playlist_id: String) -> Result<(), String> {
    call_api::<Option<serde_json::Value>>(
        &client_id,
        reqwest::Method::DELETE,
        &format!("/playlists/{playlist_id}/followers"),
        &[],
        None,
    )
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn api_play(
    client_id: String,
    device_id: String,
    uri: Option<String>,
    uris: Option<Vec<String>>,
    context_uri: Option<String>,
    offset_uri: Option<String>,
) -> Result<(), String> {
    let token = tokens::get_valid_access_token(&client_id).await?;
    let headers = build_headers(&token)?;
    let client = reqwest::Client::new();
    let url = format!("{BASE_URL}/me/player/play");

    // Build a queue so next/previous work:
    //  - context_uri (playlist/album) + optional offset, OR
    //  - an explicit uris list + optional offset (used when there is no Spotify
    //    context, e.g. search results or Liked Songs), OR
    //  - a single uri (no queue — last resort).
    let body = if let Some(ctx) = context_uri {
        match offset_uri {
            Some(off) => serde_json::json!({ "context_uri": ctx, "offset": { "uri": off } }),
            None => serde_json::json!({ "context_uri": ctx }),
        }
    } else if let Some(list) = uris {
        match offset_uri {
            Some(off) => serde_json::json!({ "uris": list, "offset": { "uri": off } }),
            None => serde_json::json!({ "uris": list }),
        }
    } else if let Some(u) = uri {
        serde_json::json!({ "uris": [u] })
    } else {
        serde_json::json!({})
    };

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
        .header(CONTENT_LENGTH, "0")
        .body(Vec::<u8>::new())
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

// ── Player transport controls (Web API) ──
// These target the active device directly, so they work even when playback was
// started from a single track URI without a context/queue (where the Web
// Playback SDK's own next/previous are no-ops).

async fn player_control(
    client_id: &str,
    method: reqwest::Method,
    path: &str,
    extra_query: &[(&str, &str)],
    label: &str,
) -> Result<(), String> {
    let token = tokens::get_valid_access_token(client_id).await?;
    let headers = build_headers(&token)?;
    let client = reqwest::Client::new();
    let url = format!("{BASE_URL}{path}");
    let resp = client
        .request(method, &url)
        .headers(headers)
        .query(extra_query)
        // Spotify's player PUT/POST endpoints require a Content-Length header.
        // Without an explicit `Content-Length: 0` they return HTTP 411.
        .header(CONTENT_LENGTH, "0")
        .body(Vec::<u8>::new())
        .send()
        .await
        .map_err(|e| format!("{label} request failed: {e}"))?;
    if resp.status().is_success() || resp.status().as_u16() == 204 {
        Ok(())
    } else {
        let status = resp.status();
        let body_text = resp.text().await.unwrap_or_else(|_| "(no body)".to_string());
        Err(format!("{label} failed ({status}): {body_text}"))
    }
}

#[tauri::command]
pub async fn api_next(client_id: String, device_id: String) -> Result<(), String> {
    player_control(&client_id, reqwest::Method::POST, "/me/player/next", &[("device_id", device_id.as_str())], "next").await
}

#[tauri::command]
pub async fn api_previous(client_id: String, device_id: String) -> Result<(), String> {
    player_control(&client_id, reqwest::Method::POST, "/me/player/previous", &[("device_id", device_id.as_str())], "previous").await
}

#[tauri::command]
pub async fn api_set_shuffle(client_id: String, device_id: String, state: bool) -> Result<(), String> {
    let state_str = if state { "true" } else { "false" };
    player_control(&client_id, reqwest::Method::PUT, "/me/player/shuffle", &[("state", state_str), ("device_id", device_id.as_str())], "shuffle").await
}

#[tauri::command]
pub async fn api_set_repeat(client_id: String, device_id: String, state: String) -> Result<(), String> {
    // state: "off" | "context" | "track"
    player_control(&client_id, reqwest::Method::PUT, "/me/player/repeat", &[("state", state.as_str()), ("device_id", device_id.as_str())], "repeat").await
}

// ── Track actions (queue / library / playlist add) ──

#[tauri::command]
pub async fn api_add_to_queue(client_id: String, uri: String, device_id: Option<String>) -> Result<(), String> {
    let mut q: Vec<(&str, &str)> = vec![("uri", uri.as_str())];
    if let Some(d) = &device_id {
        q.push(("device_id", d.as_str()));
    }
    player_control(&client_id, reqwest::Method::POST, "/me/player/queue", &q, "add to queue").await
}

/// Save items to the user's library (migrated generic endpoint).
/// `uris` is a comma-separated list of Spotify URIs.
#[tauri::command]
pub async fn api_save_to_library(client_id: String, uris: String) -> Result<(), String> {
    player_control(&client_id, reqwest::Method::PUT, "/me/library", &[("uris", uris.as_str())], "save to library").await
}

#[tauri::command]
pub async fn api_remove_from_library(client_id: String, uris: String) -> Result<(), String> {
    player_control(&client_id, reqwest::Method::DELETE, "/me/library", &[("uris", uris.as_str())], "remove from library").await
}

/// Returns one bool per URI indicating whether it is saved in the library.
#[tauri::command]
pub async fn api_check_library(client_id: String, uris: String) -> Result<Vec<bool>, String> {
    get_json(&client_id, "/me/library/contains", &[("uris", uris.as_str())]).await
}

#[tauri::command]
pub async fn api_add_to_playlist(
    client_id: String,
    playlist_id: String,
    uris: Vec<String>,
) -> Result<(), String> {
    let token = tokens::get_valid_access_token(&client_id).await?;
    let headers = build_headers(&token)?;
    let client = reqwest::Client::new();
    let url = format!("{BASE_URL}/playlists/{playlist_id}/items");
    let body = serde_json::json!({ "uris": uris });
    let resp = client
        .post(&url)
        .headers(headers)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("add to playlist request failed: {e}"))?;
    if resp.status().is_success() || resp.status().as_u16() == 201 {
        Ok(())
    } else {
        let status = resp.status();
        let body_text = resp.text().await.unwrap_or_else(|_| "(no body)".to_string());
        Err(format!("add to playlist failed ({status}): {body_text}"))
    }
}

#[tauri::command]
pub async fn api_remove_from_playlist(
    client_id: String,
    playlist_id: String,
    uris: Vec<String>,
) -> Result<(), String> {
    let token = tokens::get_valid_access_token(&client_id).await?;
    let headers = build_headers(&token)?;
    let client = reqwest::Client::new();
    let url = format!("{BASE_URL}/playlists/{playlist_id}/items");
    let items: Vec<serde_json::Value> = uris
        .iter()
        .map(|u| serde_json::json!({ "uri": u }))
        .collect();
    let body = serde_json::json!({ "items": items });
    let resp = client
        .delete(&url)
        .headers(headers)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("remove from playlist request failed: {e}"))?;
    if resp.status().is_success() || resp.status().as_u16() == 200 {
        Ok(())
    } else {
        let status = resp.status();
        let body_text = resp.text().await.unwrap_or_else(|_| "(no body)".to_string());
        Err(format!("remove from playlist failed ({status}): {body_text}"))
    }
}

// ── Home page endpoints ──

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopArtists {
    pub items: Vec<SpotifyArtist>,
    pub total: i32,
    pub offset: i32,
    pub limit: i32,
    pub next: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TopTracks {
    pub items: Vec<SpotifyTrack>,
    pub total: i32,
    pub offset: i32,
    pub limit: i32,
    pub next: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentlyPlayed {
    pub items: Vec<PlayHistory>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlayHistory {
    pub track: SpotifyTrack,
    pub played_at: String,
}

// ─── Podcast / Shows types ────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyShowPage {
    pub items: Vec<SpotifyShow>,
    pub total: i32,
    pub offset: i32,
    pub limit: i32,
    pub next: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SpotifyShow {
    pub id: String,
    pub name: String,
    pub description: String,
    pub publisher: String,
    pub images: Vec<SpotifyImage>,
    pub total_episodes: i32,
    pub explicit: bool,
    #[serde(rename = "type")]
    pub type_: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShowEpisodesPage {
    pub items: Vec<ShowEpisode>,
    pub total: i32,
    pub offset: i32,
    pub limit: i32,
    pub next: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShowEpisode {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub duration_ms: i32,
    pub explicit: bool,
    pub release_date: String,
    pub images: Vec<SpotifyImage>,
    pub uri: String,
    #[serde(rename = "type")]
    pub type_: String,
}

#[tauri::command]
pub async fn api_get_top_artists(
    client_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
    #[allow(non_snake_case)]
    timeRange: Option<String>,
) -> Result<TopArtists, String> {
    let mut params = query_params(limit, offset);
    params.insert(0, ("time_range", timeRange.unwrap_or_else(|| "medium_term".into())));
    let refs = to_refs(&params);
    get_json(&client_id, "/me/top/artists", &refs).await
}

#[tauri::command]
pub async fn api_get_top_tracks(
    client_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
    #[allow(non_snake_case)]
    timeRange: Option<String>,
) -> Result<TopTracks, String> {
    let mut params = query_params(limit, offset);
    params.insert(0, ("time_range", timeRange.unwrap_or_else(|| "medium_term".into())));
    let refs = to_refs(&params);
    get_json(&client_id, "/me/top/tracks", &refs).await
}

#[tauri::command]
pub async fn api_get_recently_played(
    client_id: String,
    limit: Option<i32>,
) -> Result<RecentlyPlayed, String> {
    let params = query_params(limit, None);
    let refs = to_refs(&params);
    get_json(&client_id, "/me/player/recently-played", &refs).await
}

// ─── Podcast / Shows commands ───────────────────────────────

#[tauri::command]
pub async fn api_get_saved_shows(
    client_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<SpotifyShowPage, String> {
    let params = query_params(limit, offset);
    let refs = to_refs(&params);
    get_json(&client_id, "/me/shows", &refs).await
}

#[tauri::command]
pub async fn api_get_show(
    client_id: String,
    show_id: String,
) -> Result<SpotifyShow, String> {
    let path = format!("/shows/{show_id}");
    get_json(&client_id, &path, &[]).await
}

#[tauri::command]
pub async fn api_get_show_episodes(
    client_id: String,
    show_id: String,
    limit: Option<i32>,
    offset: Option<i32>,
) -> Result<ShowEpisodesPage, String> {
    let path = format!("/shows/{show_id}/episodes");
    let params = query_params(limit, offset);
    let refs = to_refs(&params);
    get_json(&client_id, &path, &refs).await
}

#[tauri::command]
pub async fn api_save_show(client_id: String, show_id: String) -> Result<(), String> {
    call_api::<Option<serde_json::Value>>(
        &client_id,
        reqwest::Method::PUT,
        "/me/shows",
        &[],
        Some(serde_json::json!({ "ids": [show_id] })),
    )
    .await?;
    Ok(())
}

#[tauri::command]
pub async fn api_remove_show(client_id: String, show_id: String) -> Result<(), String> {
    call_api::<Option<serde_json::Value>>(
        &client_id,
        reqwest::Method::DELETE,
        "/me/shows",
        &[("ids", &show_id)],
        None,
    )
    .await?;
    Ok(())
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
    fn test_spotify_track_null_fields_deserialize() {
        let json = r#"{
            "id": null,
            "name": null,
            "uri": null,
            "duration_ms": null,
            "artists": null,
            "album": null,
            "disc_number": null,
            "track_number": null,
            "explicit": null,
            "type": "track"
        }"#;
        let track: SpotifyTrack = serde_json::from_str(json).unwrap();
        assert_eq!(track.name, "");
        assert_eq!(track.uri, "");
        assert_eq!(track.duration_ms, 0);
        assert_eq!(track.artists.len(), 0);
        assert!(track.album.is_none());
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
        // Legacy shape: `tracks` paging with wrapped `{added_at, track}` items.
        let json = r#"{
            "id": "pl123",
            "name": "My Playlist",
            "description": "A test playlist",
            "images": [],
            "owner": {"id": "user1", "display_name": "User 1"},
            "tracks": {
                "items": [{"added_at": "2024-01-01T00:00:00Z", "track": {"id": "t1", "name": "Track 1", "uri": "spotify:track:t1", "duration_ms": 180000, "artists": [{"id": "a1", "name": "A1", "uri": "spotify:artist:a1"}], "type": "track"}}],
                "total": 1,
                "offset": 0,
                "limit": 20,
                "next": null
            },
            "type": "playlist"
        }"#;
        let pl: PlaylistDetail = serde_json::from_str(json).unwrap();
        assert_eq!(pl.name, "My Playlist");
        assert_eq!(pl.owner.id, "user1");
        assert_eq!(pl.tracks.items.len(), 1);
        assert_eq!(pl.tracks.items[0].track.as_ref().unwrap().name, "Track 1");
    }

    #[test]
    fn test_playlist_detail_migrated_items_alias() {
        // Feb/Mar 2026 dev-mode shape: `items` paging with per-item `item` field.
        let json = r#"{
            "id": "pl123",
            "name": "Migrated Playlist",
            "description": null,
            "images": [],
            "owner": {"id": "user1", "display_name": "User 1"},
            "items": {
                "items": [{"added_at": "2024-01-01T00:00:00Z", "item": {"id": "t1", "name": "Migrated Track", "uri": "spotify:track:t1", "duration_ms": 180000, "artists": [], "type": "track"}}],
                "total": 1
            },
            "type": "playlist"
        }"#;
        let pl: PlaylistDetail = serde_json::from_str(json).unwrap();
        assert_eq!(pl.tracks.total, 1);
        assert_eq!(pl.tracks.items.len(), 1);
        assert_eq!(pl.tracks.items[0].track.as_ref().unwrap().name, "Migrated Track");
    }

    #[test]
    fn test_playlist_tracks_item_alias() {
        // GET /playlists/{id}/items uses `item`; ensure both `item` and `track` parse.
        let json = r#"{
            "items": [
                {"added_at": "2024-01-01T00:00:00Z", "item": {"id": "t1", "name": "Via item", "uri": "spotify:track:t1", "duration_ms": 1, "artists": [], "type": "track"}},
                {"added_at": "2024-01-02T00:00:00Z", "track": {"id": "t2", "name": "Via track", "uri": "spotify:track:t2", "duration_ms": 1, "artists": [], "type": "track"}}
            ],
            "total": 2,
            "offset": 0,
            "limit": 20,
            "next": null
        }"#;
        let pt: PlaylistTracks = serde_json::from_str(json).unwrap();
        assert_eq!(pt.items.len(), 2);
        assert_eq!(pt.items[0].track.as_ref().unwrap().name, "Via item");
        assert_eq!(pt.items[1].track.as_ref().unwrap().name, "Via track");
    }

    #[test]
    fn test_search_skips_null_playlist_items() {
        // Spotify search can return null entries inside items arrays.
        let json = r#"{
            "tracks": null,
            "artists": null,
            "albums": null,
            "playlists": {
                "items": [
                    null,
                    {"id": "p1", "name": "Real PL", "description": null, "collaborative": false, "owner": {"id": "u1", "display_name": "U"}, "images": [], "type": "playlist"},
                    null
                ],
                "total": 3
            }
        }"#;
        let result: SearchResult = serde_json::from_str(json).unwrap();
        let pls = result.playlists.unwrap();
        assert_eq!(pls.items.len(), 1);
        assert_eq!(pls.items[0].name, "Real PL");
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
