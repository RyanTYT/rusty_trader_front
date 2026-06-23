// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod news_ideas;
mod request_handlers;
mod websocket;

use chrono_tz::America::New_York;
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::env;
use std::{collections::HashMap, sync::Arc};
use tauri_plugin_log::{Target, TargetKind};
use tokio::sync::mpsc::{channel, Sender};
use tokio::sync::Mutex;

use request_handlers::{make_get_request, make_post_request};

use news_ideas::{
    counter_proposer, deep_dive, get_capital_now, get_current_positions, get_exchange_rate,
    get_last_counter_proposal, get_last_proposal, get_possible_contracts, get_settings,
    idea_generator, kb_file, kb_tree, positions_proposer, set_options_mode, ticker_selector,
    update_industries, update_llm_positions, update_macro, update_settings,
};

#[derive(Debug, Clone)]
pub struct AppConfig {
    pub backend_url: String,
    pub bearer_token: String,
    pub client: Arc<Client>,
    pub refresh_sender: Arc<Sender<()>>,
    pub ws_health: Arc<Mutex<Option<bool>>>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct OptionDetails {
    pub expiry: String,
    pub strike: f64,
    pub multiplier: String,
    pub option_type: String, // "Call" or "Put"
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Position {
    avg_price: f64,
    quantity: f64,
    last_pnl: f64,
    contract_type: String,
    option_details: Option<OptionDetails>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct PortfolioMetrics {
    pub cagr: f64,
    pub sharpe_ratio: f64,
    pub max_drawdown: f64,
    pub calmar_ratio: f64,
    pub profit_factor: Option<f64>,
    pub win_rate: f64,
    pub avg_trade_return: f64,
    pub positions: HashMap<String, Position>,
}

#[derive(Deserialize, Serialize, Debug)]
struct Strategy {
    pub strategy: String,
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

#[derive(Serialize, Debug)]
struct TZPortfolioDataForStrategy {
    strategy: String,
    status: Status,
    portfolio: Vec<(chrono::DateTime<chrono_tz::Tz>, f64)>, // assuming "number" can be float (JS treats number as float by default)
    metrics: PortfolioMetrics,
}

#[derive(Serialize, Debug)]
struct TZPortfolioData {
    strategies: Vec<TZPortfolioDataForStrategy>,
    portfolio: Vec<(chrono::DateTime<chrono_tz::Tz>, f64)>, // assuming "number" can be float (JS treats number as float by default)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MismatchedPosition {
    pub strategy: String,
    pub broker: f64,
    pub local: f64,
    pub fix: f64,
}

#[tauri::command]
async fn get_all_strategies<'a>(
    config: tauri::State<'a, AppConfig>,
) -> Result<Vec<Strategy>, (u16, String)> {
    make_get_request::<Vec<Strategy>>(&config, "/strategy/all", serde_json::json!({})).await
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct StrategyValue {
    pub sgd_value: f64,
}
#[tauri::command]
async fn get_strategy_capital<'a>(
    config: tauri::State<'a, AppConfig>,
    strategy: String,
) -> Result<StrategyValue, (u16, String)> {
    make_get_request::<StrategyValue>(
        &config,
        &format!("/strategy/capital?strategy={}", strategy),
        serde_json::json!({}),
    )
    .await
}

// Swing-Alpha-1
#[tauri::command(rename_all = "snake_case")]
async fn get_strategy_details<'a>(
    strategy_name: &str,
    cutoff: u64,
    config: tauri::State<'a, AppConfig>,
) -> Result<TZPortfolioDataForStrategy, (u16, String)> {
    let response = make_get_request::<PortfolioDataForStrategy>(
        &config,
        format!("/get_portfolio/strategy?strategy={strategy_name}&cutoff={cutoff}").as_str(),
        serde_json::json!({}),
    )
    .await?;

    let localised_portfolio_values: Vec<(chrono::DateTime<chrono_tz::Tz>, f64)> = response
        .portfolio
        .iter()
        .map(|dt| (dt.0.with_timezone(&New_York), dt.1))
        .collect();
    Ok(TZPortfolioDataForStrategy {
        strategy: response.strategy,
        status: response.status,
        portfolio: localised_portfolio_values,
        metrics: response.metrics,
    })
}

#[tauri::command(rename_all = "snake_case")]
async fn pause_strategy<'a>(
    strategy: String,
    graceful: bool,
    config: tauri::State<'a, AppConfig>,
) -> Result<(u16, String), (u16, String)> {
    // let url = format!("http://{}/strategy/pause", config.backend_url);
    // let client = Client::new();
    // let response_unparsed = client
    //     .post(url)
    //     .header("Content-Type", "application/json")
    //     .header("Authorization", format!("Bearer {}", config.bearer_token))
    //     .json(&serde_json::json!({
    //         "strategy": strategy,
    //         "graceful": graceful
    //     }))
    //     .send()
    //     .await
    //     .map_err(|err| {
    //         (
    //             StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
    //             format!("Error occurred during request: {}", err),
    //         )
    //     })?;
    //
    // response_unparsed.error_for_status().map_err(|err| {
    //     (
    //         err.status()
    //             .unwrap_or_else(|| StatusCode::INTERNAL_SERVER_ERROR)
    //             .as_u16(),
    //         format!("Error occurred during request: {}", err.to_string()),
    //     )
    // })?;
    //
    // Ok((StatusCode::OK.as_u16(), "Successful".into()))
    make_post_request(
        &config,
        "/strategy/pause",
        serde_json::json!({ "strategy": strategy, "graceful": graceful }),
    )
    .await
}

#[tauri::command(rename_all = "snake_case")]
async fn resume_strategy<'a>(
    strategy: String,
    config: tauri::State<'a, AppConfig>,
) -> Result<(u16, String), (u16, String)> {
    // let url = format!("http://{}/strategy/resume", config.backend_url);
    // let client = Client::new();
    // let response_unparsed = client
    //     .post(url)
    //     .header("Content-Type", "application/json")
    //     .header("Authorization", format!("Bearer {}", config.bearer_token))
    //     .json(&serde_json::json!({
    //         "strategy": strategy,
    //     }))
    //     .send()
    //     .await
    //     .map_err(|err| {
    //         (
    //             StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
    //             format!("Error occurred during request: {}", err),
    //         )
    //     })?;
    //
    // response_unparsed.error_for_status().map_err(|err| {
    //     (
    //         err.status()
    //             .unwrap_or_else(|| StatusCode::INTERNAL_SERVER_ERROR)
    //             .as_u16(),
    //         format!("Error occurred during request: {}", err.to_string()),
    //     )
    // })?;
    //
    // Ok((StatusCode::OK.as_u16(), "Successful".into()))
    make_post_request(
        &config,
        "/strategy/pause",
        serde_json::json!({ "strategy": strategy }),
    )
    .await
}

