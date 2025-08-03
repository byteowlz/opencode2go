use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;
use tokio::time::timeout;

#[derive(Serialize, Deserialize)]
struct HttpResponse {
    status: u16,
    data: serde_json::Value,
    ok: bool,
}

#[derive(Serialize, Deserialize)]
struct DiscoveredServer {
    host: String,
    port: u16,
    name: String,
    version: Option<String>,
    response_time_ms: u64,
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
async fn discover_servers() -> Result<Vec<DiscoveredServer>, String> {
    let mut discovered = Vec::new();
    
    // Get local network ranges to scan
    let local_ips = get_local_network_ranges().await?;
    
    // Common opencode ports to check
    let ports = vec![3000, 8080, 8000, 3001, 8001];
    
    for network in local_ips {
        for port in &ports {
            let servers = scan_network_range(network.clone(), *port).await;
            discovered.extend(servers);
        }
    }
    
    Ok(discovered)
}

async fn get_local_network_ranges() -> Result<Vec<String>, String> {
    // For now, scan common local network ranges
    // In a more sophisticated implementation, we'd get the actual network interfaces
    Ok(vec![
        "192.168.1".to_string(),
        "192.168.0".to_string(),
        "10.0.0".to_string(),
        "172.16.0".to_string(),
    ])
}

async fn scan_network_range(network_prefix: String, port: u16) -> Vec<DiscoveredServer> {
    let mut servers = Vec::new();
    let mut tasks = Vec::new();
    
    // Scan first 20 IPs in the range (to keep it fast)
    for i in 1..=20 {
        let host = format!("{}.{}", network_prefix, i);
        let task = check_opencode_server(host, port);
        tasks.push(task);
    }
    
    // Wait for all checks to complete with timeout
    let results = futures::future::join_all(tasks).await;
    
    for result in results {
        if let Some(server) = result {
            servers.push(server);
        }
    }
    
    servers
}

async fn check_opencode_server(host: String, port: u16) -> Option<DiscoveredServer> {
    let url = format!("http://{}:{}/app", host, port);
    let start = std::time::Instant::now();
    
    // Short timeout for discovery
    let client = reqwest::Client::builder()
        .timeout(Duration::from_millis(2000))
        .build()
        .ok()?;
    
    match timeout(Duration::from_millis(2000), client.get(&url).send()).await {
        Ok(Ok(response)) => {
            let response_time = start.elapsed().as_millis() as u64;
            
            if response.status().is_success() {
                // Try to get server info
                if let Ok(data) = response.json::<serde_json::Value>().await {
                    let name = data.get("name")
                        .and_then(|v| v.as_str())
                        .unwrap_or("OpenCode Server")
                        .to_string();
                    
                    let version = data.get("version")
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string());
                    
                    return Some(DiscoveredServer {
                        host,
                        port,
                        name,
                        version,
                        response_time_ms: response_time,
                    });
                }
            }
        }
        _ => {}
    }
    
    None
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, http_get, http_post, discover_servers])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
