mod commands;
mod file_service;

use std::sync::Mutex;

use tauri::{Emitter, Manager};

pub struct AppState {
    pub startup_file: Mutex<Option<String>>,
}

/// The first CLI argument is the file path Windows passes when the app is
/// launched via double-click or "Open with" on a .md file.
fn startup_file_from_args() -> Option<String> {
    std::env::args().nth(1).filter(|arg| !arg.starts_with('-'))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            let path = argv.into_iter().skip(1).find(|arg| !arg.starts_with('-'));
            if let Some(path) = path {
                let _ = app.emit("open-file", path);
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState {
            startup_file: Mutex::new(startup_file_from_args()),
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_startup_file,
            commands::exit_app,
            commands::read_file_at_path,
            commands::open_file_dialog,
            commands::save_file,
            commands::save_file_as,
        ])
        // Registering a window-event observer (even a no-op one) is required: without any
        // on_window_event handler, this Tauri/WRY version does not reliably exit the process
        // once the window closes, leaving it running in the background.
        .on_window_event(|_window, _event| {})
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
