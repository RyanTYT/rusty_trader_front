// src/news_ideas/components/PositionCard.tsx
import {
  Box,
  Chip,
  Collapse,
  Divider,
  IconButton,
  Paper,
  Slider,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import { useTheme } from "@mui/material/styles";
import { useEffect, useState } from "react";
import type {
  ProposedPosition,
  WeightAdjustment,
  TriggeredAlert,
  PriceThreshold,
} from "../types";

const CONVICTION_LABEL: Record<number, { label: string; color: string }> = {
  1: { label: "Speculative", color: "#f59e0b" },
  2: { label: "Moderate", color: "#3b82f6" },
  3: { label: "High", color: "#10b981" },
};

const DRIVER_COLOURS: Record<string, string> = {
  fundamental: "#8b5cf6",
  technical: "#3b82f6",
  macro: "#f59e0b",
  supply_chain: "#10b981",
  sentiment: "#ec4899",
  regulatory: "#ef4444",
};

const POSITION_STATE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  new: { label: "NEW", color: "#a855f7", bg: "rgba(168,85,247,0.15)" },
  increase: { label: "▲ ADD", color: "#10b981", bg: "rgba(16,185,129,0.15)" },
  decrease: { label: "▼ TRIM", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  replace: {
    label: "⇄ REPLACE",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.15)",
  },
  hold: { label: "HOLD", color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
};

const ALERT_SEVERITY_COLOUR: Record<string, string> = {
  informational: "#3b82f6",
  action_required: "#f59e0b",
  urgent: "#ef4444",
};

const SIGNAL_TYPE_LABEL: Record<string, string> = {
  technical: "Technical",
  fundamental_valuation: "Fundamental",
  volatility_stop: "Vol Stop",
};

export type PositionStatus = "proposed" | "unchanged" | "removed" | "new";

interface Props {
  position: ProposedPosition;
  weightAdjustment?: WeightAdjustment;
  onWeightChange: (ticker: string, newWeight: number, reason: string) => void;
  showWeightSlider?: boolean;
  fixedSlider?: boolean;
  status?: PositionStatus;
  alert?: TriggeredAlert; // Injected from parent if this ticker has an alert
  // For portfolio review: live drift display
  liveWeight?: number; // Current actual weight in portfolio
}

// ── Price corridor bar ────────────────────────────────────────────────────────
function PriceCorridorBar({
  invalidation,
  validation,
  currentPrice,
}: {
  invalidation: PriceThreshold;
  validation: PriceThreshold;
  currentPrice?: number;
}) {
  const low = Math.min(invalidation.level, validation.level);
  const high = Math.max(invalidation.level, validation.level);
  const range = high - low;
  if (range <= 0) return null;

  const invalidationIsLow = invalidation.level < validation.level;

  // Position of current price as % across the corridor
  const currentPct =
    currentPrice != null
      ? Math.max(0, Math.min(100, ((currentPrice - low) / range) * 100))
      : null;

  return (
    <Box sx={{ mt: 1 }}>
      <Box
        sx={{
          position: "relative",
          height: 6,
          borderRadius: 3,
          background: `linear-gradient(to right, 
            ${invalidationIsLow ? "rgba(239,68,68,0.25)" : "rgba(16,185,129,0.25)"} 0%, 
            rgba(107,114,128,0.15) 40%, 
            rgba(107,114,128,0.15) 60%, 
            ${invalidationIsLow ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"} 100%)`,
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        {/* Invalidation marker */}
        <Box
          sx={{
            position: "absolute",
            left: invalidationIsLow ? 0 : "100%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#ef4444",
            border: "2px solid rgba(239,68,68,0.4)",
            boxShadow: "0 0 6px rgba(239,68,68,0.5)",
          }}
        />
        {/* Validation marker */}
        <Box
          sx={{
            position: "absolute",
            left: invalidationIsLow ? "100%" : 0,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "#10b981",
            border: "2px solid rgba(16,185,129,0.4)",
            boxShadow: "0 0 6px rgba(16,185,129,0.5)",
          }}
        />
        {/* Current price marker */}
        {currentPct != null && (
          <Box
            sx={{
              position: "absolute",
              left: `${currentPct}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#fff",
              border: "2px solid #6b7280",
              zIndex: 2,
            }}
          />
        )}
      </Box>
      {/* Labels */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          mt: 0.5,
        }}
      >
        <Typography
          variant="caption"
          sx={{ color: "#ef4444", fontSize: "0.6rem", fontWeight: 700 }}
        >
          ⛔ ${invalidation.level.toFixed(2)}
        </Typography>
        {currentPrice != null && (
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", fontSize: "0.6rem" }}
          >
            ${currentPrice.toFixed(2)}
          </Typography>
        )}
        <Typography
          variant="caption"
          sx={{ color: "#10b981", fontSize: "0.6rem", fontWeight: 700 }}
        >
          ✓ ${validation.level.toFixed(2)}
        </Typography>
      </Box>
    </Box>
  );
}

// ── Compact alert badge (used in card header) ─────────────────────────────────
function AlertBadge({ alert }: { alert: TriggeredAlert }) {
  const color = ALERT_SEVERITY_COLOUR[alert.severity];
  return (
    <Tooltip
      title={`${alert.alert_type.replace(/_/g, " ")}: ${alert.description}`}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.25,
          px: 0.75,
          py: 0.25,
          borderRadius: 1,
          background: `${color}20`,
          border: `1px solid ${color}40`,
          cursor: "help",
        }}
      >
        <NotificationsActiveIcon sx={{ fontSize: 10, color }} />
        <Typography sx={{ fontSize: "0.55rem", fontWeight: 700, color }}>
          {alert.severity === "urgent"
            ? "URGENT"
            : alert.severity === "action_required"
              ? "ACTION"
              : "INFO"}
        </Typography>
      </Box>
    </Tooltip>
  );
}

// ── Drift indicator (for portfolio review) ────────────────────────────────────
function DriftIndicator({
  targetWeight,
  liveWeight,
}: {
  targetWeight: number;
  liveWeight: number;
}) {
  const drift = liveWeight - targetWeight;
  const absDrift = Math.abs(drift);
  const color =
    absDrift >= 0.05 ? "#ef4444" : absDrift >= 0.02 ? "#f59e0b" : "#10b981";

  return (
    <Tooltip
      title={`Target: ${(targetWeight * 100).toFixed(1)}% | Live: ${(liveWeight * 100).toFixed(1)}% | Drift: ${drift >= 0 ? "+" : ""}${(drift * 100).toFixed(1)}%`}
    >
      <Box sx={{ textAlign: "right", cursor: "help" }}>
        <Typography
          variant="body1"
          sx={{ fontWeight: 800, lineHeight: 1, color }}
        >
          {(liveWeight * 100).toFixed(1)}%
        </Typography>
        <Typography
          variant="caption"
          sx={{ fontSize: "0.6rem", color, fontWeight: 600 }}
        >
          {drift >= 0 ? "+" : ""}
          {(drift * 100).toFixed(1)}% drift
        </Typography>
      </Box>
    </Tooltip>
  );
}

export default function PositionCard({
  position,
  weightAdjustment,
  onWeightChange,
  showWeightSlider = true,
  fixedSlider = false,
  status = "proposed",
  alert,
  liveWeight,
}: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const conviction = CONVICTION_LABEL[position.conviction];
  const isLong = position.direction === "long";
  const isOption = position.asset_type !== "stock";
  const stateConfig =
    POSITION_STATE_CONFIG[position.position_state] ??
    POSITION_STATE_CONFIG.hold;

  const effectiveWeight =
    weightAdjustment?.new_weight ?? position.proposed_weight;
  const [sliderValue, setSliderValue] = useState(
    Math.round(effectiveWeight * 100),
  );
  useEffect(() => {
    setSliderValue(
      (weightAdjustment?.new_weight ?? position.proposed_weight) * 100,
    );
  }, [weightAdjustment]);

  const [reasonInput, setReasonInput] = useState(
    weightAdjustment?.reason ?? "",
  );
  useEffect(() => {
    setReasonInput(weightAdjustment?.reason ?? "");
  }, [weightAdjustment]);

  const [showReason, setShowReason] = useState(
    Math.abs(position.proposed_weight - position.current_weight) > 0.001,
  );
  const [expanded, setExpanded] = useState(false);

  const bg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const statusStyles: Record<
    PositionStatus,
    { borderColor?: string; bg?: string; opacity?: number }
  > = {
    proposed: {},
    unchanged: {
      borderColor: isDark ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.25)",
      bg: isDark ? "rgba(59,130,246,0.04)" : "rgba(59,130,246,0.03)",
    },
    removed: {
      borderColor: isDark ? "rgba(239,68,68,0.2)" : "rgba(239,68,68,0.2)",
      bg: isDark ? "rgba(239,68,68,0.04)" : "rgba(239,68,68,0.03)",
      opacity: 0.85,
    },
    new: {
      borderColor: isDark ? "rgba(168,85,247,0.25)" : "rgba(168,85,247,0.3)",
      bg: isDark ? "rgba(168,85,247,0.04)" : "rgba(168,85,247,0.03)",
    },
  };

  // Alert overrides border colour when urgent
  const alertBorderColor =
    alert?.severity === "urgent"
      ? "rgba(239,68,68,0.45)"
      : alert?.severity === "action_required"
        ? "rgba(245,158,11,0.35)"
        : undefined;

  const sx = statusStyles[status];

  const handleSliderChange = (_: Event, v: number | number[]) => {
    const val = Array.isArray(v) ? v[0] : v;
    setSliderValue(val);
    onWeightChange(position.ticker, val / 100, reasonInput);
    if (val !== Math.round(position.proposed_weight * 100)) {
      setShowReason(true);
    } else {
      setShowReason(false);
    }
  };

  const handleReasonBlur = () => {
    if (sliderValue !== Math.round(position.proposed_weight * 100)) {
      onWeightChange(position.ticker, sliderValue / 100, reasonInput);
    }
  };

  const weightChanged =
    Math.abs(sliderValue - Math.round(position.proposed_weight * 100)) > 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Paper
      variant="outlined"
      sx={{
        mb: 1.5,
        borderRadius: 2,
        background: sx.bg ?? bg,
        borderColor: alertBorderColor ?? sx.borderColor ?? border,
        opacity: sx.opacity ?? 1,
        position: "relative",
        overflow: "hidden",
        transition: "box-shadow 0.15s ease",
        "&:hover": {
          boxShadow: isDark
            ? "0 2px 12px rgba(0,0,0,0.4)"
            : "0 2px 12px rgba(0,0,0,0.08)",
        },
      }}
    >
      {/* ── Alert accent strip (left edge) ── */}
      {alert && (
        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 3,
            background: ALERT_SEVERITY_COLOUR[alert.severity],
            borderRadius: "2px 0 0 2px",
          }}
        />
      )}

      {/* ── Compact header (always visible) ── */}
      <Box
        sx={{
          px: alert ? 2.5 : 2,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Direction icon */}
        <Box
          sx={{
            width: 30,
            height: 30,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: isLong
              ? "rgba(16,185,129,0.15)"
              : "rgba(239,68,68,0.15)",
            flexShrink: 0,
          }}
        >
          {isLong ? (
            <ArrowUpwardIcon sx={{ fontSize: 15, color: "#10b981" }} />
          ) : (
            <ArrowDownwardIcon sx={{ fontSize: 15, color: "#ef4444" }} />
          )}
        </Box>

        {/* Ticker + chips */}
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
              variant="body1"
              sx={{ fontWeight: 700, lineHeight: 1.2 }}
            >
              {position.ticker}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ lineHeight: 1 }}
            >
              {position.primary_exchange}
            </Typography>

            {/* Position state badge */}
            <Chip
              label={stateConfig.label}
              size="small"
              sx={{
                background: stateConfig.bg,
                color: stateConfig.color,
                fontWeight: 700,
                fontSize: "0.55rem",
                height: 16,
                letterSpacing: "0.04em",
              }}
            />

            {isOption && (
              <Chip
                label={
                  position.asset_type === "call_option"
                    ? `CALL ${position.option_strike} ${position.option_expiry}`
                    : `PUT ${position.option_strike} ${position.option_expiry}`
                }
                size="small"
                sx={{
                  background: "rgba(139,92,246,0.15)",
                  color: "#8b5cf6",
                  fontWeight: 600,
                  fontSize: "0.6rem",
                  height: 16,
                }}
              />
            )}

            {status === "removed" && (
              <Tooltip title="Removed from proposal">
                <Chip
                  icon={
                    <RemoveCircleOutlineIcon
                      sx={{ fontSize: "0.75rem !important" }}
                    />
                  }
                  label="Removed"
                  size="small"
                  sx={{
                    background: "rgba(239,68,68,0.12)",
                    color: "#ef4444",
                    fontWeight: 600,
                    fontSize: "0.6rem",
                    height: 16,
                  }}
                />
              </Tooltip>
            )}
            {status === "unchanged" && (
              <Tooltip title="Unchanged in proposal">
                <Chip
                  icon={
                    <PauseCircleOutlineIcon
                      sx={{ fontSize: "0.75rem !important" }}
                    />
                  }
                  label="Unchanged"
                  size="small"
                  sx={{
                    background: "rgba(59,130,246,0.12)",
                    color: "#3b82f6",
                    fontWeight: 600,
                    fontSize: "0.6rem",
                    height: 16,
                  }}
                />
              </Tooltip>
            )}

            <Chip
              label={conviction.label}
              size="small"
              sx={{
                background: `${conviction.color}22`,
                color: conviction.color,
                fontWeight: 600,
                fontSize: "0.6rem",
                height: 16,
              }}
            />

            {/* Alert badge — only shown if present */}
            {alert && <AlertBadge alert={alert} />}
          </Box>

          {/* Driver type pills + friction summary on same row */}
          <Box
            sx={{
              display: "flex",
              gap: 0.5,
              mt: 0.5,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {position.drivers.slice(0, 3).map((d, i) => (
              <Typography
                key={i}
                variant="caption"
                sx={{
                  color: DRIVER_COLOURS[d.type] ?? "#666",
                  fontSize: "0.6rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {d.type.replace("_", " ")}
                {i < Math.min(position.drivers.length, 3) - 1 ? " ·" : ""}
              </Typography>
            ))}
            {/* Friction cost pill — compact but present */}
            {position.friction_estimate && (
              <Tooltip
                title={`Round-trip cost: $${position.friction_estimate.round_trip_friction_usd.toFixed(0)} (${(position.friction_estimate.round_trip_friction_pct * 100).toFixed(3)}%)`}
              >
                <Typography
                  variant="caption"
                  sx={{
                    ml: 0.5,
                    color: "text.disabled",
                    fontSize: "0.58rem",
                    cursor: "help",
                    borderLeft: "1px solid",
                    borderColor: "divider",
                    pl: 0.5,
                  }}
                >
                  {(
                    position.friction_estimate.round_trip_friction_pct * 100
                  ).toFixed(3)}
                  % friction
                </Typography>
              </Tooltip>
            )}
          </Box>
        </Box>

        {/* Weight display — shows drift if liveWeight provided, otherwise standard */}
        {liveWeight != null ? (
          <DriftIndicator
            targetWeight={effectiveWeight}
            liveWeight={liveWeight}
          />
        ) : (
          <Box sx={{ textAlign: "right", flexShrink: 0 }}>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 800,
                lineHeight: 1,
                color: weightChanged
                  ? sliderValue > Math.round(position.proposed_weight * 100)
                    ? "#10b981"
                    : "#ef4444"
                  : "text.primary",
              }}
            >
              {sliderValue.toFixed(1)}%
            </Typography>
            {position.current_weight > 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: "0.6rem" }}
              >
                was {(position.current_weight * 100).toFixed(1)}%
              </Typography>
            )}
          </Box>
        )}

        {/* Expand toggle */}
        <IconButton
          size="small"
          sx={{ ml: 0.5, flexShrink: 0, color: "text.secondary" }}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
          aria-label={expanded ? "Collapse details" : "Expand details"}
        >
          {expanded ? (
            <ExpandLessIcon fontSize="small" />
          ) : (
            <ExpandMoreIcon fontSize="small" />
          )}
        </IconButton>
      </Box>

      {/* ── Weight slider (always visible when enabled) ── */}
      {showWeightSlider && (
        <Box sx={{ px: 2, pb: expanded ? 0 : 1.5 }}>
          <Slider
            value={sliderValue}
            min={-25}
            max={25}
            step={0.5}
            onChange={handleSliderChange}
            onChangeCommitted={handleReasonBlur}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => `${v}%`}
            sx={{
              py: 0.5,
              color:
                sliderValue > Math.round(position.proposed_weight * 100)
                  ? "#10b981"
                  : sliderValue < Math.round(position.proposed_weight * 100)
                    ? "#ef4444"
                    : "primary.main",
            }}
            disabled={fixedSlider}
          />
          {showReason && (
            <TextField
              fullWidth
              size="small"
              placeholder="Reason for weight adjustment…"
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              onBlur={handleReasonBlur}
              sx={{ mt: 0.5, mb: 1 }}
              multiline
              maxRows={2}
            />
          )}
        </Box>
      )}

      {/* ── Expanded details ── */}
      <Collapse in={expanded} unmountOnExit>
        <Divider />
        <Box sx={{ p: 2 }}>
          {/* ── Alert detail (if present) ── */}
          {alert && (
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                borderRadius: 1.5,
                background: `${ALERT_SEVERITY_COLOUR[alert.severity]}10`,
                border: `1px solid ${ALERT_SEVERITY_COLOUR[alert.severity]}30`,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  gap: 0.75,
                  alignItems: "center",
                  mb: 0.5,
                }}
              >
                <ErrorOutlineIcon
                  sx={{
                    fontSize: 14,
                    color: ALERT_SEVERITY_COLOUR[alert.severity],
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color: ALERT_SEVERITY_COLOUR[alert.severity],
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {alert.alert_type.replace(/_/g, " ")}
                </Typography>
                <Chip
                  label={alert.recommended_action.toUpperCase()}
                  size="small"
                  sx={{
                    background: `${ALERT_SEVERITY_COLOUR[alert.severity]}20`,
                    color: ALERT_SEVERITY_COLOUR[alert.severity],
                    fontWeight: 700,
                    fontSize: "0.55rem",
                    height: 16,
                    ml: "auto",
                  }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {alert.description}
              </Typography>
            </Box>
          )}

          {/* ── Drivers ── */}
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              fontWeight: 600,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            Drivers
          </Typography>
          <Box
            sx={{
              mt: 1,
              mb: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            {position.drivers.map((driver, i) => (
              <Box
                key={i}
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  background: `${DRIVER_COLOURS[driver.type] ?? "#666"}11`,
                  borderLeft: `3px solid ${DRIVER_COLOURS[driver.type] ?? "#666"}`,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    mb: 0.5,
                  }}
                >
                  <Chip
                    label={driver.type.replace("_", " ")}
                    size="small"
                    sx={{
                      background: `${DRIVER_COLOURS[driver.type]}22`,
                      color: DRIVER_COLOURS[driver.type],
                      fontWeight: 600,
                      fontSize: "0.6rem",
                      height: 18,
                    }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {driver.title}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {driver.description}
                </Typography>
                {driver.overlooked_reason && (
                  <Box
                    sx={{
                      display: "flex",
                      gap: 0.5,
                      mt: 0.75,
                      alignItems: "flex-start",
                    }}
                  >
                    <InfoOutlinedIcon
                      sx={{
                        fontSize: 13,
                        color: "#f59e0b",
                        mt: "1px",
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ color: "#f59e0b", fontStyle: "italic" }}
                    >
                      Why overlooked: {driver.overlooked_reason}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))}
          </Box>

          {/* ── Industry context ── */}
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Industry Context
            </Typography>
            <Box
              sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 0.5 }}
            >
              <Chip
                label={`${position.industry_context.economy.toUpperCase()} · ${position.industry_context.industry}`}
                size="small"
                sx={{ fontSize: "0.65rem", alignSelf: "flex-start", mb: 0.5 }}
              />
              {position.industry_context.headwind && (
                <Box
                  sx={{ display: "flex", gap: 0.75, alignItems: "flex-start" }}
                >
                  <WarningAmberIcon
                    sx={{
                      fontSize: 14,
                      color: "#ef4444",
                      mt: "2px",
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="caption">
                    <strong>Headwind:</strong>{" "}
                    {position.industry_context.headwind}
                  </Typography>
                </Box>
              )}
              {position.industry_context.tailwind && (
                <Box
                  sx={{ display: "flex", gap: 0.75, alignItems: "flex-start" }}
                >
                  <TrendingUpIcon
                    sx={{
                      fontSize: 14,
                      color: "#10b981",
                      mt: "2px",
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="caption">
                    <strong>Tailwind:</strong>{" "}
                    {position.industry_context.tailwind}
                  </Typography>
                </Box>
              )}
              <Box
                sx={{ display: "flex", gap: 0.75, alignItems: "flex-start" }}
              >
                <InfoOutlinedIcon
                  sx={{
                    fontSize: 14,
                    color: "#3b82f6",
                    mt: "2px",
                    flexShrink: 0,
                  }}
                />
                <Typography variant="caption">
                  <strong>Macro linkage:</strong>{" "}
                  {position.industry_context.macro_linkage}
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* ── Timing & Price Corridor ── */}
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Timing & Price Corridor
            </Typography>
            <Box sx={{ mt: 1 }}>
              <Box sx={{ display: "flex", gap: 1, mb: 1, flexWrap: "wrap" }}>
                <Chip
                  label={`${position.timing.horizon_days}d horizon`}
                  size="small"
                  sx={{ fontSize: "0.65rem" }}
                />
                {position.timing.catalyst_date && (
                  <Chip
                    label={`🗓️ Catalyst: ${position.timing.catalyst_date}`}
                    size="small"
                    sx={{ fontSize: "0.65rem" }}
                  />
                )}
              </Box>

              {/* Price corridor visual */}
              <PriceCorridorBar
                invalidation={position.timing.invalidation_condition}
                validation={position.timing.validation_condition}
              />

              {/* Corridor rationale */}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1, mb: 1.5, fontStyle: "italic" }}
              >
                {position.timing.price_corridor_rationale}
              </Typography>

              {/* Invalidation detail */}
              <Box
                sx={{
                  p: 1,
                  borderRadius: 1,
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  mb: 1,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: "#ef4444",
                    display: "block",
                    fontWeight: 600,
                    mb: 0.25,
                  }}
                >
                  ⛔ Invalidation — $
                  {position.timing.invalidation_condition.level.toFixed(2)} (
                  {
                    SIGNAL_TYPE_LABEL[
                      position.timing.invalidation_condition.signal_type
                    ]
                  }
                  )
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {position.timing.invalidation_condition.rationale}
                </Typography>
                <Chip
                  label={position.timing.invalidation_condition.action.toUpperCase()}
                  size="small"
                  sx={{
                    mt: 0.5,
                    fontSize: "0.55rem",
                    height: 16,
                    background: "rgba(239,68,68,0.15)",
                    color: "#ef4444",
                    fontWeight: 700,
                  }}
                />
              </Box>

              {/* Validation detail */}
              <Box
                sx={{
                  p: 1,
                  borderRadius: 1,
                  background: "rgba(16,185,129,0.08)",
                  border: "1px solid rgba(16,185,129,0.2)",
                  mb: 1,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    color: "#10b981",
                    display: "block",
                    fontWeight: 600,
                    mb: 0.25,
                  }}
                >
                  ✓ Validation — $
                  {position.timing.validation_condition.level.toFixed(2)} (
                  {
                    SIGNAL_TYPE_LABEL[
                      position.timing.validation_condition.signal_type
                    ]
                  }
                  )
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {position.timing.validation_condition.rationale}
                </Typography>
                <Chip
                  label={position.timing.validation_condition.action.toUpperCase()}
                  size="small"
                  sx={{
                    mt: 0.5,
                    fontSize: "0.55rem",
                    height: 16,
                    background: "rgba(16,185,129,0.15)",
                    color: "#10b981",
                    fontWeight: 700,
                  }}
                />
              </Box>

              {/* Monitoring checklist */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                {position.timing.monitoring_checklist.map((item, i) => (
                  <Box key={i} sx={{ display: "flex", gap: 0.75 }}>
                    <CheckCircleOutlineIcon
                      sx={{
                        fontSize: 13,
                        color: "text.secondary",
                        mt: "2px",
                        flexShrink: 0,
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {item}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>

          {/* ── Friction estimate ── */}
          {position.friction_estimate && (
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Trading Friction
              </Typography>
              <Box
                sx={{
                  mt: 1,
                  p: 1.5,
                  borderRadius: 1.5,
                  background: isDark
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(0,0,0,0.02)",
                  border: "1px solid",
                  borderColor: "divider",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 0.75,
                }}
              >
                {[
                  [
                    "Est. shares/contracts",
                    position.friction_estimate.estimated_shares_or_contracts.toLocaleString(),
                  ],
                  [
                    "Commission",
                    `$${position.friction_estimate.commission_usd.toFixed(2)}`,
                  ],
                  [
                    "Est. slippage",
                    `$${position.friction_estimate.estimated_slippage_usd.toFixed(2)}`,
                  ],
                  [
                    "One-way cost",
                    `$${position.friction_estimate.total_friction_usd.toFixed(2)} (${(position.friction_estimate.friction_as_pct_of_position * 100).toFixed(3)}%)`,
                  ],
                  [
                    "Round-trip cost",
                    `$${position.friction_estimate.round_trip_friction_usd.toFixed(2)} (${(position.friction_estimate.round_trip_friction_pct * 100).toFixed(3)}%)`,
                  ],
                  [
                    "Spread tier",
                    position.friction_estimate.spread_tier.replace("_", " "),
                  ],
                ].map(([label, value]) => (
                  <Box key={label as string}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: "0.58rem", display: "block" }}
                    >
                      {label}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 600, fontSize: "0.65rem" }}
                    >
                      {value}
                    </Typography>
                  </Box>
                ))}
              </Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.75, fontStyle: "italic" }}
              >
                {position.friction_justification}
              </Typography>
            </Box>
          )}

          {/* ── Why better than displaced ── */}
          {position.why_better_than_displaced && (
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                borderRadius: 1.5,
                background: "rgba(59,130,246,0.08)",
                border: "1px solid rgba(59,130,246,0.2)",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: "#3b82f6",
                  display: "block",
                  mb: 0.5,
                }}
              >
                Why better than{" "}
                {position.displaced_ticker ?? "current position"}
              </Typography>
              <Typography variant="caption">
                {position.why_better_than_displaced}
              </Typography>
            </Box>
          )}

          {/* ── Options specifics ── */}
          {isOption && position.option_vs_stock_rationale && (
            <Box
              sx={{
                p: 1.5,
                borderRadius: 1.5,
                background: "rgba(139,92,246,0.08)",
                border: "1px solid rgba(139,92,246,0.2)",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: "#8b5cf6",
                  display: "block",
                  mb: 0.5,
                }}
              >
                Options rationale
              </Typography>
              <Typography variant="caption" display="block">
                {position.option_vs_stock_rationale}
              </Typography>
              {position.option_greeks_context && (
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ mt: 0.5, color: "text.secondary" }}
                >
                  Greeks: {position.option_greeks_context}
                </Typography>
              )}
              {position.option_monitoring && (
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ mt: 0.5, fontStyle: "italic", color: "#f59e0b" }}
                >
                  Monitor: {position.option_monitoring}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
}
