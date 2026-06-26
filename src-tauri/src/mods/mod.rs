use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct ModManifest {
    pub name: String,
    pub version: String,
    #[serde(rename = "type")]
    pub mod_type: ModType,
    pub entry: String,
    pub description: Option<String>,
    pub author: Option<String>,
    #[serde(rename = "litetifyApiVersion")]
    pub litetify_api_version: String,
    pub permissions: Option<Vec<String>>,
}

#[derive(Debug, Deserialize, Serialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum ModType {
    Theme,
    Extension,
    App,
}

#[derive(Debug, Serialize, Clone)]
pub struct ModEntry {
    pub path: String,
    pub name: String,
    pub version: String,
    pub mod_type: ModType,
    pub entry: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub litetify_api_version: String,
    pub permissions: Vec<String>,
    pub error: Option<String>,
}

pub fn scan_mods() -> Vec<ModEntry> {
    let mods_dir = mods_path();
    if !mods_dir.exists() {
        let _ = fs::create_dir_all(&mods_dir);
        return vec![];
    }

    let entries = match fs::read_dir(&mods_dir) {
        Ok(e) => e,
        Err(_) => return vec![],
    };

    let mut mods = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let manifest_path = path.join("manifest.json");
        if !manifest_path.exists() {
            continue;
        }

        let content = match fs::read_to_string(&manifest_path) {
            Ok(c) => c,
            Err(e) => {
                mods.push(ModEntry {
                    path: path.to_string_lossy().to_string(),
                    name: path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                    version: String::new(),
                    mod_type: ModType::Theme,
                    entry: String::new(),
                    description: None,
                    author: None,
                    litetify_api_version: String::new(),
                    permissions: vec![],
                    error: Some(format!("Failed to read manifest.json: {}", e)),
                });
                continue;
            }
        };

        let manifest: ModManifest = match serde_json::from_str(&content) {
            Ok(m) => m,
            Err(e) => {
                mods.push(ModEntry {
                    path: path.to_string_lossy().to_string(),
                    name: path.file_name().unwrap_or_default().to_string_lossy().to_string(),
                    version: String::new(),
                    mod_type: ModType::Theme,
                    entry: String::new(),
                    description: None,
                    author: None,
                    litetify_api_version: String::new(),
                    permissions: vec![],
                    error: Some(format!("Invalid manifest.json: {}", e)),
                });
                continue;
            }
        };

        let entry_path = path.join(&manifest.entry);
        if !entry_path.exists() {
            mods.push(ModEntry {
                path: path.to_string_lossy().to_string(),
                name: manifest.name.clone(),
                version: manifest.version.clone(),
                mod_type: manifest.mod_type,
                entry: manifest.entry.clone(),
                description: manifest.description.clone(),
                author: manifest.author.clone(),
                litetify_api_version: manifest.litetify_api_version.clone(),
                permissions: manifest.permissions.unwrap_or_default(),
                error: Some(format!("Entry file '{}' not found", manifest.entry)),
            });
            continue;
        }

        mods.push(ModEntry {
            path: path.to_string_lossy().to_string(),
            name: manifest.name,
            version: manifest.version,
            mod_type: manifest.mod_type,
            entry: manifest.entry,
            description: manifest.description,
            author: manifest.author,
            litetify_api_version: manifest.litetify_api_version,
            permissions: manifest.permissions.unwrap_or_default(),
            error: None,
        });
    }

    mods
}

pub fn read_mod_file(mod_path: &str, file_path: &str) -> Result<String, String> {
    let base = mods_path();
    eprintln!("[mods] read_mod_file: base={:?}, mod_path={:?}, file_path={:?}", base, mod_path, file_path);
    
    // Normalize path separators for comparison
    let base_str = base.to_string_lossy().replace('\\', "/");
    let mod_str = mod_path.replace('\\', "/");
    
    if !mod_str.starts_with(&base_str) {
        return Err(format!("Access denied: mod path '{}' is not inside mods directory '{}'", mod_path, base.display()));
    }
    
    // The full path is just mod_path + file_path (both are real paths from the filesystem)
    let entry_file = PathBuf::from(mod_path).join(file_path);
    eprintln!("[mods] read_mod_file: entry_file={:?}, exists={}", entry_file, entry_file.exists());
    
    if !entry_file.exists() {
        return Err(format!("Entry file '{}' not found in {}", file_path, mod_path));
    }
    
    // Security: ensure the resolved path doesn't escape the mod directory
    let entry_str = entry_file.to_string_lossy().replace('\\', "/");
    if !entry_str.starts_with(&mod_str) {
        return Err("Path traversal denied".into());
    }
    
    fs::read_to_string(&entry_file).map_err(|e| format!("Failed to read {}: {}", entry_file.display(), e))
}

pub fn mods_path() -> PathBuf {
    // 1. Environment variable override
    if let Ok(env_path) = std::env::var("LITETIFY_MODS_DIR") {
        let p = PathBuf::from(&env_path);
        if p.exists() {
            return p;
        }
    }

    let exe = std::env::current_exe().unwrap_or_else(|_| PathBuf::new());
    let exe_dir = exe.parent().unwrap_or(std::path::Path::new(".")).to_path_buf();

    let cwd = std::env::current_dir().unwrap_or_default();
    let cwd_mods = cwd.join("mods");

    // 2. CWD (project root during `tauri dev`)
    if cwd_mods.exists() {
        return cwd_mods;
    }

    // 3. Walk up from executable directory looking for mods/ with actual content
    let mut search = exe_dir.clone();
    for _ in 0..15 {
        let candidate = search.join("mods");
        if candidate.exists() && has_manifests(&candidate) {
            return candidate;
        }
        if !search.pop() {
            break;
        }
    }

    // 4. Fallback next to executable
    let fallback = exe_dir.join("mods");
    if fallback.exists() && has_manifests(&fallback) {
        return fallback;
    }

    // 5. Last resort: create and return CWD/mods
    cwd_mods
}

fn has_manifests(dir: &PathBuf) -> bool {
    fs::read_dir(dir)
        .map(|entries| {
            entries.filter_map(|e| e.ok()).any(|e| {
                e.path().is_dir() && e.path().join("manifest.json").exists()
            })
        })
        .unwrap_or(false)
}
