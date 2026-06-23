// src/news_ideas/components/PortfolioReview.tsx
//
// Displays the last accepted proposal vs live portfolio state.
// Data sources:
//   get_last_proposal()        → CounterProposerSession
//   get_current_positions()    → LivePosition[]
//   get_capital_now()          → { capital: number }

import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useEffect, useState } from "react";
import { useTheme } from "@mui/material/styles";
import { invoke } from "@tauri-apps/api/core";
import { TitleBox, VBox } from "../../theme";
import PositionCard from "./PositionCard";
import type {
  CounterProposerSession,
  LivePosition,
  ProposedPosition,
  TriggeredAlert,
  WeightAdjustment,
} from "../types";

// ── Drift thresholds ──────────────────────────────────────────────────────────
const DRIFT_WARN = 0.02; // 2%
const DRIFT_ALERT = 0.05; // 5%

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Enrich raw LivePosition with computed fields */
function enrichPositions(
  raw: LivePosition[],
  totalNav: number,
): LivePosition[] {
  return raw.map((p) => {
    const market_value = p.quantity * p.current_price;
    const unrealized_pnl = (p.current_price - p.avg_price) * p.quantity;
    const unrealized_pnl_pct =
      p.avg_price > 0 ? (p.current_price - p.avg_price) / p.avg_price : 0;
    const current_weight = totalNav > 0 ? market_value / totalNav : 0;
    return {
      ...p,
      market_value,
      unrealized_pnl,
      unrealized_pnl_pct,
      current_weight,
    };
  });
}

/** Effective target weight for a position = proposed_weight ± user adjustments */
function effectiveTarget(
  ticker: string,
  proposed_weight: number,
  adjustments: WeightAdjustment[],
): number {
  const adj = adjustments.find((a) => a.ticker === ticker);
  return adj ? adj.new_weight : proposed_weight;
}

/** Absolute drift colour */
function driftColor(drift: number): string {
  const abs = Math.abs(drift);
  if (abs >= DRIFT_ALERT) return "#ef4444";
  if (abs >= DRIFT_WARN) return "#f59e0b";
  return "#10b981";
}

/** Format a number as signed % string */
function pct(v: number, decimals = 1): string {
  return `${v >= 0 ? "+" : ""}${(v * 100).toFixed(decimals)}%`;
}

function fmt(v: number, decimals = 1): string {
  return `${(v * 100).toFixed(decimals)}%`;
}

