pub mod api;
pub mod auth;
pub mod mods;
pub mod playback;

use mods::ModEntry;

#[tauri::command]
fn ping() -> String {
    format!("Litetify core v{} ready", env!("CARGO_PKG_VERSION"))
}

#[tauri::command]
fn scan_mods() -> Vec<ModEntry> {
    mods::scan_mods()
}

#[tauri::command]
fn read_mod_file(mod_path: String, file_path: String) -> Result<String, String> {
    mods::read_mod_file(&mod_path, &file_path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            ping,
            scan_mods,
            read_mod_file,
            auth::login,
            auth::logout,
            auth::check_auth,
            auth::get_valid_token,
            auth::get_profile,
            api::api_get_me,
            api::api_get_playlists,
            api::api_get_playlist,
            api::api_get_playlist_tracks,
            api::api_get_liked_tracks,
            api::api_get_album,
            api::api_get_artist,
            api::api_get_artist_top_tracks,
            api::api_get_artist_albums,
            api::api_get_related_artists,
            api::api_search,
            api::api_get_new_releases,
            api::api_get_featured_playlists,
            api::api_get_recommendations,
            api::api_get_categories,
            api::api_get_currently_playing,
            api::api_transfer_playback,
            api::api_get_available_devices,
            api::api_play,
            api::api_pause,
            playback::websdk::set_active_device,
            playback::websdk::get_active_device,
            playback::websdk::engine_play,
            playback::websdk::engine_pause,
            playback::websdk::engine_resume,
            playback::websdk::engine_seek,
            playback::websdk::engine_set_volume,
            playback::websdk::engine_next,
            playback::websdk::engine_previous,
            #[cfg(feature = "librespot")]
            playback::librespot::init_librespot,
            #[cfg(feature = "librespot")]
            playback::librespot::librespot_play,
            #[cfg(feature = "librespot")]
            playback::librespot::librespot_pause,
            #[cfg(feature = "librespot")]
            playback::librespot::librespot_resume,
            #[cfg(feature = "librespot")]
            playback::librespot::librespot_seek,
            #[cfg(feature = "librespot")]
            playback::librespot::librespot_set_volume,
            #[cfg(feature = "librespot")]
            playback::librespot::librespot_next,
            #[cfg(feature = "librespot")]
            playback::librespot::librespot_previous,
            #[cfg(feature = "librespot")]
            playback::librespot::librespot_toggle_shuffle,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Litetify");
}
