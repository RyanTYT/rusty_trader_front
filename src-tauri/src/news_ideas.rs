use std::collections::HashMap;

use crate::{
    request_handlers::{make_get_request, make_patch_request, make_post_request, make_put_request},
    AppConfig,
};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct GenericResult {
    result: serde_json::Value,
}

#[derive(Serialize, Deserialize)]
pub struct ApiResponse {
    status: String,
}

#[tauri::command]
pub async fn update_macro<'a>(
    config: tauri::State<'a, AppConfig>,
    force: Option<bool>,
) -> Result<GenericResult, (u16, String)> {
    make_post_request::<GenericResult>(
        &config,
        "/news_ideas/update_macro",
        if force.is_some() {
            serde_json::json!({"force": force})
        } else {
            serde_json::json!({})
        },
    )
    .await
}

#[tauri::command]
pub async fn update_industries<'a>(
    config: tauri::State<'a, AppConfig>,
    force: Option<bool>,
) -> Result<GenericResult, (u16, String)> {
    make_post_request::<GenericResult>(
        &config,
        "/news_ideas/update_industries",
        if force.is_some() {
            serde_json::json!({"force": force})
        } else {
            serde_json::json!({})
        },
    )
    .await
}

#[tauri::command]
pub async fn ticker_selector<'a>(
    config: tauri::State<'a, AppConfig>,
    force: Option<bool>,
) -> Result<GenericResult, (u16, String)> {
    make_post_request::<GenericResult>(
        &config,
        "/news_ideas/ticker_selector",
        if force.is_some() {
            serde_json::json!({"force": force})
        } else {
            serde_json::json!({})
        },
    )
    .await
}

#[tauri::command]
pub async fn idea_generator<'a>(
    config: tauri::State<'a, AppConfig>,
    force: Option<bool>,
) -> Result<GenericResult, (u16, String)> {
    make_post_request::<GenericResult>(
        &config,
        "/news_ideas/idea_generator",
        if force.is_some() {
            serde_json::json!({"force": force})
        } else {
            serde_json::json!({})
        },
    )
    .await
}

#[tauri::command]
pub async fn deep_dive<'a>(
    config: tauri::State<'a, AppConfig>,
    ticker: String,
    force: Option<bool>,
) -> Result<GenericResult, (u16, String)> {
    make_post_request::<GenericResult>(
        &config,
        "/news_ideas/deep_dive",
        if force.is_some() {
            serde_json::json!({"ticker": ticker, "force": force})
        } else {
            serde_json::json!({"ticker": ticker})
        },
    )
    .await
}

#[derive(Serialize, Deserialize)]
pub struct Driver {
    title: String,
    description: String,
    r#type: String,
    #[serde(default)]
    overlooked_reason: Option<String>,
}

#[derive(Serialize, Deserialize)]
pub struct IndustryContext {
    economy: String,
    industry: String,
    #[serde(default)]
    headwind: Option<String>,
    #[serde(default)]
    tailwind: Option<String>,
    macro_linkage: String,
}

// ── New: PriceThreshold replaces plain string invalidation_condition ──────────
#[derive(Serialize, Deserialize)]
pub struct PriceThreshold {
    level: f64,
    rationale: String,
    action: String,
    signal_type: String,
}

// ── New: Trading friction estimate ────────────────────────────────────────────
#[derive(Serialize, Deserialize)]
pub struct TradingFriction {
    estimated_shares_or_contracts: f64,
    commission_usd: f64,
    estimated_slippage_usd: f64,
    total_friction_usd: f64,
    friction_as_pct_of_position: f64,
    round_trip_friction_usd: f64,
    round_trip_friction_pct: f64,
    ibkr_tier: String,
    #[serde(default)]
    adv_used: Option<f64>,
    spread_tier: String,
}

#[derive(Serialize, Deserialize)]
pub struct TriggeredAlert {
    ticker: String,
    alert_type: String,
    severity: String,
    description: String,
    recommended_action: String,
}

#[derive(Serialize, Deserialize)]
pub struct Timing {
    horizon_days: f64,
    #[serde(default)]
    catalyst_date: Option<String>,

