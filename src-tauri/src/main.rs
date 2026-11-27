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

// Only these fixed URLs, so the UI can't make it open anything else.
#[tauri::command]
fn open_link(site: String) -> Result<(), String> {
    let url = match site.as_str() {
        "dev" => "https://developer.hypixel.net/dashboard",
        "exotic" => "https://discord.gg/wmrCckpaee",
        "seymour" => "https://discord.gg/pq3pmmJwZY",
        "crystal" => "https://discord.gg/3jYaB53vtC",
        _ => return Err("unknown link".into()),
    };
    std::process::Command::new("explorer").arg(url).spawn().map_err(|e| e.to_string())?;
    Ok(())
}

// Reads SeymourAnalyzer's collection.json. Default: the vanilla launcher's .minecraft; a folder means its collection.json.
// Only that file name, so the UI can't read any other file.
#[tauri::command]
fn read_seymour(path: Option<String>) -> Result<String, String> {
    let p = match path.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        Some(s) => PathBuf::from(s),
        None => PathBuf::from(std::env::var("APPDATA").map_err(|e| e.to_string())?).join(".minecraft").join("config").join("seymouranalyzer").join("collection.json"),
    };
    let p = if p.is_dir() { p.join("collection.json") } else { p };
    if p.file_name().and_then(|n| n.to_str()) != Some("collection.json") {
        return Err("Pick SeymourAnalyzer's collection.json (in .minecraft/config/seymouranalyzer)".into());
    }
    fs::read_to_string(&p).map_err(|e| format!("{}: {}", p.display(), e))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![load_data, save_data, data_file, open_data_dir, open_kofi, open_link, read_seymour])
        .run(tauri::generate_context!())
        .expect("error while running Skyblock Tracker");
}
