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
    let full_path = PathBuf::from(mod_path).join(file_path);
    fs::read_to_string(&full_path).map_err(|e| format!("Failed to read {}: {}", full_path.display(), e))
}

pub fn mods_path() -> PathBuf {
    let exe = std::env::current_exe().unwrap_or_default();
    let exe_dir = exe.parent().unwrap_or(std::path::Path::new("."));
    let path = exe_dir.to_path_buf();
    // during development, look for mods/ next to source
    if cfg!(debug_assertions) {
        let cwd = std::env::current_dir().unwrap_or_default();
        let dev_mods = cwd.join("mods");
        if dev_mods.exists() {
            return dev_mods;
        }
    }
    path.join("mods")
}