    validation_condition: PriceThreshold,
    invalidation_condition: PriceThreshold,
    price_corridor_rationale: String,
    monitoring_checklist: Vec<String>,
}

// class Timing(BaseModel):
//     horizon_days: int
//     catalyst_date: Optional[str] = None
//
//     validation_condition: PriceThreshold = Field(
//         ...,
//         description=(
//             "Price level that confirms the thesis. Defines where to take profits "
//             "or add to the position."
//         ),
//     )
//     invalidation_condition: PriceThreshold = Field(
//         ...,
//         description=(
//             "Price level that falsifies the thesis. Defines the hard exit point "
//             "with justification for why that level is structurally significant."
//         ),
//     )
//     price_corridor_rationale: str  # Why these specific bounds (e.g. ATR-based, key S/R)
//     monitoring_checklist: List[str]

#[derive(Serialize, Deserialize)]
pub struct ProposedPosition {
    ticker: String,
    exchange: String,
    direction: String,
    asset_type: String,
    proposed_weight: f64,
    current_weight: f64,
    conviction: u32,
    drivers: Vec<Driver>,

    // NEW: explicit economy + industry tagging on every position
    #[serde(default)]
    economy: Option<String>,
    #[serde(default)]
    industry_file_key: Option<String>,
    #[serde(default)]
    industry_context: Option<IndustryContext>,
    timing: Timing,

    // Position state
    position_state: String,
    #[serde(default)]
    displaced_ticker: Option<String>,
    #[serde(default)]
    why_better_than_displaced: Option<String>,

    // Friction
    friction_estimate: TradingFriction,
    friction_justification: String,

    // Options-specific
    #[serde(default)]
    option_expiry: Option<String>,
    #[serde(default)]
    option_strike: Option<f64>,
    #[serde(default)]
    option_vs_stock_rationale: Option<String>,
    #[serde(default)]
    option_greeks_context: Option<String>,
    #[serde(default)]
    option_monitoring: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CandidateComparison {
    pub ticker_a: String,
    pub ticker_b: String,

    pub conviction_comparison: String,
    pub catalyst_comparison: String,
    pub risk_reward_comparison: String,
    pub friction_comparison: String,

    pub verdict: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PoolSummary {
    pub freed_pool_total: f64,
    pub from_closes: f64,
    pub from_trims: f64,

    pub allocated_to_new_trades: f64,
    pub returned_to_trimmed: f64,
    pub unallocated_residual: f64,

    pub candidates_funded: Vec<String>,
    pub candidates_rejected: Vec<String>,

    pub rejection_reasons: HashMap<String, String>,
}

#[derive(Serialize, Deserialize)]
pub struct PositionsProposal {
    generated_at: String,
    capital_at_proposal: f64,

    // 1. Alerts
    triggered_alerts: Vec<TriggeredAlert>,

    // 2. Actions — NOTE: renamed from proposed_positions → proposed_trades
    proposed_trades: Vec<ProposedPosition>,
    unchanged_positions: Vec<ProposedPosition>,
    removed_positions: Vec<String>,

    // 3. Context
    portfolio_thesis: String,
    macro_backdrop: String,
    total_estimated_friction_usd: f64,
    total_friction_as_pct_nav: f64,

    // 4. Assembly stage
    candidate_comparisons: Vec<CandidateComparison>,
    assembly_pool_summary: PoolSummary,

    pipeline_stages: serde_json::Value,
}

#[tauri::command]
pub async fn positions_proposer<'a>(
    config: tauri::State<'a, AppConfig>,
    options_mode_override: Option<bool>,
    force: Option<bool>,
) -> Result<serde_json::Value, (u16, String)> {
    make_post_request::<serde_json::Value>(
        &config,
        "/news_ideas/positions_proposer",
        serde_json::json!({"options_mode_override": options_mode_override, "force": force}),
    )
    .await
}

#[derive(Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Serialize, Deserialize)]
pub struct WeightAdjustment {
    ticker: String,
    old_weight: f64,
    new_weight: f64,
    reason: String,
}

#[derive(Serialize, Deserialize)]
pub struct CounterProposerSession {
    session_id: String,
    proposal: serde_json::Value,
    conversation: Vec<ChatMessage>,
    weight_adjustments: Vec<WeightAdjustment>,
    hold_current_positions: bool,
    hold_current_reason: String,
}

#[derive(Serialize, Deserialize)]
pub struct CounterProposerRequest {
    pub session_id: String,
    pub conversation_history: Vec<ChatMessage>,
    pub original_proposal: serde_json::Value, // Replace with your specific struct
    pub weight_adjustments: serde_json::Value, // Replace with your specific struct
    pub hold_current_positions: bool,
    pub hold_current_reason: Option<String>,
    pub user_message: String,
}

#[derive(Serialize, Deserialize)]
pub struct CounterProposerResponse {
    pub session_id: String,
    pub response: String,
    pub timestamp: String,
}

#[tauri::command]
pub async fn counter_proposer<'a>(
    config: tauri::State<'a, AppConfig>,
    session: CounterProposerSession,
    user_message: String,
) -> Result<CounterProposerResponse, String> {
    let payload = serde_json::json!({
        "session_id": session.session_id,
        "conversation_history": session.conversation, // Serialize directly if fields match
        "original_proposal": session.proposal,
        "weight_adjustments": session.weight_adjustments,
        "hold_current_positions": session.hold_current_positions,
        "hold_current_reason": if session.hold_current_reason.is_empty() { None } else { Some(session.hold_current_reason) },
        "user_message": user_message,
    });

    // Using your existing helper pattern
    make_post_request::<CounterProposerResponse>(&config, "/news_ideas/counter_proposer", payload)
        .await
        .map_err(|e| format!("Failed to POST counter response: {e:?}"))
}

