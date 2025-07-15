// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use http::StatusCode;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::env;

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PortfolioMetrics {
    pub cagr: f64,
    pub sharpe_ratio: f64,
    pub max_drawdown: f64,
    pub calmar_ratio: f64,
    pub profit_factor: Option<f64>,
    pub win_rate: f64,
    pub avg_trade_return: f64,
    pub positions: HashMap<String, (f64, f64, f64)>,
}

#[derive(Deserialize, Serialize, Debug)]
struct Strategy {
    pub strategy: String,
    pub capital: f64,
    pub initial_capital: f64,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum Status {
    Active,
    Stopping,
    Inactive,
}

#[derive(Deserialize, Serialize, Debug)]
struct PortfolioDataForStrategy {
    strategy: String,
    status: Status,
    portfolio: Vec<(chrono::DateTime<chrono::Utc>, f64)>, // assuming "number" can be float (JS treats number as float by default)
    metrics: PortfolioMetrics,
}

#[derive(Deserialize, Serialize, Debug)]
struct PortfolioData {
    strategies: Vec<PortfolioDataForStrategy>,
    portfolio: Vec<(chrono::DateTime<chrono::Utc>, f64)>, // assuming "number" can be float (JS treats number as float by default)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MismatchedPosition {
    pub strategy: String,
    pub broker: f64,
    pub local: f64,
    pub fix: f64,
}

async fn make_get_request<T: for<'a> Deserialize<'a>>(
    url: String,
    bearer_token: &String,
    params: serde_json::Value,
) -> Result<T, (u16, String)> {
    // let bearer_token = std::env::var("BEARER_TOKEN").expect("BEARER_TOKEN must be set");
    let params_obj = params.as_object().expect("params must be a JSON object");
    let mut params_query = Vec::new();
    for (key, value) in params_obj {
        if value.is_null() {
            continue;
        };
        match value {
            serde_json::Value::String(s) => params_query.push((key.clone(), s.clone())),
            serde_json::Value::Array(arr) => {
                for val in arr {
                    if let serde_json::Value::String(s) = val {
                        params_query.push((key.clone(), s.clone()))
                    } else if let serde_json::Value::Number(i) = val {
                        params_query.push((key.clone(), format!("{}", i)))
                    }
                }
            }
            serde_json::Value::Number(i) => params_query.push((key.clone(), format!("{}", i))),
            _ => {
                return Err((500, format!("Unsupported value type for key: {}", key)).into());
            }
        }
    }

    let client = Client::new();
    let response_unparsed = client
        .get(url)
        .query(&params_query)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", bearer_token))
        .send()
        .await
        .map_err(|err| {
            (
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                format!("Error occurred during request: {}", err),
            )
        })?;

    let response = response_unparsed.error_for_status().map_err(|err| {
        (
            err.status()
                .unwrap_or_else(|| StatusCode::INTERNAL_SERVER_ERROR)
                .as_u16(),
            format!("Error occurred during request: {}", err.to_string()),
        )
    })?;

    let result = response.json::<T>().await.map_err(|err| {
        // Ok(parsed) => tauri::ipc::Response::new(parsed),
        (
            StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
            format!("Error occurred during parsing of data: {}", err),
        )
    })?;

    Ok(result)
}

#[tauri::command]
async fn get_all_strategies<'a>(
    config: tauri::State<'a, AppConfig>,
) -> Result<Vec<Strategy>, (u16, String)> {
    let rust_backend_url = config
        .0
        .get("RUST_BACKEND_URL")
        .expect("RUST_BACKEND_URL must be set");
    let bearer_token = config
        .0
        .get("BEARER_TOKEN")
        .expect("BEARER_TOKEN must be set");

    let url = format!("http://{}/strategy/all", rust_backend_url);
    make_get_request::<Vec<Strategy>>(url, bearer_token, serde_json::json!({})).await
}

// Swing-Alpha-1
#[tauri::command(rename_all = "snake_case")]
async fn get_strategy_details<'a>(
    strategy_name: &str,
    config: tauri::State<'a, AppConfig>,
) -> Result<PortfolioDataForStrategy, (u16, String)> {
    let rust_backend_url = config
        .0
        .get("RUST_BACKEND_URL")
        .expect("RUST_BACKEND_URL must be set");
    let bearer_token = config
        .0
        .get("BEARER_TOKEN")
        .expect("BEARER_TOKEN must be set");

    let url = format!(
        "http://{}/get_portfolio/strategy?strategy={}",
        rust_backend_url, strategy_name
    );
    make_get_request::<PortfolioDataForStrategy>(url, bearer_token, serde_json::json!({})).await
}

