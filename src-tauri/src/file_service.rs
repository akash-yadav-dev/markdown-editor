use std::fs;
use std::path::PathBuf;

use serde::Serialize;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenedFile {
    pub path: String,
    pub content: String,
    pub preview: bool,
}

pub fn read_file(path: &str) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| format!("Failed to read {path}: {e}"))
}

pub fn write_file(path: &str, content: &str) -> Result<(), String> {
    fs::write(path, content).map_err(|e| format!("Failed to write {path}: {e}"))
}

fn pick_open_path() -> Option<PathBuf> {
    rfd::FileDialog::new()
        .add_filter("Markdown", &["md", "markdown"])
        .add_filter("All Files", &["*"])
        .pick_file()
}

fn pick_save_path(default_name: Option<&str>) -> Option<PathBuf> {
    let mut dialog = rfd::FileDialog::new().add_filter("Markdown", &["md"]);
    if let Some(name) = default_name {
        dialog = dialog.set_file_name(name);
    }
    dialog.save_file()
}

pub fn open_file_via_dialog() -> Result<Option<OpenedFile>, String> {
    let Some(path) = pick_open_path() else {
        return Ok(None);
    };
    let path = path.to_string_lossy().to_string();
    let content = read_file(&path)?;
    Ok(Some(OpenedFile { path, content, preview: false }))
}

pub fn save_file_as_via_dialog(
    content: &str,
    default_name: Option<&str>,
) -> Result<Option<String>, String> {
    let Some(path) = pick_save_path(default_name) else {
        return Ok(None);
    };
    let path = path.to_string_lossy().to_string();
    write_file(&path, content)?;
    Ok(Some(path))
}
