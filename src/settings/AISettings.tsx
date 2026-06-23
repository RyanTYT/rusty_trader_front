// src/settings/AISettings.tsx
//
// Settings panel for the News Ideas / LLM feature.
// Renders as a Paper section inside the existing SettingsPage.
//
// Sections:
//   1. Options mode toggle
//   2. Model routing — one row per task profile with model selector + description
//   3. Portfolio constraints — max positions, conviction weight caps
//   4. Enabled Economies — Multi-select for target regions
//
// Saves on blur/change via api.updateSettings().
// Shows a subtle saved/error indicator per field rather than a global save button
// (most changes are small and the user wants immediate feedback).

import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
  Slider,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import SmartToyOutlinedIcon from "@mui/icons-material/SmartToyOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { useEffect, useRef, useState } from "react";
import { VBox } from "../theme";
import type { AppSettings } from "../news_ideas/types";
import { invoke } from "@tauri-apps/api/core";

// ── Model options ─────────────────────────────────────────────────────────────

interface ModelOption {
  value: string;
  label: string;
  provider: "anthropic" | "google" | "openrouter";
  note?: string;
}

const MODEL_OPTIONS: ModelOption[] = [
  // Anthropic
  {
    value: "anthropic/claude-sonnet-4-6",
    label: "Claude Sonnet 4.6",
    provider: "anthropic",
    note: "Best reasoning, highest cost",
  },
  {
    value: "anthropic/claude-haiku-4-5",
    label: "Claude Haiku 4.5",
    provider: "anthropic",
    note: "Fast + cheap, lower reasoning quality",
  },
  // Google
  {
    value: "google/gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    provider: "google",
    note: "Fast, cheap, native Search grounding, 1M ctx",
  },
  {
    value: "google/gemini-2.5-pro",
    label: "Gemini 2.5 Pro",
    provider: "google",
    note: "High quality, expensive",
  },
  // OpenRouter — DeepSeek
  {
    value: "deepseek/deepseek-r1",
    label: "DeepSeek R1",
    provider: "openrouter",
    note: "Strong chain-of-thought, ~10× cheaper than Sonnet",
  },
  {
    value: "openrouter/owl-alpha",
    label: "Owl Alpha",
    provider: "openrouter",
    note: "Owl Alpha is a high-performance foundation model designed for agentic workloads",
  },
  {
    value: "deepseek/deepseek-chat",
    label: "DeepSeek V3",
    provider: "openrouter",
    note: "Fast + cheap general purpose",
  },
  // OpenRouter — others
  {
    value: "meta-llama/llama-3.3-70b-instruct",
    label: "Llama 3.3 70B",
    provider: "openrouter",
    note: "Open source, low cost",
  },
  {
    value: "mistralai/mistral-large",
    label: "Mistral Large",
    provider: "openrouter",
    note: "Good reasoning via OpenRouter",
  },
  {
    value: "nvidia/nemotron-3-super-120b-a12b",
    label: "Nvidia Nemotron 3 Super",
    provider: "openrouter",
    note: "Good reasoning by Nvidia",
  },
];

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "#c07040",
  google: "#4285f4",
  openrouter: "#7c3aed",
};

// ── Economy Options ───────────────────────────────────────────────────────────

const AVAILABLE_ECONOMIES = [
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "japan", label: "Japan" },
  { value: "korea", label: "South Korea" },
];

// ── Task profile metadata ─────────────────────────────────────────────────────

interface ProfileMeta {
  key: keyof AppSettings;
  label: string;
  description: string;
  usedBy: string;
  webSearch: boolean;
}

