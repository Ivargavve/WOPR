use base64::{engine::general_purpose::STANDARD, Engine};
use image::codecs::jpeg::JpegEncoder;
use screenshots::Screen;
use std::io::Cursor;

/// Capture the primary screen and return as base64 JPEG
/// Quality is reduced to keep the data size manageable for AI APIs
#[tauri::command]
pub fn capture_screen() -> Result<String, String> {
    // Get all screens
    let screens = Screen::all().map_err(|e| format!("Failed to get screens: {}", e))?;

    // Use primary screen (first one)
    let screen = screens.first().ok_or("No screens found")?;

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
