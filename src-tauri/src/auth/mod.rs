pub mod pkce;
pub mod server;
pub mod tokens;

use pkce::{code_challenge, generate_code_verifier, generate_state};
use server::CallbackServer;
use tokens::TokenResponse;
use url::Url;

const DEFAULT_REDIRECT_URI: &str = "http://127.0.0.1:14523/callback";
const MAX_PORT_TRIES: u16 = 10;

const SCOPES: &str = "streaming \
    user-read-email \
    user-read-private \
    user-read-playback-state \
    user-modify-playback-state \
    user-library-read \
    user-library-modify \
    playlist-read-private \
    playlist-read-collaborative";

pub fn build_auth_url(client_id: &str, challenge: &str, state: &str, port: u16) -> String {
    let redirect_uri = format!("http://127.0.0.1:{port}/callback");
    let mut url = Url::parse("https://accounts.spotify.com/authorize").unwrap();
    url.query_pairs_mut()
        .append_pair("client_id", client_id)
        .append_pair("response_type", "code")
        .append_pair("redirect_uri", &redirect_uri)
        .append_pair("code_challenge_method", "S256")
        .append_pair("code_challenge", challenge)
        .append_pair("state", state)
        .append_pair("scope", SCOPES);
    url.to_string()
}

fn extract_port(redirect_uri: &str) -> Result<u16, String> {
    let url = Url::parse(redirect_uri).map_err(|e| format!("invalid redirect_uri: {e}"))?;
    url.port().ok_or_else(|| "redirect_uri must include a port".into())
}

fn try_bind_server(
    base_port: u16,
    expected_state: String,
) -> Result<CallbackServer, String> {
    for offset in 0..MAX_PORT_TRIES {
        let port = base_port + offset;
        match CallbackServer::start(port, expected_state.clone()) {
            Ok(server) => return Ok(server),
            Err(_) if offset < MAX_PORT_TRIES - 1 => continue,
            Err(e) => {
                return Err(format!(
                    "could not bind to ports {base_port}–{}: {e}",
                    base_port + MAX_PORT_TRIES - 1
                ));
            }
        }
    }
    Err("no available port".into())
}

pub async fn exchange_code(
    code: &str,
    verifier: &str,
    redirect_uri: &str,
    client_id: &str,
) -> Result<TokenResponse, String> {
    let client = reqwest::Client::new();
    let params = [
        ("grant_type", "authorization_code"),
        ("code", code),
        ("redirect_uri", redirect_uri),
        ("client_id", client_id),
        ("code_verifier", verifier),
    ];

    let resp = client
        .post("https://accounts.spotify.com/api/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("token exchange request failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("token exchange failed ({status}): {body}"));
    }

    resp.json::<TokenResponse>()
        .await
        .map_err(|e| format!("token exchange parse failed: {e}"))
}

pub async fn fetch_profile(access_token: &str) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::new();
    let resp = client
        .get("https://api.spotify.com/v1/me")
        .bearer_auth(access_token)
        .send()
        .await
        .map_err(|e| format!("profile request failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("profile fetch failed ({status}): {body}"));
    }

    resp.json::<serde_json::Value>()
        .await
        .map_err(|e| format!("profile parse failed: {e}"))
}

#[tauri::command]
pub async fn login(
    _app_handle: tauri::AppHandle,
    client_id: String,
) -> Result<String, String> {
    let verifier = generate_code_verifier();
    let challenge = code_challenge(&verifier);
    let state = generate_state();

    let base_port = extract_port(DEFAULT_REDIRECT_URI)?;
    let server = try_bind_server(base_port, state.clone())?;
    let port = server.port;

    let auth_url = build_auth_url(&client_id, &challenge, &state, port);

    tauri_plugin_opener::open_url(&auth_url, None::<&str>)
        .map_err(|e| format!("failed to open browser: {e}"))?;

    let callback = server
        .receiver
        .recv()
        .map_err(|_| "auth callback receiver disconnected".to_string())?;

    let redirect_uri = format!("http://127.0.0.1:{port}/callback");
    let token_resp = exchange_code(&callback.code, &verifier, &redirect_uri, &client_id).await?;

    tokens::store_tokens(&token_resp)?;

    let access_token = tokens::get_valid_access_token(&client_id).await?;
    let profile = fetch_profile(&access_token).await?;

    let product = profile
        .get("product")
        .and_then(|v| v.as_str())
        .unwrap_or("unknown");

    if product != "premium" {
        tokens::clear_tokens()?;
        return Err(format!(
            "Spotify Premium required. Your account is '{}'. \
             Litetify only supports Premium accounts.",
            product
        ));
    }

    Ok("authenticated".into())
}

#[tauri::command]
pub async fn logout() -> Result<(), String> {
    tokens::clear_tokens()
}

#[tauri::command]
pub fn check_auth() -> bool {
    tokens::tokens_exist()
}

#[tauri::command]
pub async fn get_valid_token(client_id: String) -> Result<String, String> {
    tokens::get_valid_access_token(&client_id).await
}

#[tauri::command]
pub async fn get_profile(client_id: String) -> Result<serde_json::Value, String> {
    let token = tokens::get_valid_access_token(&client_id).await?;
    fetch_profile(&token).await
}
