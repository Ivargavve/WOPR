use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager, PhysicalPosition, PhysicalSize, WebviewWindow};

/// Window position and size configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WindowConfig {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub display_id: Option<String>,
    pub is_fullscreen: bool,
    pub is_borderless: bool,
}

impl Default for WindowConfig {
    fn default() -> Self {
        Self {
            x: 100,
            y: 100,
            width: 480,
            height: 800,
            display_id: None,
            is_fullscreen: false,
            is_borderless: false,
        }
    }
}

/// Display information
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DisplayInfo {
    pub id: String,
    pub name: String,
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
    pub is_primary: bool,
}

/// Get the config file path
fn get_config_path(app: &AppHandle) -> PathBuf {
    let app_dir = app
        .path()
        .app_config_dir()
        .unwrap_or_else(|_| PathBuf::from("."));
    app_dir.join("window_config.json")
}

/// Save window configuration to disk
pub fn save_window_config(app: &AppHandle, config: &WindowConfig) -> Result<(), String> {
    let path = get_config_path(app);

    // Ensure parent directory exists
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let json = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;

    Ok(())
}

/// Load window configuration from disk
pub fn load_window_config(app: &AppHandle) -> WindowConfig {
    let path = get_config_path(app);

    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(config) = serde_json::from_str(&content) {
                return config;
            }
        }
    }

    WindowConfig::default()
}

/// Get current window position and size
#[tauri::command]
pub fn get_window_state(window: WebviewWindow) -> Result<WindowConfig, String> {
    let position = window.outer_position().map_err(|e| e.to_string())?;
    let size = window.inner_size().map_err(|e| e.to_string())?;
    let is_fullscreen = window.is_fullscreen().unwrap_or(false);
    let is_decorated = window.is_decorated().unwrap_or(true);

    Ok(WindowConfig {
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        display_id: None,
        is_fullscreen,
        is_borderless: !is_decorated,
    })
}

/// Save current window state to config
#[tauri::command]
pub fn save_window_state(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    let config = get_window_state(window)?;
    save_window_config(&app, &config)
}

/// Restore window position from saved config
#[tauri::command]
pub fn restore_window_state(app: AppHandle, window: WebviewWindow) -> Result<(), String> {
    let config = load_window_config(&app);

    window
        .set_position(PhysicalPosition::new(config.x, config.y))
        .map_err(|e| e.to_string())?;

    window
        .set_size(PhysicalSize::new(config.width, config.height))
        .map_err(|e| e.to_string())?;

    if config.is_fullscreen {
        window.set_fullscreen(true).map_err(|e| e.to_string())?;
    }

    if config.is_borderless {
        window.set_decorations(false).map_err(|e| e.to_string())?;
    }

    Ok(())
}

/// Set window to borderless fullscreen mode
#[tauri::command]
pub fn set_borderless_fullscreen(window: WebviewWindow, enabled: bool) -> Result<(), String> {
    if enabled {
        window.set_decorations(false).map_err(|e| e.to_string())?;
        window.set_fullscreen(true).map_err(|e| e.to_string())?;
    } else {
        window.set_fullscreen(false).map_err(|e| e.to_string())?;
        window.set_decorations(true).map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Toggle always on top
#[tauri::command]
pub fn set_always_on_top(window: WebviewWindow, enabled: bool) -> Result<(), String> {
    window
        .set_always_on_top(enabled)
        .map_err(|e| e.to_string())
}

/// Get list of available displays
#[tauri::command]
pub fn get_available_displays(window: WebviewWindow) -> Result<Vec<DisplayInfo>, String> {
    let monitors = window.available_monitors().map_err(|e| e.to_string())?;
    let primary = window.primary_monitor().map_err(|e| e.to_string())?;

    let displays: Vec<DisplayInfo> = monitors
        .iter()
        .enumerate()
        .map(|(i, monitor)| {
            let position = monitor.position();
            let size = monitor.size();
            let name = monitor.name().cloned().unwrap_or_else(|| "Unknown".to_string());
            let is_primary = primary
                .as_ref()
                .map(|p| p.name() == monitor.name())
                .unwrap_or(false);

            DisplayInfo {
                id: format!("display_{}", i),
                name,
                x: position.x,
                y: position.y,
                width: size.width,
                height: size.height,
                is_primary,
            }
        })
        .collect();

    Ok(displays)
}

/// Move window to specific display
#[tauri::command]
pub fn move_to_display(window: WebviewWindow, display_index: usize) -> Result<(), String> {
    let monitors: Vec<_> = window
        .available_monitors()
        .map_err(|e| e.to_string())?
        .into_iter()
        .collect();

    if display_index >= monitors.len() {
        return Err("Display index out of range".to_string());
    }

    let monitor = &monitors[display_index];
    let position = monitor.position();

    window
        .set_position(PhysicalPosition::new(position.x + 50, position.y + 50))
        .map_err(|e| e.to_string())?;

    Ok(())
}
