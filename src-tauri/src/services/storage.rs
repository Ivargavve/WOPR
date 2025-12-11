use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

/// Main application configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    /// AI persona name (default: Joshua)
    pub persona_name: String,
    /// Google Gemini API key
    pub api_key: Option<String>,
    /// Screen capture interval in milliseconds
    pub capture_interval_ms: u32,
    /// Whether vision/screen observation is enabled
    pub vision_enabled: bool,
    /// Whether voice activation is enabled
    pub voice_enabled: bool,
    /// Wake word for voice activation
    pub wake_word: String,
    /// Current display mode
    pub current_mode: String,
    /// Launch on system startup
    pub launch_on_startup: bool,
    /// Always on top setting
    pub always_on_top: bool,
    /// Theme settings
    pub theme: ThemeConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThemeConfig {
    /// Scanlines effect enabled
    pub scanlines: bool,
    /// Screen flicker effect enabled
    pub flicker: bool,
    /// Glow intensity (0.0 - 1.0)
    pub glow_intensity: f32,
}

impl Default for ThemeConfig {
    fn default() -> Self {
        Self {
            scanlines: true,
            flicker: false,
            glow_intensity: 0.8,
        }
    }
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            persona_name: "Joshua".to_string(),
            api_key: None,
            capture_interval_ms: 5000,
            vision_enabled: true,
            voice_enabled: true,
            wake_word: "Joshua".to_string(),
            current_mode: "assistant".to_string(),
            launch_on_startup: true,
            always_on_top: false,
            theme: ThemeConfig::default(),
        }
    }
}

/// Get the app data directory
fn get_app_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
}

/// Get the config file path
fn get_config_path(app: &AppHandle) -> PathBuf {
    get_app_dir(app).join("config.yaml")
}

/// Get the brain directory path
fn get_brain_dir(app: &AppHandle) -> PathBuf {
    get_app_dir(app).join("brain")
}

/// Get the plugins directory path
fn get_plugins_dir(app: &AppHandle) -> PathBuf {
    get_app_dir(app).join("plugins")
}

/// Get the captures directory path
fn get_captures_dir(app: &AppHandle) -> PathBuf {
    get_app_dir(app).join("captures")
}

/// Ensure all required directories exist
pub fn ensure_directories(app: &AppHandle) -> Result<(), String> {
    let dirs = [
        get_app_dir(app),
        get_brain_dir(app),
        get_plugins_dir(app),
        get_captures_dir(app),
    ];

    for dir in dirs {
        fs::create_dir_all(&dir).map_err(|e| format!("Failed to create {}: {}", dir.display(), e))?;
    }

    Ok(())
}

/// Load application configuration
#[tauri::command]
pub fn load_config(app: AppHandle) -> AppConfig {
    let path = get_config_path(&app);

    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(config) = serde_yaml::from_str(&content) {
                return config;
            }
        }
    }

    // Return default config if file doesn't exist or is invalid
    AppConfig::default()
}

/// Save application configuration
#[tauri::command]
pub fn save_config(app: AppHandle, config: AppConfig) -> Result<(), String> {
    ensure_directories(&app)?;

    let path = get_config_path(&app);
    let yaml = serde_yaml::to_string(&config).map_err(|e| e.to_string())?;
    fs::write(&path, yaml).map_err(|e| e.to_string())?;

    Ok(())
}

/// Update a single config value
#[tauri::command]
pub fn update_config_value(app: AppHandle, key: String, value: String) -> Result<(), String> {
    let mut config = load_config(app.clone());

    match key.as_str() {
        "persona_name" => config.persona_name = value,
        "api_key" => config.api_key = if value.is_empty() { None } else { Some(value) },
        "capture_interval_ms" => {
            config.capture_interval_ms = value.parse().map_err(|_| "Invalid number")?
        }
        "vision_enabled" => {
            config.vision_enabled = value.parse().map_err(|_| "Invalid boolean")?
        }
        "voice_enabled" => {
            config.voice_enabled = value.parse().map_err(|_| "Invalid boolean")?
        }
        "wake_word" => config.wake_word = value,
        "current_mode" => config.current_mode = value,
        "launch_on_startup" => {
            config.launch_on_startup = value.parse().map_err(|_| "Invalid boolean")?
        }
        "always_on_top" => {
            config.always_on_top = value.parse().map_err(|_| "Invalid boolean")?
        }
        _ => return Err(format!("Unknown config key: {}", key)),
    }

    save_config(app, config)
}

/// Get application data paths
#[tauri::command]
pub fn get_data_paths(app: AppHandle) -> Result<DataPaths, String> {
    Ok(DataPaths {
        app_dir: get_app_dir(&app).to_string_lossy().to_string(),
        config_file: get_config_path(&app).to_string_lossy().to_string(),
        brain_dir: get_brain_dir(&app).to_string_lossy().to_string(),
        plugins_dir: get_plugins_dir(&app).to_string_lossy().to_string(),
        captures_dir: get_captures_dir(&app).to_string_lossy().to_string(),
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataPaths {
    pub app_dir: String,
    pub config_file: String,
    pub brain_dir: String,
    pub plugins_dir: String,
    pub captures_dir: String,
}

/// Save data to brain (conversation history, notes, etc.)
#[tauri::command]
pub fn save_brain_data(app: AppHandle, filename: String, content: String) -> Result<(), String> {
    ensure_directories(&app)?;

    let path = get_brain_dir(&app).join(&filename);
    fs::write(&path, content).map_err(|e| e.to_string())
}

/// Load data from brain
#[tauri::command]
pub fn load_brain_data(app: AppHandle, filename: String) -> Result<Option<String>, String> {
    let path = get_brain_dir(&app).join(&filename);

    if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
        Ok(Some(content))
    } else {
        Ok(None)
    }
}

/// List files in brain directory
#[tauri::command]
pub fn list_brain_files(app: AppHandle) -> Result<Vec<String>, String> {
    let path = get_brain_dir(&app);

    if !path.exists() {
        return Ok(vec![]);
    }

    let files: Vec<String> = fs::read_dir(&path)
        .map_err(|e| e.to_string())?
        .filter_map(|entry| {
            entry.ok().and_then(|e| {
                if e.path().is_file() {
                    e.file_name().to_str().map(|s| s.to_string())
                } else {
                    None
                }
            })
        })
        .collect();

    Ok(files)
}

/// Initialize storage on app startup
pub fn init_storage(app: &AppHandle) -> Result<(), String> {
    ensure_directories(app)?;

    // Create default config if it doesn't exist
    let config_path = get_config_path(app);
    if !config_path.exists() {
        let default_config = AppConfig::default();
        let yaml = serde_yaml::to_string(&default_config).map_err(|e| e.to_string())?;
        fs::write(&config_path, yaml).map_err(|e| e.to_string())?;
    }

    Ok(())
}
