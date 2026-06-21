#![cfg(feature = "librespot")]

use std::sync::atomic::{AtomicBool, AtomicU16, Ordering};
use std::sync::{Mutex as StdMutex, OnceLock};

use crate::auth::tokens;

use librespot::core::authentication::Credentials;
use librespot::core::config::SessionConfig;
use librespot::core::session::Session;
use librespot::core::spotify_id::SpotifyId;
use librespot::playback::audio_backend;
use librespot::playback::config::{AudioFormat, PlayerConfig};
use librespot::playback::mixer::NoOpVolume;
use librespot::playback::player::Player;

struct LibrespotInner {
    _session: Session,
    player: std::sync::Arc<Player>,
}

static ENGINE: OnceLock<StdMutex<Option<LibrespotInner>>> = OnceLock::new();
static VOLUME: AtomicU16 = AtomicU16::new(65535);
static SHUFFLE: AtomicBool = AtomicBool::new(false);

fn engine() -> &'static StdMutex<Option<LibrespotInner>> {
    ENGINE.get_or_init(|| StdMutex::new(None))
}

#[tauri::command]
pub async fn init_librespot(client_id: String) -> Result<(), String> {
    {
        let guard = engine().lock().map_err(|_| "lock poisoned".to_string())?;
        if guard.is_some() {
            return Ok(());
        }
    }

    let token = tokens::get_valid_access_token(&client_id).await?;
    let creds = Credentials::with_access_token(token);

    let session_config = SessionConfig::default();
    let cache = None;
    let session = Session::new(session_config, cache);
    session
        .connect(creds, false)
        .await
        .map_err(|e| format!("librespot connect failed: {e}"))?;

    let player_config = PlayerConfig::default();
    let format = AudioFormat::default();
    let sink_builder = audio_backend::find(None)
        .ok_or("no audio backend available")?;
    let player = Player::new(
        player_config,
        session.clone(),
        Box::new(NoOpVolume),
        move || sink_builder(None, format),
    );

    let mut guard = engine().lock().map_err(|_| "lock poisoned".to_string())?;
    *guard = Some(LibrespotInner {
        _session: session,
        player,
    });

    Ok(())
}

#[tauri::command]
pub async fn librespot_play(uri: Option<String>) -> Result<(), String> {
    let guard = engine().lock().map_err(|_| "lock poisoned".to_string())?;
    let inner = guard.as_ref().ok_or("librespot not initialized")?;
    if let Some(u) = &uri {
        let track_id = SpotifyId::from_uri(u)
            .map_err(|e| format!("invalid Spotify URI: {e}"))?;
        inner.player.load(track_id, true, 0);
    } else {
        inner.player.play();
    }
    Ok(())
}

#[tauri::command]
pub async fn librespot_pause() -> Result<(), String> {
    let guard = engine().lock().map_err(|_| "lock poisoned".to_string())?;
    let inner = guard.as_ref().ok_or("librespot not initialized")?;
    inner.player.pause();
    Ok(())
}

#[tauri::command]
pub async fn librespot_resume() -> Result<(), String> {
    let guard = engine().lock().map_err(|_| "lock poisoned".to_string())?;
    let inner = guard.as_ref().ok_or("librespot not initialized")?;
    inner.player.play();
    Ok(())
}

#[tauri::command]
pub async fn librespot_seek(position_ms: u64) -> Result<(), String> {
    let guard = engine().lock().map_err(|_| "lock poisoned".to_string())?;
    let inner = guard.as_ref().ok_or("librespot not initialized")?;
    let pos: u32 = position_ms.try_into().map_err(|_| "position overflow")?;
    inner.player.seek(pos);
    Ok(())
}

#[tauri::command]
pub async fn librespot_set_volume(volume: u8) -> Result<(), String> {
    let vol = (volume as u16) * 65535 / 100;
    VOLUME.store(vol, Ordering::SeqCst);
    Ok(())
}

#[tauri::command]
pub async fn librespot_next() -> Result<(), String> {
    Err("next track not supported by librespot engine".to_string())
}

#[tauri::command]
pub async fn librespot_previous() -> Result<(), String> {
    Err("previous track not supported by librespot engine".to_string())
}

#[tauri::command]
pub async fn librespot_toggle_shuffle() -> Result<(), String> {
    let new = !SHUFFLE.load(Ordering::SeqCst);
    SHUFFLE.store(new, Ordering::SeqCst);
    Ok(())
}
