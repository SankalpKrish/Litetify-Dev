use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

static ACTIVE_DEVICE_ID: Mutex<Option<String>> = Mutex::new(None);
static ENGINE_READY: AtomicBool = AtomicBool::new(false);

#[tauri::command]
pub fn set_active_device(device_id: String) {
    if let Ok(mut guard) = ACTIVE_DEVICE_ID.lock() {
        *guard = Some(device_id);
    }
    ENGINE_READY.store(true, Ordering::SeqCst);
}

#[tauri::command]
pub fn get_active_device() -> Option<String> {
    ACTIVE_DEVICE_ID.lock().ok().and_then(|g| g.clone())
}

#[tauri::command]
pub fn engine_play(app: AppHandle, uri: Option<String>) -> Result<(), String> {
    app.emit("engine:play", uri).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_pause(app: AppHandle) -> Result<(), String> {
    app.emit("engine:pause", ()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_resume(app: AppHandle) -> Result<(), String> {
    app.emit("engine:resume", ()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_seek(app: AppHandle, position_ms: u64) -> Result<(), String> {
    app.emit("engine:seek", position_ms)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_set_volume(app: AppHandle, volume: u8) -> Result<(), String> {
    app.emit("engine:set-volume", volume)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_next(app: AppHandle) -> Result<(), String> {
    app.emit("engine:next", ()).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn engine_previous(app: AppHandle) -> Result<(), String> {
    app.emit("engine:previous", ()).map_err(|e| e.to_string())
}
