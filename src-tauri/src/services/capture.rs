use base64::{engine::general_purpose::STANDARD, Engine};
use image::codecs::jpeg::JpegEncoder;
use screenshots::Screen;
use std::io::Cursor;

/// Get list of available screens for capture
#[tauri::command]
pub fn get_available_screens() -> Result<Vec<ScreenCaptureInfo>, String> {
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;

    let screen_infos: Vec<ScreenCaptureInfo> = screens
        .iter()
        .enumerate()
        .map(|(i, screen)| ScreenCaptureInfo {
            index: i,
            name: format!("Display {}", i + 1),
            width: screen.display_info.width,
            height: screen.display_info.height,
            is_primary: screen.display_info.is_primary,
        })
        .collect();

    Ok(screen_infos)
}

#[derive(serde::Serialize)]
pub struct ScreenCaptureInfo {
    pub index: usize,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub is_primary: bool,
}

/// Capture a specific screen and return as base64 JPEG
/// Quality is reduced to keep the data size manageable for AI APIs
#[tauri::command]
pub fn capture_screen(monitor_index: Option<usize>) -> Result<String, String> {
    // Get all screens
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;

    // Use specified monitor or default to primary (index 0)
    let index = monitor_index.unwrap_or(0);
    let screen = screens.get(index).ok_or_else(|| {
        format!("Monitor index {} not found. Available: {}", index, screens.len())
    })?;

    // Capture the screen
    let image = screen
        .capture()
        .map_err(|e| format!("Failed to capture screen: {}", e))?;

    // Convert to smaller JPEG for efficiency
    let rgba_image = image::RgbaImage::from_raw(image.width(), image.height(), image.to_vec())
        .ok_or("Failed to create image buffer")?;

    // Resize to max 1280px width to reduce data size
    let resized = if rgba_image.width() > 1280 {
        let scale = 1280.0 / rgba_image.width() as f32;
        let new_height = (rgba_image.height() as f32 * scale) as u32;
        image::imageops::resize(
            &rgba_image,
            1280,
            new_height,
            image::imageops::FilterType::Triangle,
        )
    } else {
        rgba_image
    };

    // Convert to RGB (JPEG doesn't support alpha)
    let rgb_image = image::DynamicImage::ImageRgba8(resized).to_rgb8();

    // Encode as JPEG with moderate quality
    let mut buffer = Cursor::new(Vec::new());
    let encoder = JpegEncoder::new_with_quality(&mut buffer, 60);
    rgb_image
        .write_with_encoder(encoder)
        .map_err(|e| format!("Failed to encode JPEG: {}", e))?;

    // Convert to base64
    let base64_string = STANDARD.encode(buffer.into_inner());

    Ok(base64_string)
}

/// Capture screen and return dimensions info
#[tauri::command]
pub fn get_screen_info() -> Result<ScreenInfo, String> {
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;

    let screen = screens.first().ok_or("No screens found")?;

    Ok(ScreenInfo {
        width: screen.display_info.width,
        height: screen.display_info.height,
        scale_factor: screen.display_info.scale_factor,
    })
}

#[derive(serde::Serialize)]
pub struct ScreenInfo {
    pub width: u32,
    pub height: u32,
    pub scale_factor: f32,
}