function money(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "+";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}k`;
  return `${sign}$${abs.toFixed(0)}`;
}

function daysAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

// ── Shared column grid template ───────────────────────────────────────────────
// [ticker area] [target] [live] [drift] [P&L]
const COL_TEMPLATE = "1fr 52px 52px 64px 72px 36px";

// ── Sub-components ────────────────────────────────────────────────────────────

const ColHeader = ({
  children,
  align = "right",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) => (
  <Typography
    variant="caption"
    sx={{
      fontSize: "0.58rem",
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "0.06em",
      color: "text.disabled",
      textAlign: align,
      lineHeight: 1,
    }}
  >
    {children}
  </Typography>
);

const NumCell = ({
  value,
  color,
  sub,
  subColor,
}: {
  value: string;
  color?: string;
  sub?: string;
  subColor?: string;
}) => (
  <Box sx={{ textAlign: "right" }}>
    <Typography
      variant="caption"
      sx={{
        fontWeight: 700,
        fontSize: "0.72rem",
        color: color ?? "text.primary",
        lineHeight: 1.1,
        display: "block",
      }}
    >
      {value}
    </Typography>
    {sub && (
      <Typography
        variant="caption"
        sx={{
          fontSize: "0.55rem",
          color: subColor ?? "text.disabled",
          lineHeight: 1,
          display: "block",
        }}
      >
        {sub}
      </Typography>
    )}
  </Box>
);

// Inline drift bar — centred zero, left = negative, right = positive
const DriftBar = ({ drift }: { drift: number }) => {
  const color = driftColor(drift);
  const clampedPct = Math.min(Math.abs(drift) / 0.1, 1) * 50; // max 10% maps to 50%
  const isPos = drift >= 0;
  return (
    <Tooltip title={`${pct(drift, 2)} vs target`}>
      <Box
        sx={{
          position: "relative",
          height: 4,
          width: "100%",
          borderRadius: 2,
          background: "rgba(128,128,128,0.12)",
          cursor: "help",
        }}
      >
        {/* centre tick */}
        <Box
          sx={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: 0,
            width: 1,
            background: "rgba(128,128,128,0.25)",
          }}
        />
        {/* drift fill */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            bottom: 0,
            borderRadius: 2,
            background: color,
            width: `${clampedPct}%`,
            left: isPos ? "50%" : undefined,
            right: isPos ? undefined : "50%",
          }}
        />
      </Box>
    </Tooltip>
  );
};

// Stat tile used in the capital header
const StatTile = ({
  label,
  value,
  sub,
  color,
  isDark,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: string;
  isDark: boolean;
}) => (
  <Box
    sx={{
      flex: 1,
      minWidth: 0,
      px: 1.5,
      py: 1.25,
      borderRadius: 1.5,
      background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.025)",
      border: "1px solid",
      borderColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)",
    }}
  >
    <Typography
      variant="caption"
      sx={{
        fontSize: "0.55rem",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
        color: "text.disabled",
        display: "block",
        mb: 0.4,
      }}
    >
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{
        fontWeight: 800,
        fontSize: "0.85rem",
        lineHeight: 1,
        color: color ?? "text.primary",
      }}
    >
      {value}
    </Typography>
    {sub && (
      <Typography
        variant="caption"
        sx={{
          fontSize: "0.58rem",
          color: color ?? "text.secondary",
          display: "block",
          mt: 0.3,
        }}
      >
        {sub}
      </Typography>
    )}
  </Box>
);

// Alert severity colour
const ALERT_COLOR: Record<string, string> = {
  informational: "#3b82f6",
  action_required: "#f59e0b",
  urgent: "#ef4444",
};

// ── Position row ──────────────────────────────────────────────────────────────
interface PositionRowProps {
  proposed: ProposedPosition;
  targetWeight: number;
  live: LivePosition | undefined;
  alert: TriggeredAlert | undefined;
  isDark: boolean;
}

function PositionRow({
  proposed,
  targetWeight,
  live,
  alert,
  isDark,
}: PositionRowProps) {
  const [expanded, setExpanded] = useState(false);

  const liveWeight = live?.current_weight ?? 0;
  const drift = liveWeight - targetWeight;
  const absDrift = Math.abs(drift);
  const dc = driftColor(drift);

  const pnl = live?.unrealized_pnl ?? null;
  const pnlPct = live?.unrealized_pnl_pct ?? null;
  const isLong = proposed.direction === "long";
  const noLive = live == null;

  // Alert border accent
  const alertAccent =
    alert?.severity === "urgent"
      ? "#ef4444"
      : alert?.severity === "action_required"
        ? "#f59e0b"
        : null;

  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 1,
        borderRadius: 2,
        overflow: "hidden",
        borderColor: alertAccent
          ? `${alertAccent}50`
          : noLive
            ? "rgba(245,158,11,0.25)"
            : absDrift >= DRIFT_ALERT
              ? "rgba(239,68,68,0.2)"
              : "transparent",
        background: noLive
          ? isDark
            ? "rgba(245,158,11,0.04)"
            : "rgba(245,158,11,0.02)"
          : "transparent",
        transition: "box-shadow 0.15s",
        "&:hover": {
          boxShadow: isDark
            ? "0 2px 10px rgba(0,0,0,0.35)"
            : "0 2px 10px rgba(0,0,0,0.07)",
        },
      }}
    >
      {/* Alert strip */}
      {alertAccent && (
        <Box
          sx={{
            height: 2,
            background: alertAccent,
            borderRadius: "2px 2px 0 0",
          }}
        />
      )}

      {/* ── Main row ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: COL_TEMPLATE,
          alignItems: "center",
          gap: 0.5,
          px: 1.5,
          py: 1.25,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Ticker area */}
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 0.75, minWidth: 0 }}
        >
          <Box
            sx={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: isLong
                ? "rgba(16,185,129,0.12)"
                : "rgba(239,68,68,0.12)",
              flexShrink: 0,
            }}
          >
            {isLong ? (
              <ArrowUpwardIcon sx={{ fontSize: 11, color: "#10b981" }} />
            ) : (
              <ArrowDownwardIcon sx={{ fontSize: 11, color: "#ef4444" }} />
            )}
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                flexWrap: "wrap",
              }}
            >
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, fontSize: "0.78rem", lineHeight: 1.2 }}
              >
                {proposed.ticker}
              </Typography>
              {alert && (
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: ALERT_COLOR[alert.severity],
                    flexShrink: 0,
                  }}
                />
              )}
              {noLive && (
                <Chip
                  label="not open"
                  size="small"
                  sx={{
                    fontSize: "0.52rem",
                    height: 13,
                    background: "rgba(245,158,11,0.15)",
                    color: "#f59e0b",
                    fontWeight: 700,
                  }}
                />
              )}
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.58rem",
                color: "text.disabled",
                lineHeight: 1,
                display: "block",
              }}
            >
              {proposed.position_state.toUpperCase()} · C{proposed.conviction}
            </Typography>
          </Box>
        </Box>

        {/* Target weight */}
        <NumCell
          value={fmt(targetWeight)}
          sub="target"
          subColor="text.disabled"
        />

        {/* Live weight */}
        <NumCell
          value={noLive ? "—" : fmt(liveWeight)}
          color={noLive ? "text.disabled" : dc}
          sub={noLive ? "" : "live"}
          subColor="text.disabled"
        />

        {/* Drift — bar + label stacked */}
        <Box>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              textAlign: "center",
              fontSize: "0.62rem",
              fontWeight: 700,
              color: noLive ? "text.disabled" : dc,
              lineHeight: 1.2,
              mb: 0.3,
            }}
          >
            {noLive ? "—" : pct(drift, 1)}
          </Typography>
          <DriftBar drift={noLive ? 0 : drift} />
        </Box>

        {/* P&L */}
        {pnl != null && pnlPct != null ? (
          <NumCell
            value={money(pnl)}
            color={pnl >= 0 ? "#10b981" : "#ef4444"}
            sub={pct(pnlPct, 1)}
            subColor={pnl >= 0 ? "#10b981" : "#ef4444"}
          />
        ) : (
          <NumCell value="—" color="text.disabled" />
        )}

        {/* Expand */}
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <IconButton
            size="small"
            sx={{ color: "text.disabled", p: 0.25 }}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            {expanded ? (
              <ExpandLessIcon sx={{ fontSize: 16 }} />
            ) : (
              <ExpandMoreIcon sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        </Box>
      </Box>

      {/* ── Expanded: live position detail + full PositionCard ── */}
      <Collapse in={expanded} unmountOnExit>
        <Divider />
        <Box sx={{ px: 1.5, pt: 1.25, pb: 0.5 }}>
          {/* Live position detail row */}
          {live ? (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 1,
                mb: 1.5,
              }}
            >
              {[
                ["Qty", live.quantity.toLocaleString()],
                ["Avg price", `$${live.avg_price.toFixed(2)}`],
                ["Curr price", `$${live.current_price.toFixed(2)}`],
                [
                  "Mkt value",
                  `$${(live.market_value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                ],
              ].map(([label, value]) => (
                <Box key={label}>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.55rem",
                      color: "text.disabled",
                      display: "block",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {label}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, fontSize: "0.7rem" }}
                  >
                    {value}
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Box
              sx={{
                mb: 1.5,
                p: 1,
                borderRadius: 1,
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
              }}
            >
              <Typography
                variant="caption"
                sx={{ color: "#f59e0b", fontWeight: 600 }}
              >
                ⚠️ Position not found in live portfolio — may not have been
                opened yet, or was closed outside the system.
              </Typography>
            </Box>
          )}

          {/* Alert detail */}
          {alert && (
            <Box
              sx={{
                mb: 1.5,
                p: 1,
                borderRadius: 1,
                background: `${ALERT_COLOR[alert.severity]}0d`,
                border: `1px solid ${ALERT_COLOR[alert.severity]}30`,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  mb: 0.25,
                }}
              >
                <ErrorOutlineIcon
                  sx={{ fontSize: 13, color: ALERT_COLOR[alert.severity] }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: ALERT_COLOR[alert.severity],
                    fontSize: "0.62rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {alert.alert_type.replace(/_/g, " ")}
                </Typography>
                <Chip
                  label={alert.recommended_action.toUpperCase()}
                  size="small"
                  sx={{
                    ml: "auto",
                    fontSize: "0.52rem",
                    height: 14,
                    background: `${ALERT_COLOR[alert.severity]}18`,
                    color: ALERT_COLOR[alert.severity],
                    fontWeight: 700,
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {alert.description}
              </Typography>
            </Box>
          )}

          {/* Price corridor summary */}
          <Box
            sx={{
              mb: 1.5,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 0.75,
            }}
          >
            <Box
              sx={{
                p: 1,
                borderRadius: 1,
                background: "rgba(239,68,68,0.07)",
                border: "1px solid rgba(239,68,68,0.18)",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "#ef4444",
                  fontWeight: 700,
                  fontSize: "0.6rem",
                  display: "block",
                }}
              >
                ⛔ Invalidation
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontWeight: 800, fontSize: "0.72rem", color: "#ef4444" }}
              >
                ${proposed.timing.invalidation_condition.level.toFixed(2)}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "text.disabled",
                  fontSize: "0.57rem",
                  display: "block",
                }}
              >
                {proposed.timing.invalidation_condition.rationale}
              </Typography>
            </Box>
            <Box
              sx={{
                p: 1,
                borderRadius: 1,
                background: "rgba(16,185,129,0.07)",
                border: "1px solid rgba(16,185,129,0.18)",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "#10b981",
                  fontWeight: 700,
                  fontSize: "0.6rem",
                  display: "block",
                }}
              >
                ✓ Validation
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontWeight: 800, fontSize: "0.72rem", color: "#10b981" }}
              >
                ${proposed.timing.validation_condition.level.toFixed(2)}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  color: "text.disabled",
                  fontSize: "0.57rem",
                  display: "block",
                }}
              >
                {proposed.timing.validation_condition.rationale}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Full PositionCard (read-only, no slider) */}
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          <PositionCard
            position={proposed}
            onWeightChange={() => {}}
            showWeightSlider={false}
            liveWeight={live?.current_weight}
          />
        </Box>
      </Collapse>
    </Paper>
  );
}

