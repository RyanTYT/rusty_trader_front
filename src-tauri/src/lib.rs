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

#[derive(Deserialize, Serialize, Debug)]
struct PortfolioDataForStrategy {
    strategy: String,
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

async fn make_get_request<T: for<'a> Deserialize<'a>>(url: String) -> Result<T, (u16, String)> {
    let bearer_token = std::env::var("BEARER_TOKEN").expect("BEARER_TOKEN must be set");

    let client = Client::new();
    let response_unparsed = client
        .get(url)
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
async fn get_all_strategies() -> Result<Vec<Strategy>, (u16, String)> {
    let rust_backend_url = env::var("RUST_BACKEND_URL").map_err(|err| {
        (
            StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
            format!("Cannot find RUST_BACKEND_URL environment variable: {}", err),
        )
    })?;

    let url = format!("http://{}/strategy/all", rust_backend_url);
    make_get_request::<Vec<Strategy>>(url).await
}

// Swing-Alpha-1
#[tauri::command(rename_all = "snake_case")]
async fn get_strategy_details(
    strategy_name: &str,
) -> Result<PortfolioDataForStrategy, (u16, String)> {
    let rust_backend_url = env::var("RUST_BACKEND_URL").map_err(|err| {
        (
            StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
            format!("Cannot find RUST_BACKEND_URL environment variable: {}", err),
        )
    })?;

    let url = format!(
        "http://{}/get_portfolio/strategy?strategy={}",
        rust_backend_url, strategy_name
    );
    make_get_request::<PortfolioDataForStrategy>(url).await
}

#[tauri::command(rename_all = "snake_case")]
async fn pause_strategy(strategy: String, graceful: bool) -> Result<(u16, String), (u16, String)> {
    let rust_backend_url = env::var("RUST_BACKEND_URL").map_err(|err| {
        (
            StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
            format!("Cannot find RUST_BACKEND_URL environment variable: {}", err),
        )
    })?;

    let bearer_token = std::env::var("BEARER_TOKEN").expect("BEARER_TOKEN must be set");
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

    Ok((StatusCode::OK.as_u16(), "Successfull".into()))
}

#[tauri::command(rename_all = "snake_case")]
async fn pause_account(graceful: bool) -> Result<(u16, String), (u16, String)> {
    let rust_backend_url = env::var("RUST_BACKEND_URL").map_err(|err| {
        (
            StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
            format!("Cannot find RUST_BACKEND_URL environment variable: {}", err),
        )
    })?;

    let bearer_token = std::env::var("BEARER_TOKEN").expect("BEARER_TOKEN must be set");
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
async fn get_portfolio_details() -> Result<PortfolioData, (u16, String)> {
    let rust_backend_url = env::var("RUST_BACKEND_URL").map_err(|err| {
        (
            StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
            format!("Cannot find RUST_BACKEND_URL environment variable: {}", err),
        )
    })?;

    let url = format!("http://{}/get_portfolio", rust_backend_url);
    make_get_request::<PortfolioData>(url).await
}

#[tauri::command(rename_all = "snake_case")]
async fn submit_position_mismatches(
    fixed_positions: HashMap<String, Vec<MismatchedPosition>>,
) -> Result<(u16, String), (u16, String)> {
    let rust_backend_url = env::var("RUST_BACKEND_URL").map_err(|err| {
        (
            StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
            format!("Cannot find RUST_BACKEND_URL environment variable: {}", err),
        )
    })?;

    let bearer_token = std::env::var("BEARER_TOKEN").expect("BEARER_TOKEN must be set");
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

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_websocket::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            get_strategy_details,
            get_all_strategies,
            get_portfolio_details,
            submit_position_mismatches,
            pause_strategy,
            pause_account
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
