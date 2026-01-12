mod services;

use services::{activity_tracker, capture, permissions, storage, system_info, window};
use tauri::Manager;
use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri_plugin_autostart::MacosLauncher;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .manage(system_info::SystemMonitor::new())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init());

    // Add macOS-specific plugins
    #[cfg(target_os = "macos")]
    {
        builder = builder.plugin(tauri_plugin_macos_permissions::init());
    }

    // Add autostart plugin (works on both macOS and Windows)
    builder = builder.plugin(tauri_plugin_autostart::init(
        MacosLauncher::LaunchAgent,
        Some(vec!["--minimized"]),
    ));

    builder
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
            storage::change_data_folder,
            capture::capture_screen,
            capture::get_screen_info,
            capture::get_available_screens,
            permissions::check_permissions,
            permissions::check_screen_recording_permission,
            permissions::check_microphone_permission,
            permissions::open_screen_recording_settings,
            permissions::open_microphone_settings,
            permissions::open_privacy_settings,
            permissions::test_screen_capture,
            system_info::get_system_stats,
            activity_tracker::track_activity,
            activity_tracker::get_activity_stats,
            activity_tracker::reset_activity_today,
            storage::load_pomodoro_settings,
            storage::save_pomodoro_settings,
            storage::load_color_theme,
            storage::save_color_theme,
            storage::load_cozy_theme,
            storage::save_cozy_theme,
            storage::get_autostart_enabled,
            storage::set_autostart_enabled,
        ])
        .setup(|app| {
            // Initialize storage directories and default config
            if let Err(e) = storage::init_storage(app.handle()) {
                eprintln!("Failed to initialize storage: {}", e);
            }

            // Initialize activity tracker with captures directory from user config
            let config = storage::load_config(app.handle().clone());
            let captures_dir = storage::get_captures_dir(&config);
            app.manage(activity_tracker::ActivityTracker::new(captures_dir));

            // Initialize autostart based on config (enable by default on first run)
            {
                use tauri_plugin_autostart::ManagerExt;
                let autostart = app.autolaunch();
                if config.launch_on_startup {
                    if let Err(e) = autostart.enable() {
                        eprintln!("Failed to enable autostart: {}", e);
                    }
                }
            }

            // Set up system tray icon with menu
            let show_item = MenuItem::with_id(app, "show", "Show WOPR", true, None::<&str>)?;
            let hide_item = MenuItem::with_id(app, "hide", "Hide WOPR", true, None::<&str>)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

            let menu = Menu::with_items(app, &[&show_item, &hide_item, &quit_item])?;

            let _tray = TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| {
                    match event.id.as_ref() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "hide" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.hide();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    // Left click on tray icon toggles window visibility
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap_or(false) {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(app)?;

            // Restore window state on startup
            if let Some(window) = app.get_webview_window("main") {
                let config = window::load_window_config(app.handle());

                // Check if saved position is on an available monitor
                let monitors: Vec<_> = window.available_monitors().unwrap_or_default();
                let position_valid = monitors.iter().any(|monitor| {
                    let pos = monitor.position();
                    let size = monitor.size();
                    config.x >= pos.x
                        && config.x < pos.x + size.width as i32
                        && config.y >= pos.y
                        && config.y < pos.y + size.height as i32
                });

                if position_valid {
                    if let Err(e) = window.set_position(tauri::PhysicalPosition::<i32>::new(config.x, config.y))
                    {
                        eprintln!("Failed to restore window position: {}", e);
                    }
                } else {
                    // Position is off-screen, center on primary monitor
                    if let Ok(Some(primary)) = window.primary_monitor() {
                        let pos = primary.position();
                        let size = primary.size();
                        let x = pos.x + (size.width as i32 - config.width as i32) / 2;
                        let y = pos.y + (size.height as i32 - config.height as i32) / 2;
                        let _ = window.set_position(tauri::PhysicalPosition::<i32>::new(x, y));
                    }
                }

                if let Err(e) =
                    window.set_size(tauri::PhysicalSize::new(config.width, config.height))
                {
                    eprintln!("Failed to restore window size: {}", e);
                }

                // Restore fullscreen state
                if config.is_fullscreen {
                    if let Err(e) = window.set_fullscreen(true) {
                        eprintln!("Failed to restore fullscreen: {}", e);
                    }
                }

                // Restore borderless state
                if config.is_borderless {
                    if let Err(e) = window.set_decorations(false) {
                        eprintln!("Failed to restore borderless: {}", e);
                    }
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