#[derive(Serialize, Deserialize)]
pub struct AppSettings {
    options_mode: bool,
    // model_routing: HashMap<String, String>,
    broad_search_model: String,
    deep_reasoning_model: String,
    long_merge_model: String,

    max_positions: f64,
    max_conviction_1_weight: f64,
    max_conviction_2_weight: f64,
    max_conviction_3_weight: f64,

    enabled_economies: Vec<String>,
}

#[derive(Serialize, Deserialize)]
pub struct AppSettingsResp {
    status: String,
}

#[tauri::command]
pub async fn get_settings<'a>(
    config: tauri::State<'a, AppConfig>,
    _options_mode_override: Option<bool>,
) -> Result<AppSettings, (u16, String)> {
    make_get_request::<AppSettings>(&config, "/news_ideas/settings", serde_json::json!({})).await
}

#[tauri::command]
pub async fn update_settings<'a>(
    config: tauri::State<'a, AppConfig>,
    settings: AppSettings,
) -> Result<AppSettingsResp, (u16, String)> {
    make_put_request::<AppSettingsResp>(
        &config,
        "/news_ideas/settings",
        serde_json::json!(settings),
    )
    .await
}

#[derive(Serialize, Deserialize)]
pub struct OptionsModeResp {
    options_mode: bool,
}

#[tauri::command]
pub async fn set_options_mode<'a>(
    config: tauri::State<'a, AppConfig>,
    enabled: bool,
) -> Result<OptionsModeResp, (u16, String)> {
    make_patch_request::<OptionsModeResp>(
        &config,
        "/news_ideas/settings/options_mode",
        serde_json::json!({"options_mode": enabled}),
    )
    .await
}

#[derive(Serialize, Deserialize)]
pub struct KBFile {
    name: String,
    path: String, // Relative to KB root — pass directly to kbFile
    size_bytes: f64,
    last_modified: String, // ISO timestam,
    is_dir: bool,
    #[serde(default)]
    children: Option<Vec<KBFile>>, // Populated for directorie,
}

#[derive(Serialize, Deserialize)]
pub struct KBFileContent {
    path: String,
    content: String,
    size_bytes: f64,
    last_modified: String,
}

