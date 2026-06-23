// src/news_ideas/types.ts

export type Direction = "long" | "short";
export type AssetType = "stock" | "call_option" | "put_option";
export type Conviction = 1 | 2 | 3;
export type DriverType =
  | "fundamental"
  | "technical"
  | "macro"
  | "supply_chain"
  | "sentiment"
  | "regulatory";

export type PositionState =
  | "new"
  | "increase"
  | "decrease"
  | "replace"
  | "hold";

export interface Driver {
  title: string;
  description: string;
  type: DriverType;
  overlooked_reason?: string;
}

// ── New: PriceThreshold replaces plain string invalidation_condition ──────────
export interface PriceThreshold {
  level: number;
  rationale: string;
  action: "buy" | "sell" | "trim" | "add" | "close";
  signal_type: "technical" | "fundamental_valuation" | "volatility_stop";
}

export interface Timing {
  horizon_days: number;
  catalyst_date?: string;
  validation_condition: PriceThreshold;
  invalidation_condition: PriceThreshold;
  price_corridor_rationale: string;
  monitoring_checklist: string[];
}

export interface IndustryContext {
  economy: string;
  industry: string;
  headwind?: string;
  tailwind?: string;
  macro_linkage: string;
}

// ── New: Trading friction estimate ────────────────────────────────────────────
export interface TradingFriction {
  estimated_shares_or_contracts: number;
  commission_usd: number;
  estimated_slippage_usd: number;
  total_friction_usd: number;
  friction_as_pct_of_position: number;
  round_trip_friction_usd: number;
  round_trip_friction_pct: number;
  ibkr_tier: string;
  adv_used?: number;
  spread_tier: "large_cap" | "mid_cap" | "small_cap";
}

// ── New: Triggered alert ──────────────────────────────────────────────────────
export type AlertType =
  | "validation_hit"
  | "invalidation_hit"
  | "catalyst_changed"
  | "thesis_stale"
  | "approaching_invalidation"
  | "approaching_validation";

export type AlertSeverity = "informational" | "action_required" | "urgent";

export interface TriggeredAlert {
  ticker: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  description: string;
  recommended_action: "hold" | "trim" | "close" | "add" | "reassess";
}

export interface ProposedPosition {
  ticker: string;
  primary_exchange: string;
  currency: string;
  direction: Direction;
  asset_type: AssetType;
  proposed_weight: number;
  current_weight: number;
  conviction: Conviction;
  drivers: Driver[];

  economy?: string;
  industry?: string;
  industry_file_key?: string;

  industry_context: IndustryContext;
  timing: Timing;

  // Position state
  position_state: PositionState;
  displaced_ticker?: string;
  why_better_than_displaced?: string;

  // Friction
  friction_estimate: TradingFriction;
  friction_justification: string;

  // Options-specific
  option_expiry?: string;
  option_strike?: number;
  option_vs_stock_rationale?: string;
  option_greeks_context?: string;
  option_monitoring?: string;
}

export interface CandidateComparison {
  ticker_a: string;
  ticker_b: string;

  conviction_comparison: string;
  catalyst_comparison: string;
  risk_reward_comparison: string;
  friction_comparison: string;

  verdict: string;
}

export interface PoolSummary {
  freed_pool_total: number;
  from_closes: number;
  from_trims: number;

  allocated_to_new_trades: number;
  returned_to_trimmed: number;
  unallocated_residual: number;

  candidates_funded: string[];
  candidates_rejected: string[];

  rejection_reasons: Record<string, string>;
}

export interface AllocationAnalysis {
  candidate_comparisons: CandidateComparison[];
  pool_summary: PoolSummary;
}

export interface PositionsProposal {
  generated_at: string;
  capital_at_proposal: number;

  // 1. Alerts
  triggered_alerts: TriggeredAlert[];

  // 2. Actions — NOTE: renamed from proposed_positions → proposed_trades
  proposed_trades: ProposedPosition[];
  unchanged_positions: ProposedPosition[];
  removed_positions: string[];

  // 3. Context
  portfolio_thesis: string;
  macro_backdrop: string;
  total_estimated_friction_usd: number;
  total_friction_as_pct_nav: number;

  // 4. Assembly stage
  candidate_comparisons: CandidateComparison[];
  assembly_pool_summary: PoolSummary;

  pipeline_stages: any;
}

// ── Counter-proposer chat ─────────────────────────────────────────────────────
export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface WeightAdjustment {
  ticker: string;
  old_weight: number;
  new_weight: number;
  reason: string;
}

export interface CounterProposerSession {
  session_id: string;
  proposal: PositionsProposal;
  conversation: ChatMessage[];
  weight_adjustments: WeightAdjustment[];
  hold_current_positions: boolean;
  hold_current_reason: string;
}

export interface CounterProposerResponse {
  session_id: string;
  response: string;
  timestamp: string;
}

// ── Settings ──────────────────────────────────────────────────────────────────
export interface AppSettings {
  options_mode: boolean;
  broad_search_model: string;
  deep_reasoning_model: string;
  long_merge_model: string;
  max_positions: number;
  max_conviction_1_weight: number;
  max_conviction_2_weight: number;
  max_conviction_3_weight: number;

  enabled_economies: string[];
}

// ── Seed ticker selector ──────────────────────────────────────────────────────

export interface SeedTicker {
  ticker: string; // e.g. "AVGO"
  exchange: string; // e.g. "NASDAQ"
  name: string; // e.g. "Broadcom Inc."
  economy: string; // "us" | "uk" | "japan" | "korea"
  industry: string; // e.g. "semiconductors"
  direction_bias: "long" | "short";
  selection_reason: string; // Specific reason derived from KB
  macro_driver: string; // Which macro dynamic applies
  heuristic_flag: string; // e.g. "second_order_supply_chain"
  conviction_to_research: 1 | 2 | 3;
}

export interface SeedTickerResult {
  selected_at: string; // ISO timestamp from Python
  macro_themes: string[]; // List of macro themes driving selection
  tickers: SeedTicker[]; // The actual selected tickers with rationale
  run_metadata: {
    economies_covered: string[];
    industries_covered: string[];
    target_count: number;
  };
  error?: string; // Present if the LLM output failed to parse
}

// ── Position update payload (submit) ─────────────────────────────────────────
export type PositionUpdatePayload =
  | {
      asset_type: "stock";
      stock: string;
      primary_exchange: string;
      strategy: string;
      quantity: number;
      avg_price: number;
      operation: "upsert" | "delete";
    }
  | {
      asset_type: "option";
      stock: string;
      primary_exchange: string;
      strategy: string;
      quantity: number;
      avg_price: number;
      operation: "upsert" | "delete";
      expiry: string;
      strike: number;
      multiplier: string;
      option_type: "C" | "P";
    };

export interface FinalPosition {
  ticker: string;
  exchange: string;
  asset_type: AssetType;
  new_weight: number;
  avg_price: number;
  // IBKR contract fields — populated from contract selector for stock positions
  primary_exchange: string;
  currency: string;
  option_expiry?: string;
  option_strike?: number;
}

// ── Portfolio review (new page) ───────────────────────────────────────────────
export interface LivePosition {
  stock: string;
  quantity: number;
  avg_price: number;
  current_price: number;
  last_updated: string;
  // Computed on frontend:
  market_value?: number;
  unrealized_pnl?: number;
  unrealized_pnl_pct?: number;
  current_weight?: number;
}
