#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{fs, path::PathBuf};
use tauri::Manager;

fn data_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("data.json"))
}

#[tauri::command]
fn load_data(app: tauri::AppHandle) -> Result<String, String> {
    let p = data_path(&app)?;
    if !p.exists() {
        return Ok(String::new());
    }
    fs::read_to_string(p).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_data(app: tauri::AppHandle, json: String) -> Result<(), String> {
    let p = data_path(&app)?;
    // write to a temp file then swap, so a crash mid-write never corrupts data.json
    let tmp = p.with_extension("json.tmp");
    fs::write(&tmp, json).map_err(|e| e.to_string())?;
    if p.exists() {
        fs::copy(&p, p.with_extension("json.bak")).map_err(|e| e.to_string())?;
    }
    fs::rename(&tmp, &p).map_err(|e| e.to_string())
}

#[tauri::command]
fn data_file(app: tauri::AppHandle) -> Result<String, String> {
    Ok(data_path(&app)?.to_string_lossy().into_owned())
}

#[tauri::command]
fn open_data_dir(app: tauri::AppHandle) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::process::Command::new("explorer").arg(dir).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

// Fixed URL on purpose: the UI can't make this open anything else.
#[tauri::command]
fn open_kofi() -> Result<(), String> {
    std::process::Command::new("explorer").arg("https://ko-fi.com/alphagenesis_").spawn().map_err(|e| e.to_string())?;
    Ok(())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![load_data, save_data, data_file, open_data_dir, open_kofi])
        .run(tauri::generate_context!())
        .expect("error while running Skyblock Tracker");
}
