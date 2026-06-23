import { PositionsProposal } from "./types";

export const mockProposal: PositionsProposal = {
  generated_at: "2026-05-21T15:30:00Z",
  capital_at_proposal: 250000,

  triggered_alerts: [
    {
      ticker: "NVDA",
      alert_type: "approaching_validation",
      severity: "informational",
      description:
        "Price nearing breakout confirmation above prior resistance.",
      recommended_action: "hold",
    },
    {
      ticker: "TSLA",
      alert_type: "invalidation_hit",
      severity: "urgent",
      description:
        "Gross margin compression thesis worsening after recent delivery guidance cut.",
      recommended_action: "close",
    },
  ],

  proposed_trades: [
    {
      ticker: "AVGO",
      primary_exchange: "NASDAQ",
      currency: "USD",
      direction: "long",
      asset_type: "stock",
      proposed_weight: 0.14,
      current_weight: 0.08,
      conviction: 3,

      drivers: [
        {
          title: "AI networking demand",
          description:
            "Hyperscaler demand for custom AI networking chips remains supply constrained.",
          type: "fundamental",
          overlooked_reason:
            "Market still underestimating networking attach rates for inference clusters.",
        },
        {
          title: "Enterprise AI capex acceleration",
          description:
            "Large enterprises accelerating GenAI deployment spending.",
          type: "macro",
        },
      ],

      economy: "us",
      industry: "semiconductors",
      industry_file_key: "us_semiconductors",

      industry_context: {
        economy: "United States",
        industry: "Semiconductors",
        tailwind: "AI infrastructure spending cycle",
        macro_linkage:
          "Higher cloud capex and sovereign AI initiatives driving networking demand.",
      },

      timing: {
        horizon_days: 120,
        catalyst_date: "2026-08-15",
        validation_condition: {
          level: 245,
          rationale:
            "Breakout above prior consolidation range confirms institutional accumulation.",
          action: "buy",
          signal_type: "technical",
        },
        invalidation_condition: {
          level: 198,
          rationale:
            "Break below long-term support invalidates momentum thesis.",
          action: "close",
          signal_type: "technical",
        },
        price_corridor_rationale:
          "Expected consolidation between earnings cycles before expansion move.",
        monitoring_checklist: [
          "Hyperscaler capex commentary",
          "Gross margin trend",
          "Supply chain lead times",
        ],
      },

      position_state: "increase",

      friction_estimate: {
        estimated_shares_or_contracts: 120,
        commission_usd: 1.8,
        estimated_slippage_usd: 45,
        total_friction_usd: 46.8,
        friction_as_pct_of_position: 0.0009,
        round_trip_friction_usd: 93.6,
        round_trip_friction_pct: 0.0018,
        ibkr_tier: "pro",
        adv_used: 0.00003,
        spread_tier: "large_cap",
      },

      friction_justification:
        "Deep liquidity and tight spreads make sizing efficient.",
    },

    {
      ticker: "TSLA",
      primary_exchange: "NASDAQ",
      currency: "USD",
      direction: "short",
      asset_type: "put_option",
      proposed_weight: 0.06,
      current_weight: 0.1,
      conviction: 2,

      drivers: [
        {
          title: "EV pricing pressure",
          description:
            "Continued discounting reducing automotive margins globally.",
          type: "fundamental",
        },
        {
          title: "Weak China demand",
          description:
            "Competitive domestic EV landscape pressuring market share.",
          type: "supply_chain",
        },
      ],

      economy: "us",
      industry: "electric_vehicles",

      industry_context: {
        economy: "United States",
        industry: "Electric Vehicles",
        headwind: "Global EV oversupply",
        macro_linkage:
          "Higher rates and weaker consumer demand impacting premium EV adoption.",
      },

      timing: {
        horizon_days: 60,
        catalyst_date: "2026-07-22",
        validation_condition: {
          level: 155,
          rationale: "Breakdown below support confirms bearish continuation.",
          action: "add",
          signal_type: "technical",
        },
        invalidation_condition: {
          level: 195,
          rationale:
            "Recovery above resistance invalidates near-term downside setup.",
          action: "close",
          signal_type: "technical",
        },
        price_corridor_rationale:
          "Volatility expected into earnings and delivery numbers.",
        monitoring_checklist: [
          "China registration data",
          "Gross margin estimates",
          "Vehicle ASP changes",
        ],
      },

      position_state: "decrease",

      friction_estimate: {
        estimated_shares_or_contracts: 18,
        commission_usd: 12,
        estimated_slippage_usd: 65,
        total_friction_usd: 77,
        friction_as_pct_of_position: 0.0024,
        round_trip_friction_usd: 154,
        round_trip_friction_pct: 0.0048,
        ibkr_tier: "pro",
        spread_tier: "large_cap",
      },

      friction_justification:
        "Options spreads widen materially during volatile sessions.",

      option_expiry: "2026-09-18",
      option_strike: 160,
      option_vs_stock_rationale:
        "Defined risk structure preferred due to elevated volatility.",
      option_greeks_context:
        "Position benefits from downside delta expansion and rising implied volatility.",
      option_monitoring:
        "Monitor IV crush risk post earnings and reassess theta decay weekly.",
    },
  ],

  unchanged_positions: [
    {
      ticker: "MSFT",
      primary_exchange: "NASDAQ",
      currency: "USD",
      direction: "long",
      asset_type: "stock",
      proposed_weight: 0.12,
      current_weight: 0.12,
      conviction: 3,

      drivers: [
        {
          title: "Enterprise AI monetization",
          description: "Copilot adoption improving enterprise pricing power.",
          type: "fundamental",
        },
      ],

      industry_context: {
        economy: "United States",
        industry: "Software",
        tailwind: "Enterprise AI deployment",
        macro_linkage:
          "Recurring enterprise software revenue resilient in slowing economy.",
      },

      timing: {
        horizon_days: 180,
        validation_condition: {
          level: 520,
          rationale: "Continuation above trend confirms earnings momentum.",
          action: "close",
          signal_type: "technical",
        },
        invalidation_condition: {
          level: 430,
          rationale: "Breakdown below major support weakens thesis.",
          action: "trim",
          signal_type: "technical",
        },
        price_corridor_rationale:
          "Expected steady compounding with moderate volatility.",
        monitoring_checklist: [
          "Azure growth",
          "Copilot monetization",
          "Operating margin trends",
        ],
      },

      position_state: "hold",

      friction_estimate: {
        estimated_shares_or_contracts: 50,
        commission_usd: 1,
        estimated_slippage_usd: 8,
        total_friction_usd: 9,
        friction_as_pct_of_position: 0.0002,
        round_trip_friction_usd: 18,
        round_trip_friction_pct: 0.0004,
        ibkr_tier: "pro",
        spread_tier: "large_cap",
      },

      friction_justification:
        "Very liquid mega-cap with minimal transaction costs.",
    },
  ],

  removed_positions: ["PYPL"],

  portfolio_thesis:
    "Portfolio tilted toward AI infrastructure beneficiaries while reducing exposure to weakening consumer discretionary demand.",

  macro_backdrop:
    "Global growth remains mixed with resilient US capex spending but slowing consumer demand and elevated rates.",

  total_estimated_friction_usd: 132.8,
  total_friction_as_pct_nav: 0.00053,

  candidate_comparisons: [
    {
      ticker_a: "AVGO",
      ticker_b: "AMD",

      conviction_comparison:
        "AVGO has stronger earnings visibility through networking demand.",
      catalyst_comparison:
        "AVGO benefits from near-term hyperscaler deployments.",
      risk_reward_comparison:
        "AVGO downside appears more protected by diversified revenue streams.",
      friction_comparison:
        "Both highly liquid, but AVGO spreads tighter for intended size.",

      verdict:
        "Selected AVGO due to stronger infrastructure positioning and earnings durability.",
    },
  ],

  assembly_pool_summary: {
    freed_pool_total: 0.08,
    from_closes: 0.05,
    from_trims: 0.03,

    allocated_to_new_trades: 0.07,
    returned_to_trimmed: 0.005,
    unallocated_residual: 0.005,

    candidates_funded: ["AVGO"],
    candidates_rejected: ["AMD"],

    rejection_reasons: {
      AMD: "Higher earnings volatility and weaker near-term catalysts.",
    },
  },

  pipeline_stages: {
    seed_generation: {
      total_candidates: 42,
      shortlisted: 10,
    },
    deep_research: {
      completed: 6,
      rejected: 3,
    },
    portfolio_assembly: {
      final_positions: 3,
    },
  },
};

export const mockCounterSession = {
  session_id: "1",
  proposal: mockProposal,
  conversation: [],
  weight_adjustments: [],
  hold_current_positions: false,
  hold_current_reason: "",
};
