use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Serialize, Deserialize)]
struct HttpResponse {
    status: u16,
    data: serde_json::Value,
    ok: bool,
}

#[tauri::command]
async fn http_get(url: String) -> Result<HttpResponse, String> {
    let client = reqwest::Client::new();
    let response = client.get(&url).send().await.map_err(|e| e.to_string())?;
    
    let status = response.status().as_u16();
    let ok = response.status().is_success();
    let text = response.text().await.map_err(|e| e.to_string())?;
    
    let data: serde_json::Value = serde_json::from_str(&text)
        .unwrap_or_else(|_| serde_json::Value::String(text));
    
    Ok(HttpResponse { status, data, ok })
}

#[tauri::command]
async fn http_post(url: String, body: serde_json::Value, headers: Option<HashMap<String, String>>) -> Result<HttpResponse, String> {
    let client = reqwest::Client::new();
    let mut request = client.post(&url);
    
    if let Some(headers_map) = headers {
        for (key, value) in headers_map {
            request = request.header(&key, &value);
        }
    }
    
    let response = request.json(&body).send().await.map_err(|e| e.to_string())?;
    
    let status = response.status().as_u16();
    let ok = response.status().is_success();
    let text = response.text().await.map_err(|e| e.to_string())?;
    
    let data: serde_json::Value = serde_json::from_str(&text)
        .unwrap_or_else(|_| serde_json::Value::String(text));
    
    Ok(HttpResponse { status, data, ok })
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, http_get, http_post])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