#[tauri::command]
pub async fn kb_file<'a>(
    config: tauri::State<'a, AppConfig>,
    path: &str,
) -> Result<KBFileContent, (u16, String)> {
    let encoded_path = urlencoding::encode(path);
    make_get_request::<KBFileContent>(
        &config,
        format!("/news_ideas/kb/file?path={encoded_path}").as_str(),
        serde_json::json!({}),
    )
    .await
}

#[tauri::command]
pub async fn kb_tree<'a>(
    config: tauri::State<'a, AppConfig>,
) -> Result<Vec<KBFile>, (u16, String)> {
    make_get_request::<Vec<KBFile>>(
        &config,
        format!("/news_ideas/kb/tree").as_str(),
        serde_json::json!({}),
    )
    .await
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(tag = "asset_type")]
pub enum PositionUpdatePayload {
    #[serde(rename = "stock")]
    Stock(StockPositionUpdate),
    #[serde(rename = "option")]
    Option(OptionPositionUpdate),
}

#[derive(Debug, Serialize, Deserialize)]
pub struct StockPositionUpdate {
    pub stock: String,
    pub primary_exchange: String,
    pub currency: String,
    pub strategy: String,
    pub quantity: Option<f64>,
    pub avg_price: Option<f64>,
    /// "upsert" | "delete"
    pub operation: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OptionPositionUpdate {
    pub stock: String,
    pub primary_exchange: String,
    pub currency: String,
    pub strategy: String,
    pub expiry: String,
    pub strike: f64,
    pub multiplier: String,
    pub option_type: String, // "C" | "P"
    pub quantity: Option<f64>,
    pub avg_price: Option<f64>,
    pub operation: String,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn update_llm_positions<'a>(
    config: tauri::State<'a, AppConfig>,
    positions: Vec<PositionUpdatePayload>,
    counter_proposal: serde_json::Value,
) -> Result<ApiResponse, (u16, String)> {
    make_post_request::<ApiResponse>(
        &config,
        format!("/positions/update").as_str(),
        serde_json::json!({
            "positions": positions,
            "counter_proposal": counter_proposal
        }),
    )
    .await
}

// #[derive(Debug, Deserialize)]
// struct LatestQuoteResponse {
//     quote: Quote,
// }
//
// #[derive(Debug, Deserialize)]
// struct Quote {
//     ap: f64, // ask price
//     #[serde(rename = "as")]
//     ask_size: f64, // ask size
//     bp: f64, // bid price
//     bs: f64, // ask size
// }
//
// #[tauri::command(rename_all = "snake_case")]
// pub async fn get_stock_price(
//     _config: tauri::State<'_, AppConfig>,
//     symbol: &str,
// ) -> Result<f64, String> {
//     let client = reqwest::Client::new();
//
//     let url = format!(
//         "https://data.alpaca.markets/v2/stocks/{}/quotes/latest",
//         symbol
//     );
//
//     let response = client
//         .get(url)
//         .header("APCA-API-KEY-ID", "<API-KEY>")
//         .header(
//             "APCA-API-SECRET-KEY",
//             "<API-SECRET>",
//         )
//         .send()
//         .await
//         .map_err(|e| e.to_string())?;
//
//     if !response.status().is_success() {
//         return Err(format!("Alpaca returned {}", response.status()));
//     }
//
//     let parsed: LatestQuoteResponse = response.json().await.map_err(|e| e.to_string())?;
//
//     // Mid price
//     let mut considered_prices: Vec<f64> = Vec::new();
//     if parsed.quote.ask_size > 0.0 && parsed.quote.ap > 0.0 {
//         considered_prices.push(parsed.quote.ap)
//     }
//     if parsed.quote.bs > 0.0 && parsed.quote.bp > 0.0 {
//         considered_prices.push(parsed.quote.bp)
//     }
//
//     if considered_prices.len() == 0 {
//         return Err("No good reference price".to_string());
//     }
//
//     Ok(considered_prices.iter().sum::<f64>() / considered_prices.len() as f64)
// }

#[derive(Serialize, Deserialize)]
pub struct Capital {
    sgd_value: f64,
}

#[tauri::command]
pub async fn get_capital_now<'a>(
    config: tauri::State<'a, AppConfig>,
) -> Result<Capital, (u16, String)> {
    make_get_request::<Capital>(
        &config,
        "/strategy/capital?strategy=manual",
        serde_json::json!({}),
    )
    .await
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CurrencyVal {
    price: f64,
}
#[tauri::command]
pub async fn get_exchange_rate<'a>(
    config: tauri::State<'a, AppConfig>,
    quote: String,
) -> Result<CurrencyVal, (u16, String)> {
    make_get_request::<CurrencyVal>(
        &config,
        &format!("/exchange_rate?currency=SGD&quote={}", quote),
        serde_json::json!({}),
    )
    .await
}

