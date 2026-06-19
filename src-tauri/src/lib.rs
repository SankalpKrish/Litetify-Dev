//! Litetify core library. Phase 0 wires up the Tauri runtime and a single
//! `ping` IPC command to prove the Rust <-> webview bridge. Auth, playback,
//! API proxy, and the mod loader land in later phases (see plan.md).

/// Minimal IPC smoke-test command. Returns a greeting the renderer can show
/// to confirm the core is reachable.
#[tauri::command]
fn ping() -> String {
    format!("Litetify core v{} ready", env!("CARGO_PKG_VERSION"))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![ping])
        .run(tauri::generate_context!())
        .expect("error while running Litetify");
}