const PROFILES: ProfileMeta[] = [
  {
    key: "broad_search_model",
    label: "Broad Search",
    description:
      "Web gathering + synthesis from scratch. Prioritises speed and breadth over depth.",
    usedBy:
      "update_macro (full), update_industries (full), deep_dive research sections",
    webSearch: true,
  },
  {
    key: "deep_reasoning_model",
    label: "Deep Reasoning",
    description:
      "Reading the accumulated KB, cross-referencing multiple documents, producing structured analytical output.",
    usedBy: "ticker_selector, idea_generator synthesis, deep_dive scoring",
    webSearch: true,
  },
  {
    key: "long_merge_model",
    label: "Long Merge",
    description:
      "Reading two large documents and producing a faithful minimal merge. Needs large context window.",
    usedBy:
      "update_macro (incremental), update_industries (incremental), deep_dive merge",
    webSearch: false,
  },
];

// ── Save status indicator ─────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "saved" | "error";

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "idle") return null;
  if (status === "saving") return <CircularProgress size={14} />;
  if (status === "saved")
    return <CheckCircleOutlineIcon sx={{ fontSize: 16, color: "#10b981" }} />;
  return <ErrorOutlineIcon sx={{ fontSize: 16, color: "#ef4444" }} />;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AISettings() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);
  const [saveStatus, setSaveStatus] = useState<Record<string, SaveStatus>>({});
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    invoke<AppSettings>("get_settings")
      .then(setSettings)
      .finally(() => setLoading(false));
  }, []);

  const save = async (patch: Partial<AppSettings>, key: string) => {
    if (!settings) return;
    const updated = { ...settings, ...patch };
    setSettings(updated);
    setSaveStatus((s) => ({ ...s, [key]: "saving" }));

    // Debounce — wait 600ms after last change before hitting the API
    clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(async () => {
      try {
        console.warn(updated);
        await invoke("update_settings", { settings: updated });
        setSaveStatus((s) => ({ ...s, [key]: "saved" }));
        setTimeout(() => setSaveStatus((s) => ({ ...s, [key]: "idle" })), 2000);
      } catch {
        setSaveStatus((s) => ({ ...s, [key]: "error" }));
      }
    }, 600);
  };

  if (loading) {
    return (
      <Paper elevation={0} variant="normal">
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <SmartToyOutlinedIcon color="primary" />
          <Typography variant="h3">AI / News Ideas</Typography>
          <CircularProgress size={16} sx={{ ml: "auto" }} />
        </Box>
      </Paper>
    );
  }

  if (!settings) {
    return (
      <Paper elevation={0} variant="normal">
        <Alert severity="warning">
          Could not load AI settings — is the LLM service running?
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} variant="normal">
      {/* ── Section header ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          cursor: "pointer",
        }}
        onClick={() => setExpanded((e) => !e)}
      >
        <SmartToyOutlinedIcon color="primary" />
        <Typography variant="h3" sx={{ flex: 1 }}>
          AI / News Ideas
        </Typography>
        <IconButton size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <VBox sx={{ gap: 2.5, mt: 1 }}>
          {/* ── Options mode ── */}
          <Box>
            <SectionLabel>Trading Mode</SectionLabel>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mt: 1,
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Options mode
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Allows positions_proposer to suggest options positions. Only
                  enable if IBKR options permissions are active.
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <SaveIndicator status={saveStatus["options_mode"] ?? "idle"} />
                <Switch
                  checked={settings.options_mode}
                  onChange={(e) =>
                    save({ options_mode: e.target.checked }, "options_mode")
                  }
                  color="warning"
                />
              </Box>
            </Box>
          </Box>

          <Divider />

          {/* ── Model routing ── */}
          <Box>
            <SectionLabel>Model Routing — Task Profiles</SectionLabel>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 2 }}
            >
              Each profile routes to the model best suited to that class of
              work. Changing a profile updates all agents that use it
              simultaneously.
            </Typography>

            <VBox sx={{ gap: 2 }}>
              {PROFILES.map((profile) => {
                const currentModel = settings[profile.key] as string;
                const option = MODEL_OPTIONS.find(
                  (o) => o.value === currentModel,
                );
                return (
                  <Box
                    key={profile.key}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      p: 1.5,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {profile.label}
                          </Typography>
                          {profile.webSearch && (
                            <Chip
                              label="web search"
                              size="small"
                              sx={{
                                fontSize: "0.6rem",
                                height: 18,
                                background: "rgba(59,130,246,0.1)",
                                color: "#3b82f6",
                              }}
                            />
                          )}
                          {option && (
                            <Chip
                              label={option.provider}
                              size="small"
                              sx={{
                                fontSize: "0.6rem",
                                height: 18,
                                background: `${PROVIDER_COLORS[option.provider]}22`,
                                color: PROVIDER_COLORS[option.provider],
                                fontWeight: 600,
                              }}
                            />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {profile.description}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            display: "block",
                            color: "text.disabled",
                            fontSize: "0.65rem",
                            mt: 0.25,
                          }}
                        >
                          Used by: {profile.usedBy}
                        </Typography>
                      </Box>
                      <SaveIndicator
                        status={saveStatus[profile.key] ?? "idle"}
                      />
                    </Box>

                    <Select
                      size="small"
                      fullWidth
                      value={currentModel}
                      onChange={(e) =>
                        save(
                          {
                            [profile.key]: e.target.value,
                          } as Partial<AppSettings>,
                          profile.key,
                        )
                      }
                      sx={{ fontSize: "0.8rem" }}
                    >
                      {MODEL_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              width: "100%",
                            }}
                          >
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: "50%",
                                background: PROVIDER_COLORS[opt.provider],
                                flexShrink: 0,
                              }}
                            />
                            <Typography variant="body2" sx={{ flex: 1 }}>
                              {opt.label}
                            </Typography>
                            {opt.note && (
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontSize: "0.65rem" }}
                              >
                                {opt.note}
                              </Typography>
                            )}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>
                );
              })}

              {/* High-stakes locked row */}
              <Box
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  p: 1.5,
                  opacity: 0.7,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 0.5,
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }}>
                    High Stakes
                  </Typography>
                  <LockOutlinedIcon
                    sx={{ fontSize: 15, color: "text.secondary" }}
                  />
                  <Chip
                    label="anthropic"
                    size="small"
                    sx={{
                      fontSize: "0.6rem",
                      height: 18,
                      background: `${PROVIDER_COLORS.anthropic}22`,
                      color: PROVIDER_COLORS.anthropic,
                      fontWeight: 600,
                    }}
                  />
                </Box>
                <Typography variant="caption" color="text.secondary">
                  Positions proposals and counter-proposals. Hardcoded to Claude
                  Sonnet — not configurable here by design. Change{" "}
                  <code style={{ fontSize: "0.7rem" }}>_HIGH_STAKES_MODEL</code>{" "}
                  in <code style={{ fontSize: "0.7rem" }}>llm_client.py</code>{" "}
                  to override.
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  value="claude-sonnet-4-6 (hardcoded)"
                  disabled
                  sx={{ mt: 1, fontSize: "0.8rem" }}
                />
              </Box>
            </VBox>
          </Box>

          <Divider />

          {/* ── Portfolio constraints ── */}
          <Box>
            <SectionLabel>Portfolio Constraints</SectionLabel>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 2 }}
            >
              These limits are enforced in the positions_proposer prompt. The
              model will not exceed them.
            </Typography>

            <VBox sx={{ gap: 2 }}>
              {/* Max positions */}
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Max positions
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <SaveIndicator
                      status={saveStatus["max_positions"] ?? "idle"}
                    />
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, minWidth: 24, textAlign: "right" }}
                    >
                      {settings.max_positions}
                    </Typography>
                  </Box>
                </Box>
                <Slider
                  value={settings.max_positions}
                  min={1}
                  max={30}
                  step={1}
                  onChange={(_, v) =>
                    save({ max_positions: v as number }, "max_positions")
                  }
                  marks={[
                    { value: 5, label: "5" },
                    { value: 10, label: "10" },
                    { value: 20, label: "20" },
                    { value: 20, label: "20" },
                  ]}
                  sx={{ mt: 1 }}
                />
              </Box>

              {/* Conviction weights */}
              {(
                [
                  [
                    "max_conviction_1_weight",
                    "Conviction 1 max weight",
                    "#f59e0b",
                    "Speculative — e.g. regulatory binary, unproven thesis",
                  ],
                  [
                    "max_conviction_2_weight",
                    "Conviction 2 max weight",
                    "#3b82f6",
                    "Moderate — clear catalyst, some uncertainty",
                  ],
                  [
                    "max_conviction_3_weight",
                    "Conviction 3 max weight",
                    "#10b981",
                    "High — strong thesis, near-term catalyst, liquid",
                  ],
                ] as const
              ).map(([key, label, color, note]) => {
                const pct = Math.round((settings[key] as number) * 100);
                return (
                  <Box key={key}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {note}
                        </Typography>
                      </Box>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <SaveIndicator status={saveStatus[key] ?? "idle"} />
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 700,
                            color,
                            minWidth: 36,
                            textAlign: "right",
                          }}
                        >
                          {pct}%
                        </Typography>
                      </Box>
                    </Box>
                    <Slider
                      value={pct}
                      min={1}
                      max={35}
                      step={1}
                      onChange={(_, v) =>
                        save(
                          {
                            [key]: (v as number) / 100,
                          } as Partial<AppSettings>,
                          key,
                        )
                      }
                      sx={{ mt: 0.5, color }}
                    />
                  </Box>
                );
              })}
            </VBox>
          </Box>

          <Divider />

          {/* ── Enabled Economies ── */}
          <Box>
            <SectionLabel>Geographic Scope</SectionLabel>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                mt: 1,
              }}
            >
              <Box sx={{ flex: 1, mr: 2 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Enabled Economies
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Filters macroeconomic gathering and tracking tasks to these
                  specific regions.
                </Typography>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", mt: 0.5 }}>
                <SaveIndicator
                  status={saveStatus["enabled_economies"] ?? "idle"}
                />
              </Box>
            </Box>

            <Select
              multiple
              size="small"
              fullWidth
              value={settings.enabled_economies || []}
              onChange={(e) => {
                const value = e.target.value;
                // On select multiple, value is returned as a string or string[]
                const targetEconomies =
                  typeof value === "string" ? value.split(",") : value;
                save(
                  { enabled_economies: targetEconomies },
                  "enabled_economies",
                );
              }}
              input={<OutlinedInput size="small" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((val) => {
                    const label =
                      AVAILABLE_ECONOMIES.find((e) => e.value === val)?.label ||
                      val;
                    return (
                      <Chip
                        key={val}
                        label={label}
                        size="small"
                        sx={{ fontSize: "0.75rem", height: 24 }}
                      />
                    );
                  })}
                </Box>
              )}
              sx={{ mt: 1.5 }}
            >
              {AVAILABLE_ECONOMIES.map((economy) => (
                <MenuItem key={economy.value} value={economy.value}>
                  {economy.label}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {/* ── Info note ── */}
          <Box sx={{ display: "flex", gap: 0.75, alignItems: "flex-start" }}>
            <InfoOutlinedIcon
              sx={{
                fontSize: 14,
                color: "text.secondary",
                mt: "2px",
                flexShrink: 0,
              }}
            />
            <Typography variant="caption" color="text.secondary">
              Settings are saved to the Docker named volume (
              <code style={{ fontSize: "0.68rem" }}>
                /data/settings/settings.json
              </code>
              ) and take effect on the next agent call — no restart required.
              The High Stakes model requires editing{" "}
              <code style={{ fontSize: "0.68rem" }}>llm_client.py</code> and
              rebuilding the container.
            </Typography>
          </Box>
        </VBox>
      </Collapse>
    </Paper>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <Typography
      variant="overline"
      sx={{ fontWeight: 700, color: "text.secondary", letterSpacing: "0.07em" }}
    >
      {children}
    </Typography>
  );
}