#[tauri::command(rename_all = "snake_case")]
async fn pause_account<'a>(
    graceful: bool,
    config: tauri::State<'a, AppConfig>,
) -> Result<(u16, String), (u16, String)> {
    // let url = format!("http://{}/account/pause", config.backend_url);
    // let client = Client::new();
    // let response_unparsed = client
    //     .post(url)
    //     .header("Content-Type", "application/json")
    //     .header("Authorization", format!("Bearer {}", config.bearer_token))
    //     .json(&serde_json::json!({
    //         "graceful": graceful
    //     }))
    //     .send()
    //     .await
    //     .map_err(|err| {
    //         (
    //             StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
    //             format!("Error occurred during request: {}", err),
    //         )
    //     })?;
    //
    // response_unparsed.error_for_status().map_err(|err| {
    //     (
    //         err.status()
    //             .unwrap_or_else(|| StatusCode::INTERNAL_SERVER_ERROR)
    //             .as_u16(),
    //         format!("Error occurred during request: {}", err.to_string()),
    //     )
    // })?;
    //
    // Ok((StatusCode::OK.as_u16(), "Successfull".into()))

    make_post_request(
        &config,
        "/account/pause",
        serde_json::json!({ "graceful": graceful}),
    )
    .await
}

#[tauri::command]
async fn get_portfolio_details<'a>(
    config: tauri::State<'a, AppConfig>,
    cutoff: u64,
) -> Result<TZPortfolioData, (u16, String)> {
    // let url = format!("http://{}/get_portfolio", &config.backend_url);
    let response = make_get_request::<PortfolioData>(
        &config,
        format!("/get_portfolio?cutoff={cutoff}").as_str(),
        serde_json::json!({}),
    )
    .await?;

    let localised_strategy_values: Vec<TZPortfolioDataForStrategy> = response
        .strategies
        .iter()
        .map(|strategy| {
            let localised_portfolio_values = strategy
                .portfolio
                .iter()
                .map(|dt_val| (dt_val.0.with_timezone(&New_York), dt_val.1))
                .collect();
            TZPortfolioDataForStrategy {
                strategy: strategy.strategy.clone(),
                status: strategy.status.clone(),
                portfolio: localised_portfolio_values,
                metrics: strategy.metrics.clone(),
            }
        })
        .collect();
    let localised_portfolio_values = response
        .portfolio
        .iter()
        .map(|dt| (dt.0.with_timezone(&New_York), dt.1))
        .collect();
    Ok(TZPortfolioData {
        strategies: localised_strategy_values,
        portfolio: localised_portfolio_values,
    })
}

