// src/news_ideas/components/SeedTickerViewer.tsx
//
// Shows the LLM-selected seed tickers with their rationale.
// Opened as a collapsible panel in the pipeline control area.
// Also shows the path to the override file for power users.

import {
  Box,
  Chip,
  Collapse,
  Divider,
  IconButton,
  Paper,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useState } from "react";
import { useTheme } from "@mui/material/styles";
import type { SeedTickerResult } from "../types";

const CONVICTION_COLOR: Record<number, string> = {
  1: "#f59e0b",
  2: "#3b82f6",
  3: "#10b981",
};

const HEURISTIC_LABELS: Record<string, string> = {
  r_and_d_inflection: "R&D Inflection",
  bullwhip_recovery: "Bullwhip Recovery",
  second_order_supply_chain: "2nd-Order Supply Chain",
  sector_rotation_lag: "Sector Rotation Lag",
  earnings_quality_divergence: "Earnings Quality",
  sec_filing_signal: "SEC Filing Signal",
  regulatory_calendar: "Regulatory Calendar",
  cross_border_spillover: "Cross-Border Spillover",
};

interface Props {
  seedData: SeedTickerResult;
  selectedAt?: string;
}

export default function SeedTickerViewer({ seedData, selectedAt }: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [expanded, setExpanded] = useState(false);
  const [expandedTicker, setExpandedTicker] = useState<string | null>(null);

  const bg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  if (!seedData.tickers?.length) return null;

  return (
    <Paper
      variant="outlined"
      sx={{ borderRadius: 2, background: bg, borderColor: border, mb: 1.5 }}
    >
      {/* Header row */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          px: 2,
          py: 1.5,
          cursor: "pointer",
        }}
        onClick={() => setExpanded((e) => !e)}
      >
        <Box sx={{ flex: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              LLM-selected seed tickers
            </Typography>
            <Chip
              label={`${seedData.tickers.length} tickers`}
              size="small"
              sx={{
                fontSize: "0.65rem",
                background: "rgba(16,185,129,0.15)",
                color: "#10b981",
              }}
            />
            {selectedAt && (
              <Typography variant="caption" color="text.secondary">
                selected {new Date(selectedAt).toLocaleTimeString()}
              </Typography>
            )}
          </Box>
          {/* Macro themes summary */}
          {seedData.macro_themes?.length > 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 0.25 }}
            >
              Themes: {seedData.macro_themes.slice(0, 2).join(" · ")}
              {seedData.macro_themes.length > 2 &&
                ` +${seedData.macro_themes.length - 2} more`}
            </Typography>
          )}
        </Box>
        <IconButton size="small">
          {expanded ? (
            <ExpandLessIcon fontSize="small" />
          ) : (
            <ExpandMoreIcon fontSize="small" />
          )}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Divider />

        {/* Macro themes */}
        {seedData.macro_themes?.length > 0 && (
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                color: "text.secondary",
              }}
            >
              Macro themes driving selection
            </Typography>
            <Box
              sx={{
                mt: 0.75,
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
              }}
            >
              {seedData.macro_themes.map((t, i) => (
                <Box
                  key={i}
                  sx={{ display: "flex", gap: 0.75, alignItems: "flex-start" }}
                >
                  <InfoOutlinedIcon
                    sx={{
                      fontSize: 13,
                      color: "#3b82f6",
                      mt: "2px",
                      flexShrink: 0,
                    }}
                  />
                  <Typography variant="caption">{t}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Divider />

        {/* Ticker grid */}
        <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1 }}>
          {seedData.tickers.map((t) => (
            <Paper
              key={t.ticker}
              variant="outlined"
              sx={{
                borderRadius: 1.5,
                overflow: "hidden",
                borderColor:
                  expandedTicker === t.ticker
                    ? CONVICTION_COLOR[t.conviction_to_research]
                    : border,
                cursor: "pointer",
              }}
              onClick={() =>
                setExpandedTicker((prev) =>
                  prev === t.ticker ? null : t.ticker,
                )
              }
            >
              {/* Ticker row */}
              <Box
                sx={{
                  px: 1.5,
                  py: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  background:
                    expandedTicker === t.ticker
                      ? `${CONVICTION_COLOR[t.conviction_to_research]}11`
                      : undefined,
                }}
              >
                {/* Direction indicator */}
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background:
                      t.direction_bias === "long"
                        ? "rgba(16,185,129,0.15)"
                        : "rgba(239,68,68,0.15)",
                    flexShrink: 0,
                  }}
                >
                  {t.direction_bias === "long" ? (
                    <TrendingUpIcon sx={{ fontSize: 13, color: "#10b981" }} />
                  ) : (
                    <TrendingDownIcon sx={{ fontSize: 13, color: "#ef4444" }} />
                  )}
                </Box>

                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, minWidth: 48 }}
                >
                  {t.ticker}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ flex: 1 }}
                >
                  {t.name}
                </Typography>
                <Chip
                  label={t.economy.toUpperCase()}
                  size="small"
                  sx={{ fontSize: "0.6rem", height: 18 }}
                />
                <Chip
                  label={t.industry.replace(/_/g, " ")}
                  size="small"
                  sx={{ fontSize: "0.6rem", height: 18 }}
                />
                <Chip
                  label={HEURISTIC_LABELS[t.heuristic_flag] ?? t.heuristic_flag}
                  size="small"
                  sx={{
                    fontSize: "0.6rem",
                    height: 18,
                    background: `${CONVICTION_COLOR[t.conviction_to_research]}22`,
                    color: CONVICTION_COLOR[t.conviction_to_research],
                    fontWeight: 600,
                  }}
                />
              </Box>

              {/* Expanded rationale */}
              <Collapse in={expandedTicker === t.ticker}>
                <Divider />
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                  }}
                >
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, color: "text.secondary" }}
                    >
                      Selection reason
                    </Typography>
                    <Typography
                      variant="caption"
                      display="block"
                      sx={{ mt: 0.25 }}
                    >
                      {t.selection_reason}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, color: "text.secondary" }}
                    >
                      Macro driver
                    </Typography>
                    <Typography
                      variant="caption"
                      display="block"
                      sx={{ mt: 0.25 }}
                    >
                      {t.macro_driver}
                    </Typography>
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{ color: "#f59e0b", fontStyle: "italic" }}
                  >
                    Research conviction: {t.conviction_to_research}/3
                  </Typography>
                </Box>
              </Collapse>
            </Paper>
          ))}
        </Box>

        {/* Override hint */}
        <Box
          sx={{
            px: 2,
            pb: 1.5,
            display: "flex",
            alignItems: "flex-start",
            gap: 0.75,
          }}
        >
          <InfoOutlinedIcon
            sx={{
              fontSize: 13,
              color: "text.secondary",
              mt: "2px",
              flexShrink: 0,
            }}
          />
          <Typography variant="caption" color="text.secondary">
            To pin specific tickers regardless of LLM selection, create{" "}
            <code
              style={{
                background: isDark
                  ? "rgba(255,255,255,0.1)"
                  : "rgba(0,0,0,0.08)",
                padding: "1px 4px",
                borderRadius: 3,
                fontSize: "0.65rem",
              }}
            >
              /data/knowledge_base/ideas/seed_tickers_override.json
            </code>{" "}
            with the same format as the seed_tickers.json schema.
          </Typography>
        </Box>
      </Collapse>
    </Paper>
  );
}
