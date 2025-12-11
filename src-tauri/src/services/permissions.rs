use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PermissionStatus {
    pub screen_recording: PermissionState,
    pub microphone: PermissionState,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum PermissionState {
    Granted,
    Denied,
    NotDetermined,
    Restricted,
    Unknown,
}

/// Check all permission statuses
#[tauri::command]
pub fn check_permissions() -> PermissionStatus {
    PermissionStatus {
        screen_recording: check_screen_recording_permission(),
        microphone: check_microphone_permission(),
    }
}

/// Check screen recording permission status
#[tauri::command]
pub fn check_screen_recording_permission() -> PermissionState {
    #[cfg(target_os = "macos")]
    {
        check_macos_screen_recording()
    }
    #[cfg(target_os = "windows")]
    {
        // Windows doesn't require explicit screen recording permission
        PermissionState::Granted
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        PermissionState::Unknown
    }
}

/// Check microphone permission status
#[tauri::command]
pub fn check_microphone_permission() -> PermissionState {
    // Microphone is handled by the browser's Web Speech API
    // The browser will prompt for permission automatically
    // We can't check this from Rust, so we return Unknown
    // and handle it in the frontend
    PermissionState::Unknown
}

/// Request to open system preferences for screen recording
#[tauri::command]
pub fn open_screen_recording_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture")
            .spawn()
            .map_err(|e| format!("Failed to open settings: {}", e))?;
        Ok(())
    }
    #[cfg(target_os = "windows")]
    {
        // Windows doesn't have a specific screen recording settings page
        Ok(())
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Err("Not supported on this platform".to_string())
    }
}

/// Request to open system preferences for microphone
#[tauri::command]
pub fn open_microphone_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone")
            .spawn()
            .map_err(|e| format!("Failed to open settings: {}", e))?;
        Ok(())
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("ms-settings:privacy-microphone")
            .spawn()
            .map_err(|e| format!("Failed to open settings: {}", e))?;
        Ok(())
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Err("Not supported on this platform".to_string())
    }
}

/// Open general privacy settings
#[tauri::command]
pub fn open_privacy_settings() -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg("x-apple.systempreferences:com.apple.preference.security?Privacy")
            .spawn()
            .map_err(|e| format!("Failed to open settings: {}", e))?;
        Ok(())
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("ms-settings:privacy")
            .spawn()
            .map_err(|e| format!("Failed to open settings: {}", e))?;
        Ok(())
    }
    #[cfg(not(any(target_os = "macos", target_os = "windows")))]
    {
        Err("Not supported on this platform".to_string())
    }
}

#[cfg(target_os = "macos")]
fn check_macos_screen_recording() -> PermissionState {
    // Try to capture a tiny portion of screen to test permission
    // If it fails, permission is likely denied
    // This is a heuristic since macOS doesn't provide a direct API to check

    // We can use CGPreflightScreenCaptureAccess (macOS 10.15+)
    // but that requires linking to CoreGraphics
    // For now, we'll try a test capture

    match screenshots::Screen::all() {
        Ok(screens) => {
            if let Some(screen) = screens.first() {
                match screen.capture() {
                    Ok(_) => PermissionState::Granted,
                    Err(_) => PermissionState::Denied,
                }
            } else {
                PermissionState::Unknown
            }
        }
        Err(_) => PermissionState::Denied,
    }
}

/// Test if screen capture actually works (more reliable than permission check)
#[tauri::command]
pub fn test_screen_capture() -> Result<bool, String> {
    match screenshots::Screen::all() {
        Ok(screens) => {
            if let Some(screen) = screens.first() {
                match screen.capture() {
                    Ok(img) => {
                        // Check if we got a real image (not a blank/placeholder)
                        // A real capture should have varied pixel data
                        let data = img.to_vec();
                        if data.len() > 100 {
                            // Check if it's not all zeros or all same value
                            let first_pixel = data.get(0).unwrap_or(&0);
                            let has_variation = data.iter().take(1000).any(|p| p != first_pixel);
                            Ok(has_variation)
                        } else {
                            Ok(false)
                        }
                    }
                    Err(e) => {
                        eprintln!("Screen capture test failed: {}", e);
                        Ok(false)
                    }
                }
            } else {
                Ok(false)
            }
        }
        Err(e) => {
            eprintln!("Failed to get screens: {}", e);
            Ok(false)
        }
    }
}