#[tauri::command(rename_all = "snake_case")]
async fn submit_position_mismatches<'a>(
    fixed_positions: HashMap<String, Vec<MismatchedPosition>>,
    config: tauri::State<'a, AppConfig>,
) -> Result<(u16, String), (u16, String)> {
    // let url = format!("http://{}/current_position/fix", config.backend_url);
    //
    // let client = Client::new();
    // let response_unparsed = client
    //     .post(url)
    //     .header("Content-Type", "application/json")
    //     .header("Authorization", format!("Bearer {}", &config.bearer_token))
    //     .json(&fixed_positions)
    //     .send()
    //     .await
    //     .map_err(|err| {
    //         (
    //             StatusCode::INTERNAL_SERVER_ERROR.as_u16(),
    //             format!("Error occurred during request: {}", err),
    //         )
    //     })?;
    //
    // let response = response_unparsed.error_for_status().map_err(|err| {
    //     (
    //         err.status()
    //             .unwrap_or_else(|| StatusCode::INTERNAL_SERVER_ERROR)
    //             .as_u16(),
    //         format!("Error occurred during request: {}", err.to_string()),
    //     )
    // })?;
    //
    // Ok((
    //     StatusCode::OK.as_u16(),
    //     "Successfully updated current positions!".to_string(),
    // ))

    make_post_request(
        &config,
        "/current_position/fix",
        serde_json::json!(fixed_positions),
    )
    .await
}

#[tauri::command(rename_all = "snake_case")]
async fn get_log_files<'a>(
    config: tauri::State<'a, AppConfig>,
) -> Result<Vec<String>, (u16, String)> {
    make_get_request::<Vec<String>>(&config, "/logs", serde_json::json!({})).await
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
    time: String,
    level: String,
    name: String,
    message: String,
}

#[tauri::command(rename_all = "snake_case")]
async fn get_log<'a>(
    filter: LogFilter,
    filename: String,
    config: tauri::State<'a, AppConfig>,
) -> Result<Vec<LogFile>, (u16, String)> {
    make_get_request::<Vec<LogFile>>(
        &config,
        format!("/logs/{filename:?}").as_str(),
        serde_json::json!(filter),
    )
    .await
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CurrentStockPositions {
    pub stock: String,
    pub primary_exchange: String,
    pub strategy: String,
    pub quantity: f64,
    pub avg_price: f64,
    // pub stop_limit: Option<f64>,
    pub operation: String,
}

// #[tauri::command(rename_all = "snake_case")]
// async fn update_positions<'a>(
//     positions: Vec<CurrentStockPositions>,
//     config: tauri::State<'a, AppConfig>,
// ) -> Result<(u16, String), (u16, String)> {
//     make_post_request(&config, "/positions/update", serde_json::json!(&positions)).await
// }

#[tauri::command(rename_all = "snake_case")]
async fn refresh_ws<'a>(
    config: tauri::State<'a, AppConfig>,
) -> Result<(u16, String), (u16, String)> {
    match config.refresh_sender.send(()).await {
        Ok(_) => Ok((200, "Trying reconnection now".to_string())),
        Err(e) => Err((
            500,
            "Failed to send Refresh Request to channel in tauri backend".to_string(),
        )),
    }
}