#[tauri::command(rename_all = "snake_case")]
async fn pause_strategy<'a>(
    strategy: String,
    graceful: bool,
    config: tauri::State<'a, AppConfig>,
) -> Result<(u16, String), (u16, String)> {
    let rust_backend_url = config
        .0
        .get("RUST_BACKEND_URL")
        .expect("RUST_BACKEND_URL must be set");
    let bearer_token = config
        .0
        .get("BEARER_TOKEN")
        .expect("BEARER_TOKEN must be set");

    let url = format!("http://{}/strategy/pause", rust_backend_url);
    let client = Client::new();
    let response_unparsed = client
        .post(url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", bearer_token))
        .json(&serde_json::json!({
            "strategy": strategy,
            "graceful": graceful
        }))
        .send()
        .await
        .map_err(|err| {
            (
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                format!("Error occurred during request: {}", err),
            )
        })?;

    response_unparsed.error_for_status().map_err(|err| {
        (
            err.status()
                .unwrap_or_else(|| StatusCode::INTERNAL_SERVER_ERROR)
                .as_u16(),
            format!("Error occurred during request: {}", err.to_string()),
        )
    })?;

    Ok((StatusCode::OK.as_u16(), "Successful".into()))
}

#[tauri::command(rename_all = "snake_case")]
async fn resume_strategy<'a>(
    strategy: String,
    config: tauri::State<'a, AppConfig>,
) -> Result<(u16, String), (u16, String)> {
    let rust_backend_url = config
        .0
        .get("RUST_BACKEND_URL")
        .expect("RUST_BACKEND_URL must be set");
    let bearer_token = config
        .0
        .get("BEARER_TOKEN")
        .expect("BEARER_TOKEN must be set");

    let url = format!("http://{}/strategy/resume", rust_backend_url);
    let client = Client::new();
    let response_unparsed = client
        .post(url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", bearer_token))
        .json(&serde_json::json!({
            "strategy": strategy,
        }))
        .send()
        .await
        .map_err(|err| {
            (
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                format!("Error occurred during request: {}", err),
            )
        })?;

    response_unparsed.error_for_status().map_err(|err| {
        (
            err.status()
                .unwrap_or_else(|| StatusCode::INTERNAL_SERVER_ERROR)
                .as_u16(),
            format!("Error occurred during request: {}", err.to_string()),
        )
    })?;

    Ok((StatusCode::OK.as_u16(), "Successful".into()))
}

#[tauri::command(rename_all = "snake_case")]
async fn pause_account<'a>(
    graceful: bool,
    config: tauri::State<'a, AppConfig>,
) -> Result<(u16, String), (u16, String)> {
    let rust_backend_url = config
        .0
        .get("RUST_BACKEND_URL")
        .expect("RUST_BACKEND_URL must be set");
    let bearer_token = config
        .0
        .get("BEARER_TOKEN")
        .expect("BEARER_TOKEN must be set");

    let url = format!("http://{}/account/pause", rust_backend_url);
    let client = Client::new();
    let response_unparsed = client
        .post(url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", bearer_token))
        .json(&serde_json::json!({
            "graceful": graceful
        }))
        .send()
        .await
        .map_err(|err| {
            (
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                format!("Error occurred during request: {}", err),
            )
        })?;

    response_unparsed.error_for_status().map_err(|err| {
        (
            err.status()
                .unwrap_or_else(|| StatusCode::INTERNAL_SERVER_ERROR)
                .as_u16(),
            format!("Error occurred during request: {}", err.to_string()),
        )
    })?;

    Ok((StatusCode::OK.as_u16(), "Successfull".into()))
}

#[tauri::command]
async fn get_portfolio_details<'a>(
    config: tauri::State<'a, AppConfig>,
) -> Result<PortfolioData, (u16, String)> {
    let rust_backend_url = config
        .0
        .get("RUST_BACKEND_URL")
        .expect("RUST_BACKEND_URL must be set");
    let bearer_token = config
        .0
        .get("BEARER_TOKEN")
        .expect("BEARER_TOKEN must be set");

    let url = format!("http://{}/get_portfolio", rust_backend_url);
    make_get_request::<PortfolioData>(url, bearer_token, serde_json::json!({})).await
}

