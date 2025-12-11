mod services;

use services::{storage, window};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            window::get_window_state,
            window::save_window_state,
            window::restore_window_state,
            window::set_borderless_fullscreen,
            window::set_always_on_top,
            window::get_available_displays,
            window::move_to_display,
            storage::load_config,
            storage::save_config,
            storage::update_config_value,
            storage::get_data_paths,
            storage::save_brain_data,
            storage::load_brain_data,
            storage::list_brain_files,
        ])
        .setup(|app| {
            // Initialize storage directories and default config
            if let Err(e) = storage::init_storage(app.handle()) {
                eprintln!("Failed to initialize storage: {}", e);
            }

            // Restore window state on startup
            if let Some(window) = app.get_webview_window("main") {
                let config = window::load_window_config(app.handle());
                if let Err(e) = window.set_position(tauri::PhysicalPosition::<i32>::new(config.x, config.y))
                {
                    eprintln!("Failed to restore window position: {}", e);
                }
                if let Err(e) =
                    window.set_size(tauri::PhysicalSize::new(config.width, config.height))
                {
                    eprintln!("Failed to restore window size: {}", e);
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // Save window state when moved or resized
            match event {
                tauri::WindowEvent::Moved(_) | tauri::WindowEvent::Resized(_) => {
                    if let Ok(position) = window.outer_position() {
                        if let Ok(size) = window.inner_size() {
                            let config = window::WindowConfig {
                                x: position.x,
                                y: position.y,
                                width: size.width,
                                height: size.height,
                                display_id: None,
                                is_fullscreen: window.is_fullscreen().unwrap_or(false),
                                is_borderless: !window.is_decorated().unwrap_or(true),
                            };
                            if let Err(e) = window::save_window_config(window.app_handle(), &config)
                            {
                                eprintln!("Failed to save window config: {}", e);
                            }
                        }
                    }
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
