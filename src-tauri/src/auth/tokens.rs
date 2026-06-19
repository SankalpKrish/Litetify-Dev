use chrono::Utc;
use keyring::Entry;
use serde::{Deserialize, Serialize};

const KEYRING_SERVICE: &str = "com.litetify.app";
const KEYRING_USER: &str = "spotify";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenResponse {
    pub access_token: String,
    pub token_type: String,
    pub expires_in: u64,
    #[serde(default)]
    pub refresh_token: Option<String>,
    #[serde(default)]
    pub scope: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StoredTokens {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: i64,
}

pub fn store_tokens(response: &TokenResponse) -> Result<(), String> {
    let refresh = response
        .refresh_token
        .clone()
        .ok_or("no refresh_token in response")?;

    let stored = StoredTokens {
        access_token: response.access_token.clone(),
        refresh_token: refresh,
        expires_at: Utc::now().timestamp() + response.expires_in as i64,
    };

    let json = serde_json::to_string(&stored).map_err(|e| e.to_string())?;
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| e.to_string())?;
    entry.set_password(&json).map_err(|e| e.to_string())?;
    Ok(())
}

pub fn load_tokens() -> Result<StoredTokens, String> {
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| e.to_string())?;
    let json = entry.get_password().map_err(|e| e.to_string())?;
    serde_json::from_str(&json).map_err(|e| e.to_string())
}

pub fn clear_tokens() -> Result<(), String> {
    let entry = Entry::new(KEYRING_SERVICE, KEYRING_USER).map_err(|e| e.to_string())?;
    entry.delete_password().map_err(|e| e.to_string())
}

pub fn tokens_exist() -> bool {
    load_tokens().is_ok()
}

pub fn is_token_expired(stored: &StoredTokens) -> bool {
    Utc::now().timestamp() >= stored.expires_at - 60
}

pub async fn refresh_access_token(
    client_id: &str,
    refresh_token: &str,
) -> Result<TokenResponse, String> {
    let client = reqwest::Client::new();
    let params = [
        ("grant_type", "refresh_token"),
        ("refresh_token", refresh_token),
        ("client_id", client_id),
    ];

    let resp = client
        .post("https://accounts.spotify.com/api/token")
        .form(&params)
        .send()
        .await
        .map_err(|e| format!("refresh request failed: {e}"))?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        return Err(format!("refresh failed ({status}): {body}"));
    }

    resp.json::<TokenResponse>()
        .await
        .map_err(|e| format!("refresh parse failed: {e}"))
}

pub async fn get_valid_access_token(client_id: &str) -> Result<String, String> {
    let stored = load_tokens()?;

    if is_token_expired(&stored) {
        let new_tokens = refresh_access_token(client_id, &stored.refresh_token).await?;
        store_tokens(&new_tokens)?;
        Ok(new_tokens.access_token)
    } else {
        Ok(stored.access_token)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_serde_roundtrip() {
        let response = TokenResponse {
            access_token: "abc".into(),
            token_type: "Bearer".into(),
            expires_in: 3600,
            refresh_token: Some("def".into()),
            scope: Some("streaming".into()),
        };

        let stored = StoredTokens {
            access_token: response.access_token.clone(),
            refresh_token: response.refresh_token.clone().unwrap(),
            expires_at: Utc::now().timestamp() + response.expires_in as i64,
        };

        let json = serde_json::to_string(&stored).unwrap();
        let deserialized: StoredTokens = serde_json::from_str(&json).unwrap();
        assert_eq!(deserialized.access_token, "abc");
        assert_eq!(deserialized.refresh_token, "def");
    }

    #[test]
    fn test_token_expired_check() {
        let future = StoredTokens {
            access_token: "a".into(),
            refresh_token: "r".into(),
            expires_at: Utc::now().timestamp() + 3600,
        };
        assert!(!is_token_expired(&future));

        let past = StoredTokens {
            access_token: "a".into(),
            refresh_token: "r".into(),
            expires_at: Utc::now().timestamp() - 100,
        };
        assert!(is_token_expired(&past));
    }
}