#[tauri::command(rename_all = "snake_case")]
async fn submit_position_mismatches<'a>(
    fixed_positions: HashMap<String, Vec<MismatchedPosition>>,
    config: tauri::State<'a, AppConfig>,
) -> Result<(u16, String), (u16, String)> {
    let rust_backend_url = config
        .0
        .get("RUST_BACKEND_URL")
        .expect("RUST_BACKEND_URL must be set");
    let bearer_token = config
        .0
        .get("BEARER_TOKEN")
        .expect("BEARER_TOKEN must be set");

    let url = format!("http://{}/current_position/fix", rust_backend_url);

    let client = Client::new();
    let response_unparsed = client
        .post(url)
        .header("Content-Type", "application/json")
        .header("Authorization", format!("Bearer {}", bearer_token))
        .json(&fixed_positions)
        .send()
        .await
        .map_err(|err| {
            (
                StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
                format!("Error occurred during request: {}", err),
            )
        })?;

    let response = response_unparsed.error_for_status().map_err(|err| {
        (
            err.status()
                .unwrap_or_else(|| StatusCode::INTERNAL_SERVER_ERROR)
                .as_u16(),
            format!("Error occurred during request: {}", err.to_string()),
        )
    })?;

    Ok((
        StatusCode::OK.as_u16(),
        "Successfully updated current positions!".to_string(),
    ))
}

#[tauri::command(rename_all = "snake_case")]
async fn get_log_files<'a>(
    config: tauri::State<'a, AppConfig>,
) -> Result<Vec<String>, (u16, String)> {
    let rust_backend_url = config
        .0
        .get("RUST_BACKEND_URL")
        .expect("RUST_BACKEND_URL must be set");
    let bearer_token = config
        .0
        .get("BEARER_TOKEN")
        .expect("BEARER_TOKEN must be set");

    let url = format!("http://{}/logs", rust_backend_url);

    make_get_request::<Vec<String>>(url, bearer_token, serde_json::json!({})).await
}

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct LogFilter {
    level: Option<String>,
    name: Option<String>,
    exclude_name: Option<String>,
    limit: Option<usize>,
    start: Option<usize>,
}

#[allow(non_snake_case)]
#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct LogFile {
    asctime: String,
    levelname: String,
    name: String,
    module: String,
    funcName: String,
    lineno: String,
    message: String,
}

#[tauri::command(rename_all = "snake_case")]
async fn get_log<'a>(
    filter: LogFilter,
    filename: String,
    config: tauri::State<'a, AppConfig>,
) -> Result<Vec<LogFile>, (u16, String)> {
    let rust_backend_url = config
        .0
        .get("RUST_BACKEND_URL")
        .expect("RUST_BACKEND_URL must be set");
    let bearer_token = config
        .0
        .get("BEARER_TOKEN")
        .expect("BEARER_TOKEN must be set");

    let url = format!("http://{}/logs/{}", rust_backend_url, filename);

    make_get_request::<Vec<LogFile>>(url, bearer_token, serde_json::json!(filter)).await
}

#[tauri::command]
fn load_rust_backend_url() -> String {
    env::var("RUST_BACKEND_URL")
        .unwrap_or_else(|err| format!("Cannot find RUST_BACKEND_URL environment variable: {}", err))
}

#[tauri::command]
fn load_bearer_token() -> String {
    env::var("BEARER_TOKEN")
        .unwrap_or_else(|err| format!("Cannot find BEARER_TOKEN environment variable: {}", err))
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Debug)]
pub struct AppConfig(pub HashMap<String, String>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut env = HashMap::new();
    env.insert("RUST_BACKEND_URL".into(), "rtyt.duckdns.org:2200".into());
    env.insert("BEARER_TOKEN".into(), "12345".into());

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppConfig(env))
        .invoke_handler(tauri::generate_handler![
            greet,
            get_strategy_details,
            get_all_strategies,
            get_portfolio_details,
            submit_position_mismatches,
            pause_strategy,
            resume_strategy,
            pause_account,
            load_rust_backend_url,
            load_bearer_token,
            get_log_files,
            get_log
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