// ── Orphan row — live position with no corresponding proposal entry ────────────
function OrphanRow({ live, isDark }: { live: LivePosition; isDark: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const pnl = live.unrealized_pnl ?? 0;
  const pnlPct = live.unrealized_pnl_pct ?? 0;
  const mv = live.market_value ?? 0;
  const w = live.current_weight ?? 0;

  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 1,
        borderRadius: 2,
        overflow: "hidden",
        borderColor: "rgba(168,85,247,0.25)",
        background: isDark ? "rgba(168,85,247,0.03)" : "rgba(168,85,247,0.02)",
        transition: "box-shadow 0.15s",
        "&:hover": {
          boxShadow: isDark
            ? "0 2px 10px rgba(0,0,0,0.35)"
            : "0 2px 10px rgba(0,0,0,0.07)",
        },
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: COL_TEMPLATE,
          alignItems: "center",
          gap: 0.5,
          px: 1.5,
          py: 1.25,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Ticker area */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box
            sx={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(168,85,247,0.15)",
              flexShrink: 0,
            }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 11, color: "#a855f7" }} />
          </Box>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, fontSize: "0.78rem", lineHeight: 1.2 }}
              >
                {live.stock}
              </Typography>
              <Chip
                label="not in proposal"
                size="small"
                sx={{
                  fontSize: "0.52rem",
                  height: 13,
                  background: "rgba(168,85,247,0.15)",
                  color: "#a855f7",
                  fontWeight: 700,
                }}
              />
            </Box>
            <Typography
              variant="caption"
              sx={{
                fontSize: "0.58rem",
                color: "text.disabled",
                lineHeight: 1,
                display: "block",
              }}
            >
              OUTSIDE PROPOSAL
            </Typography>
          </Box>
        </Box>

        {/* Target — N/A */}
        <NumCell
          value="—"
          color="text.disabled"
          sub="target"
          subColor="text.disabled"
        />

        {/* Live weight */}
        <NumCell value={fmt(w)} sub="live" subColor="text.disabled" />

        {/* Drift — no target, so show live weight bar from zero */}
        <Box>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              textAlign: "center",
              fontSize: "0.62rem",
              fontWeight: 700,
              color: "#a855f7",
              lineHeight: 1.2,
              mb: 0.3,
            }}
          >
            +{fmt(w)}
          </Typography>
          <DriftBar drift={w} />
        </Box>

        {/* P&L */}
        <NumCell
          value={money(pnl)}
          color={pnl >= 0 ? "#10b981" : "#ef4444"}
          sub={pct(pnlPct, 1)}
          subColor={pnl >= 0 ? "#10b981" : "#ef4444"}
        />

        {/* Expand */}
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <IconButton
            size="small"
            sx={{ color: "text.disabled", p: 0.25 }}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            {expanded ? (
              <ExpandLessIcon sx={{ fontSize: 16 }} />
            ) : (
              <ExpandMoreIcon sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        </Box>
      </Box>

      <Collapse in={expanded} unmountOnExit>
        <Divider />
        <Box
          sx={{
            px: 1.5,
            py: 1.25,
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 1,
          }}
        >
          {[
            ["Qty", live.quantity.toLocaleString()],
            ["Avg price", `$${live.avg_price.toFixed(2)}`],
            ["Curr price", `$${live.current_price.toFixed(2)}`],
            [
              "Mkt value",
              `$${mv.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
            ],
          ].map(([label, value]) => (
            <Box key={label}>
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.55rem",
                  color: "text.disabled",
                  display: "block",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {label}
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, fontSize: "0.7rem" }}
              >
                {value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Paper>
  );
}

// ── Alerts strip ──────────────────────────────────────────────────────────────
function AlertsStrip({
  alerts,
  // isDark,
}: {
  alerts: TriggeredAlert[];
  // isDark: boolean;
}) {
  const [open, setOpen] = useState(true);
  if (alerts.length === 0) return null;

  const urgent = alerts.filter((a) => a.severity === "urgent").length;
  const action = alerts.filter((a) => a.severity === "action_required").length;
  const headerColor =
    urgent > 0 ? "#ef4444" : action > 0 ? "#f59e0b" : "#3b82f6";

  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 2,
        borderRadius: 2,
        borderColor: `${headerColor}40`,
        overflow: "hidden",
      }}
    >
      {/* Collapsible header */}
      <Box
        onClick={() => setOpen((v) => !v)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          px: 2,
          py: 1.25,
          cursor: "pointer",
          background: `${headerColor}08`,
          "&:hover": { background: `${headerColor}12` },
        }}
      >
        <ErrorOutlineIcon sx={{ fontSize: 15, color: headerColor }} />
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, flex: 1, color: headerColor }}
        >
          Triggered Alerts
        </Typography>
        {urgent > 0 && (
          <Chip
            label={`${urgent} urgent`}
            size="small"
            sx={{
              fontSize: "0.58rem",
              background: "rgba(239,68,68,0.15)",
              color: "#ef4444",
              fontWeight: 700,
            }}
          />
        )}
        {action > 0 && (
          <Chip
            label={`${action} action needed`}
            size="small"
            sx={{
              fontSize: "0.58rem",
              background: "rgba(245,158,11,0.15)",
              color: "#f59e0b",
              fontWeight: 700,
            }}
          />
        )}
        <IconButton
          size="small"
          sx={{ color: "text.disabled", p: 0.25, ml: 0.5 }}
        >
          {open ? (
            <ExpandLessIcon sx={{ fontSize: 16 }} />
          ) : (
            <ExpandMoreIcon sx={{ fontSize: 16 }} />
          )}
        </IconButton>
      </Box>

      <Collapse in={open}>
        <Box
          sx={{
            px: 2,
            pb: 1.5,
            pt: 1,
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
          }}
        >
          {alerts.map((a, i) => {
            const c = ALERT_COLOR[a.severity];
            return (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  gap: 1,
                  alignItems: "flex-start",
                  p: 1,
                  borderRadius: 1,
                  background: `${c}08`,
                  border: `1px solid ${c}20`,
                }}
              >
                <Box
                  sx={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: c,
                    mt: 0.6,
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                      flexWrap: "wrap",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, color: c, fontSize: "0.65rem" }}
                    >
                      {a.ticker}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: "0.6rem" }}
                    >
                      {a.alert_type.replace(/_/g, " ")}
                    </Typography>
                    <Chip
                      label={a.recommended_action.toUpperCase()}
                      size="small"
                      sx={{
                        ml: "auto",
                        fontSize: "0.52rem",
                        height: 14,
                        background: `${c}18`,
                        color: c,
                        fontWeight: 700,
                      }}
                    />
                  </Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mt: 0.25, fontSize: "0.62rem" }}
                  >
                    {a.description}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Collapse>
    </Paper>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PortfolioReview() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [session, setSession] = useState<CounterProposerSession | null>(null);
  const [livePositions, setLivePositions] = useState<LivePosition[]>([]);
  const [currentCapital, setCurrentCapital] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rawSession, rawPositions, capitalRes] = await Promise.all([
        invoke<{ result: CounterProposerSession }>("get_last_counter_proposal"),
        invoke<LivePosition[]>("get_current_positions"),
        invoke<{ sgd_capital: number }>("get_capital_now"),
      ]);
      setSession(rawSession.result);
      const nav = capitalRes.sgd_capital;
      setCurrentCapital(nav);
      setLivePositions(enrichPositions(rawPositions, nav));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ── Derived data ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <VBox
        sx={{
          p: 3,
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: 2,
        }}
      >
        <CircularProgress size={28} />
        <Typography variant="body2" color="text.secondary">
          Loading portfolio review…
        </Typography>
      </VBox>
    );
  }

  if (error || !session) {
    return (
      <VBox
        sx={{
          p: 3,
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: 2,
        }}
      >
        <ErrorOutlineIcon sx={{ fontSize: 36, color: "error.main" }} />
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center" }}
        >
          {error ?? "No accepted proposal found."}
        </Typography>
        <Button variant="outlined" onClick={load} startIcon={<RefreshIcon />}>
          Retry
        </Button>
      </VBox>
    );
  }

  const proposal = session.proposal;
  const adjustments = session.weight_adjustments;

  // All proposal positions (proposed_trades + unchanged)
  const allProposed = [
    ...proposal.proposed_trades,
    ...proposal.unchanged_positions,
  ];

  // Effective target weight per ticker
  const targetByTicker: Record<string, number> = {};
  allProposed.forEach((p) => {
    targetByTicker[p.ticker] = effectiveTarget(
      p.ticker,
      p.proposed_weight,
      adjustments,
    );
  });

  // Build live lookup by stock symbol
  const liveByTicker: Record<string, LivePosition> = {};
  livePositions.forEach((p) => {
    liveByTicker[p.stock] = p;
  });

  // Alert lookup
  const alertByTicker: Record<string, TriggeredAlert> = {};
  proposal.triggered_alerts?.forEach((a) => {
    alertByTicker[a.ticker] = a;
  });

  // Orphan positions: live but not in any proposal list
  const proposalTickers = new Set(allProposed.map((p) => p.ticker));
  const orphans = livePositions.filter((p) => !proposalTickers.has(p.stock));

  // ── Aggregate stats ─────────────────────────────────────────────────────────
  const proposalCapital = proposal.capital_at_proposal;
  const capitalNow = currentCapital ?? 0;
  const capitalChange =
    proposalCapital > 0 ? (capitalNow - proposalCapital) / proposalCapital : 0;

  // Total unrealized P&L across all live positions
  const totalPnl = livePositions.reduce(
    (sum, p) => sum + (p.unrealized_pnl ?? 0),
    0,
  );
  const totalMv = livePositions.reduce(
    (sum, p) => sum + (p.market_value ?? 0),
    0,
  );
  const totalPnlPct = totalMv > 0 ? totalPnl / (totalMv - totalPnl) : 0;

  // Portfolio drift score: sum of |drift| across all proposed positions
  const totalDrift = allProposed.reduce((sum, p) => {
    const target = targetByTicker[p.ticker];
    const live = liveByTicker[p.ticker]?.current_weight ?? 0;
    return sum + Math.abs(live - target);
  }, 0);
  const driftScoreColor =
    totalDrift >= 0.15 ? "#ef4444" : totalDrift >= 0.06 ? "#f59e0b" : "#10b981";

  // Sort proposed positions: urgent alerts first, then by |drift| desc
  const sortedProposed = [...allProposed].sort((a, b) => {
    const aUrgent =
      alertByTicker[a.ticker]?.severity === "urgent"
        ? 0
        : alertByTicker[a.ticker]?.severity === "action_required"
          ? 1
          : 2;
    const bUrgent =
      alertByTicker[b.ticker]?.severity === "urgent"
        ? 0
        : alertByTicker[b.ticker]?.severity === "action_required"
          ? 1
          : 2;
    if (aUrgent !== bUrgent) return aUrgent - bUrgent;
    const aDrift = Math.abs(
      (liveByTicker[a.ticker]?.current_weight ?? 0) - targetByTicker[a.ticker],
    );
    const bDrift = Math.abs(
      (liveByTicker[b.ticker]?.current_weight ?? 0) - targetByTicker[b.ticker],
    );
    return bDrift - aDrift;
  });

  return (
    <VBox sx={{ p: 2, gap: 0, width: "100%" }}>
      {/* ── Title bar ── */}
      <TitleBox sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h1">Portfolio Review</Typography>
          <Typography variant="caption" color="text.secondary">
            Last proposal accepted {daysAgo(proposal.generated_at)} ·{" "}
            {new Date(proposal.generated_at).toLocaleDateString()}
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={load}
          sx={{ color: "text.secondary" }}
          title="Refresh"
        >
          <RefreshIcon fontSize="small" />
        </IconButton>
      </TitleBox>

      {/* ── Zone A: Capital & portfolio stats ── */}
      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <StatTile
          label="Capital now"
          value={`$${capitalNow.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub={`${pct(capitalChange, 2)} since proposal`}
          color={capitalChange >= 0 ? "#10b981" : "#ef4444"}
          isDark={isDark}
        />
        <StatTile
          label="At proposal"
          value={`$${proposalCapital.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          sub={new Date(proposal.generated_at).toLocaleDateString()}
          isDark={isDark}
        />
        <StatTile
          label="Unrealized P&L"
          value={money(totalPnl)}
          sub={pct(totalPnlPct, 2)}
          color={totalPnl >= 0 ? "#10b981" : "#ef4444"}
          isDark={isDark}
        />
        <StatTile
          label="Portfolio drift"
          value={fmt(totalDrift)}
          sub={
            totalDrift >= DRIFT_ALERT
              ? "rebalance needed"
              : totalDrift >= DRIFT_WARN
                ? "minor drift"
                : "on target"
          }
          color={driftScoreColor}
          isDark={isDark}
        />
      </Box>

      {/* ── Zone B: Triggered alerts ── */}
      <AlertsStrip alerts={proposal.triggered_alerts ?? []} />

      {/* ── Zone C: Position table ── */}
      <Box sx={{ mb: 0.5 }}>
        {/* Sticky column headers */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: COL_TEMPLATE,
            alignItems: "center",
            gap: 0.5,
            px: 1.5,
            py: 0.75,
            mb: 0.5,
            borderRadius: 1.5,
            background: isDark
              ? "rgba(255,255,255,0.025)"
              : "rgba(0,0,0,0.025)",
            border: "1px solid",
            borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
            position: "sticky",
            top: 0,
            zIndex: 2,
          }}
        >
          <ColHeader align="left">Position</ColHeader>
          <ColHeader>Target</ColHeader>
          <ColHeader>Live</ColHeader>
          <ColHeader>Drift</ColHeader>
          <ColHeader>P&amp;L</ColHeader>
          <Box /> {/* expand col */}
        </Box>

        {/* Proposal position rows */}
        {sortedProposed.map((pos) => (
          <PositionRow
            key={pos.ticker}
            proposed={pos}
            targetWeight={targetByTicker[pos.ticker]}
            live={liveByTicker[pos.ticker]}
            alert={alertByTicker[pos.ticker]}
            isDark={isDark}
          />
        ))}
      </Box>

      {/* ── Zone D: Removed positions still open ── */}
      {proposal.removed_positions.length > 0 &&
        (() => {
          const stillOpen = proposal.removed_positions.filter(
            (t) => liveByTicker[t] != null,
          );
          if (stillOpen.length === 0) return null;
          return (
            <Box sx={{ mt: 1.5, mb: 0.5 }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "#ef4444",
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "#ef4444",
                    fontSize: "0.65rem",
                  }}
                >
                  Removed — still open ({stillOpen.length})
                </Typography>
              </Box>
              {stillOpen.map((ticker) => (
                <OrphanRow
                  key={ticker}
                  live={liveByTicker[ticker]}
                  isDark={isDark}
                />
              ))}
            </Box>
          );
        })()}

      {/* ── Zone E: Orphan positions ── */}
      {orphans.length > 0 && (
        <Box sx={{ mt: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#a855f7",
              }}
            />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#a855f7",
                fontSize: "0.65rem",
              }}
            >
              Outside proposal ({orphans.length})
            </Typography>
          </Box>
          {orphans.map((live) => (
            <OrphanRow key={live.stock} live={live} isDark={isDark} />
          ))}
        </Box>
      )}

      {/* ── Footer: last updated ── */}
      <Typography
        variant="caption"
        color="text.disabled"
        sx={{
          display: "block",
          textAlign: "center",
          mt: 2,
          fontSize: "0.58rem",
        }}
      >
        Live prices as of{" "}
        {livePositions.length > 0
          ? new Date(
              Math.max(
                ...livePositions.map((p) => new Date(p.last_updated).getTime()),
              ),
            ).toLocaleTimeString()
          : "—"}
        {" · "}
        drift thresholds: yellow ≥ {(DRIFT_WARN * 100).toFixed(0)}%, red ≥{" "}
        {(DRIFT_ALERT * 100).toFixed(0)}%
      </Typography>
    </VBox>
  );
}
