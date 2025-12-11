use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};
use dirs;

/// Main application configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    /// AI persona name (default: Joshua)
    pub persona_name: String,
    /// User's name for personalized responses
    #[serde(default = "default_user_name")]
    pub user_name: String,
    /// AI provider (openai, anthropic, gemini)
    pub ai_provider: String,
    /// AI API key
    pub api_key: Option<String>,
    /// AI model to use
    pub ai_model: String,
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
    /// Custom data folder path (None = default Desktop/WOPR)
    #[serde(default)]
    pub data_folder_path: Option<String>,
}

fn default_user_name() -> String {
    "Player".to_string()
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
            user_name: "Player".to_string(),
            ai_provider: "openai".to_string(),
            api_key: None,
            ai_model: "gpt-4o-mini".to_string(),
            capture_interval_ms: 30000,
            vision_enabled: false,  // Default OFF - requires permission
            voice_enabled: false,   // Default OFF - requires permission
            wake_word: "Joshua".to_string(),
            current_mode: "assistant".to_string(),
            launch_on_startup: true,
            always_on_top: false,
            theme: ThemeConfig::default(),
            data_folder_path: None,
        }
    }
}

/// Get the default data folder (Desktop/WOPR)
fn get_default_data_folder() -> PathBuf {
    dirs::desktop_dir()
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| PathBuf::from(".")))
        .join("WOPR")
}

/// Get the user's configured data folder or default
fn get_data_folder(config: &AppConfig) -> PathBuf {
    match &config.data_folder_path {
        Some(path) if !path.is_empty() => PathBuf::from(path),
        _ => get_default_data_folder(),
    }
}

/// Get the internal app data directory (for config only)
fn get_internal_app_dir(app: &AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
}

/// Get the config file path (always in internal app dir)
fn get_config_path(app: &AppHandle) -> PathBuf {
    get_internal_app_dir(app).join("config.yaml")
}

/// Get the brain directory path (in user's data folder)
fn get_brain_dir(config: &AppConfig) -> PathBuf {
    get_data_folder(config).join("brain")
}

/// Get the plugins directory path (in user's data folder)
fn get_plugins_dir(config: &AppConfig) -> PathBuf {
    get_data_folder(config).join("plugins")
}

/// Get the captures directory path (in user's data folder)
fn get_captures_dir(config: &AppConfig) -> PathBuf {
    get_data_folder(config).join("captures")
}

/// Get the logs directory path (in user's data folder)
fn get_logs_dir(config: &AppConfig) -> PathBuf {
    get_data_folder(config).join("logs")
}

/// Ensure internal app directory exists
fn ensure_internal_dir(app: &AppHandle) -> Result<(), String> {
    let dir = get_internal_app_dir(app);
    fs::create_dir_all(&dir).map_err(|e| format!("Failed to create {}: {}", dir.display(), e))?;
    Ok(())
}

/// Ensure all required data directories exist
pub fn ensure_data_directories(config: &AppConfig) -> Result<(), String> {
    let dirs = [
        get_data_folder(config),
        get_brain_dir(config),
        get_plugins_dir(config),
        get_captures_dir(config),
        get_logs_dir(config),
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
    ensure_internal_dir(&app)?;
    ensure_data_directories(&config)?;

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
        "user_name" => config.user_name = value,
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
    let config = load_config(app.clone());
    Ok(DataPaths {
        data_folder: get_data_folder(&config).to_string_lossy().to_string(),
        config_file: get_config_path(&app).to_string_lossy().to_string(),
        brain_dir: get_brain_dir(&config).to_string_lossy().to_string(),
        plugins_dir: get_plugins_dir(&config).to_string_lossy().to_string(),
        captures_dir: get_captures_dir(&config).to_string_lossy().to_string(),
        logs_dir: get_logs_dir(&config).to_string_lossy().to_string(),
        default_folder: get_default_data_folder().to_string_lossy().to_string(),
    })
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DataPaths {
    pub data_folder: String,
    pub config_file: String,
    pub brain_dir: String,
    pub plugins_dir: String,
    pub captures_dir: String,
    pub logs_dir: String,
    pub default_folder: String,
}

/// Save data to brain (conversation history, notes, etc.)
#[tauri::command]
pub fn save_brain_data(app: AppHandle, filename: String, content: String) -> Result<(), String> {
    let config = load_config(app.clone());
    ensure_data_directories(&config)?;

    let path = get_brain_dir(&config).join(&filename);
    fs::write(&path, content).map_err(|e| e.to_string())
}

/// Load data from brain
#[tauri::command]
pub fn load_brain_data(app: AppHandle, filename: String) -> Result<Option<String>, String> {
    let config = load_config(app);
    let path = get_brain_dir(&config).join(&filename);

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
    let config = load_config(app);
    let path = get_brain_dir(&config);

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
    ensure_internal_dir(app)?;

    // Create default config if it doesn't exist
    let config_path = get_config_path(app);
    if !config_path.exists() {
        let default_config = AppConfig::default();
        let yaml = serde_yaml::to_string(&default_config).map_err(|e| e.to_string())?;
        fs::write(&config_path, yaml).map_err(|e| e.to_string())?;
    }

    // Load config and ensure data directories
    let config = load_config(app.clone());
    ensure_data_directories(&config)?;

    Ok(())
}

/// Change data folder and optionally migrate existing data
#[tauri::command]
pub fn change_data_folder(app: AppHandle, new_path: String, migrate: bool) -> Result<(), String> {
    let mut config = load_config(app.clone());
    let old_folder = get_data_folder(&config);
    let new_folder = PathBuf::from(&new_path);

    // If migrate is true and old folder exists, copy data
    if migrate && old_folder.exists() && old_folder != new_folder {
        copy_dir_recursive(&old_folder, &new_folder)?;
    }

    // Update config
    config.data_folder_path = Some(new_path);
    save_config(app, config)?;

    Ok(())
}

/// Recursively copy directory contents
fn copy_dir_recursive(src: &PathBuf, dst: &PathBuf) -> Result<(), String> {
    if !src.exists() {
        return Ok(());
    }

    fs::create_dir_all(dst).map_err(|e| format!("Failed to create directory {}: {}", dst.display(), e))?;

    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)
                .map_err(|e| format!("Failed to copy {}: {}", src_path.display(), e))?;
        }
    }

    Ok(())
}

