use tauri::State;

use crate::file_service::{self, OpenedFile};
use crate::AppState;

#[tauri::command]
pub async fn get_startup_file(state: State<'_, AppState>) -> Result<Option<OpenedFile>, String> {
    let startup = {
        let mut guard = state.startup_file.lock().unwrap();
        guard.take()
    };
    let Some((path, preview)) = startup else {
        return Ok(None);
    };
    let content = tauri::async_runtime::spawn_blocking({
        let path = path.clone();
        move || file_service::read_file(&path)
    })
    .await
    .map_err(|e| e.to_string())??;
    Ok(Some(OpenedFile { path, content, preview }))
}

/// Escape hatch for quitting. `Window::destroy` is a core command gated behind the
/// ACL, so a missing capability silently wedges the window shut once a close has
/// been preventDefault-ed; an app-defined command like this one is always callable.
#[tauri::command]
pub fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
pub async fn read_file_at_path(path: String) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || file_service::read_file(&path))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn open_file_dialog() -> Result<Option<OpenedFile>, String> {
    tauri::async_runtime::spawn_blocking(file_service::open_file_via_dialog)
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn save_file(path: String, content: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || file_service::write_file(&path, &content))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
pub async fn save_file_as(
    content: String,
    default_name: Option<String>,
) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        file_service::save_file_as_via_dialog(&content, default_name.as_deref())
    })
    .await
    .map_err(|e| e.to_string())?
}