#[tauri::command(rename_all = "snake_case")]
async fn check_ws_health<'a>(config: tauri::State<'a, AppConfig>) -> Result<String, (u16, String)> {
    let health = config.ws_health.lock().await;
    if health.is_none() {
        return Ok("info".to_string());
    }
    if health.unwrap() {
        Ok("success".to_string())
    } else {
        Err((500, "error".to_string()))
    }
}

// #[tauri::command]
// fn load_rust_backend_url() -> String {
//     env::var("RUST_BACKEND_URL")
//         .unwrap_or_else(|err| format!("Cannot find RUST_BACKEND_URL environment variable: {}", err))
// }
//
// #[tauri::command]
// fn load_bearer_token() -> String {
//     env::var("BEARER_TOKEN")
//         .unwrap_or_else(|err| format!("Cannot find BEARER_TOKEN environment variable: {}", err))
// }

#[derive(Debug, serde::Serialize, serde::Deserialize)]
struct CheckHealthResp {
    status: String,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let client = Arc::new(Client::new());
    let (sender, mut refresh_rcx) = channel::<()>(10);
    let refresh_sender: Arc<Sender<()>> = Arc::new(sender);
    let app_config = AppConfig {
        backend_url: "http://kim-chongs-mini:3000".to_string(),
        bearer_token: "12345".to_string(),
        client: client.clone(),
        refresh_sender: refresh_sender.clone(),
        ws_health: Arc::new(Mutex::new(None)),
    };

    // let app_config = tauri::async_runtime::block_on(async {
    //     let server_possibilities = [
    //         "http://192.168.50.72:3000",
    //         "http://192.168.1.90:3000",
    //     ];
    //     let config_possibilities = server_possibilities.map(|server_url| AppConfig {
    //         backend_url: server_url.to_string(),
    //         bearer_token: "12345".to_string(),
    //         client: client.clone(),
    //         refresh_sender: refresh_sender.clone(),
    //         ws_health: Arc::new(Mutex::new(None)),
    //     });
    //     let reqs = join_all(config_possibilities.clone().map(async |config| {
    //         make_get_request::<CheckHealthResp>(&config, "", serde_json::json!({})).await
    //     }))
    //     .await;
    //
    //     let config_idx = reqs
    //         .iter()
    //         .enumerate()
    //         .find_map(|(idx, resp)| {
    //             resp.as_ref()
    //                 .is_ok_and(|status| status.status == "ok")
    //                 .then_some(idx)
    //         })
    //         .unwrap_or(0);
    //     config_possibilities[config_idx].clone()
    // });

    let app_config_cloned = app_config.clone();
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Error)
                .targets([
                    Target::new(TargetKind::Stdout),  // Keeps logs in your terminal
                    Target::new(TargetKind::Webview), // Forwards logs to the frontend
                ])
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_opener::init())
        .manage(app_config)
        .setup(|app| {
            let app_handle = app.handle().clone();
            // let app_config_cloned = app_config.clone();

            tauri::async_runtime::spawn(async move {
                if let Err(e) = websocket::create_websocket_connection(
                    app_handle,
                    &app_config_cloned,
                    refresh_rcx,
                )
                .await
                {
                    log::error!("Overflow error: overflow of fibonacci backoff {e:?}");
                };
            });
            log::info!("In tauri setup: Spawned task to create_websocket_connection!");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_strategy_details,
            get_all_strategies,
            get_portfolio_details,
            submit_position_mismatches,
            pause_strategy,
            resume_strategy,
            pause_account,
            // load_rust_backend_url,
            // load_bearer_token,
            get_log_files,
            get_log,
            update_macro,
            update_industries,
            idea_generator,
            deep_dive,
            positions_proposer,
            counter_proposer,
            get_settings,
            update_settings,
            set_options_mode,
            ticker_selector,
            kb_tree,
            kb_file,
            update_llm_positions,
            refresh_ws,
            check_ws_health,
            get_last_proposal,
            get_last_counter_proposal,
            get_current_positions,
            get_capital_now,
            get_possible_contracts,
            get_exchange_rate,
            get_strategy_capital
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