#[derive(Deserialize, Serialize)]
pub struct CurrentStockPositionsWPrice {
    pub stock: String,
    pub primary_exchange: String,
    pub strategy: String,
    pub avg_price: f64,
    pub quantity: f64,
    pub current_price: f64,
    pub last_updated: chrono::DateTime<chrono::Utc>,
}
#[tauri::command]
pub async fn get_current_positions<'a>(
    config: tauri::State<'a, AppConfig>,
) -> Result<Vec<CurrentStockPositionsWPrice>, (u16, String)> {
    make_get_request::<Vec<CurrentStockPositionsWPrice>>(
        &config,
        "/current_positions",
        serde_json::json!({}),
    )
    .await
}

#[tauri::command]
pub async fn get_last_proposal<'a>(
    config: tauri::State<'a, AppConfig>,
) -> Result<serde_json::Value, (u16, String)> {
    make_get_request::<serde_json::Value>(&config, "/proposal/latest", serde_json::json!({})).await
}

#[tauri::command]
pub async fn get_last_counter_proposal<'a>(
    config: tauri::State<'a, AppConfig>,
) -> Result<serde_json::Value, (u16, String)> {
    make_get_request::<serde_json::Value>(
        &config,
        "/counter_proposal/latest",
        serde_json::json!({}),
    )
    .await
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct MinimalContract {
    stock: String,
    primary_exchange: String,
    currency: String,
    current_price: f64,
}

#[tauri::command(rename_all = "snake_case")]
pub async fn get_possible_contracts<'a>(
    config: tauri::State<'a, AppConfig>,
    stock: String,
    primary_exchange: String,
    currency: String,
) -> Result<Vec<MinimalContract>, (u16, String)> {
    make_get_request::<Vec<MinimalContract>>(
        &config,
        "/contracts/stock",
        serde_json::json!({
            "stock": stock,
            "primary_exchange": primary_exchange,
            "currency": currency
        }),
    )
    .await
}

// # Add KBFile and KBFileContent to the type import block
// old_import = "  SeedTickerResult,\n  AppSettings,"
// new_import = "  SeedTickerResult,\n  AppSettings,\n  KBFile,\n  KBFileContent,"
// content = content.replace(old_import, new_import, 1)
//
// # Add kb calls to the api object
// old_end = "  setOptionsMode: (enabled: boolean) =>"
// new_end = """  kbTree: () =>
//     get<KBFile[]>("/news_ideas/kb/tree"),
//
//   kbFile: (path: string) =>
//     get<KBFileContent>(`/news_ideas/kb/file?path=${encodeURIComponent(path)}`),
//
//   setOptionsMode: (enabled: boolean) =>"""
// content = content.replace(old_end, new_end, 1)
//
// with open('/home/claude/implementation/frontend_additions/src/news_ideas/api.ts', 'w') as f:
//     f.write(content)
// print("api.ts updated")
// EOF
// Output
// api.ts updated

// content += """
// // ── KB Browser ────────────────────────────────────────────────────────────────
//
// export interface KBFile {
//   name: string;
//   path: string;          // Relative to KB root — pass directly to kbFile()
//   size_bytes: number;
//   last_modified: string; // ISO timestamp
//   is_dir: boolean;
//   children?: KBFile[];   // Populated for directories
// }
//
// export interface KBFileContent {
//   path: string;
//   content: string;
//   size_bytes: number;
//   last_modified: string;
// }
