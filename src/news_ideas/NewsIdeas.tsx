// src/news_ideas/NewsIdeas.tsx
import "./news_ideas.css";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Grid,
  Paper,
  Slide,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import AutoFixHighIcon from "@mui/icons-material/AutoFixHigh";
import RefreshIcon from "@mui/icons-material/Refresh";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import StorageIcon from "@mui/icons-material/Storage";
import FactoryIcon from "@mui/icons-material/Factory";
import SearchIcon from "@mui/icons-material/Search";
import ReplyIcon from "@mui/icons-material/Reply";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { useEffect, useState } from "react";
import { useTheme } from "@mui/material/styles";
import { TitleBox, VBox } from "../theme";
import BottomSheetModal from "../components/MobilePopupModal";
import PositionCard from "./components/PositionCard";
import CounterProposerChat from "./components/CounterProposerChat";
import SeedTickerViewer from "./components/SeedTickerViewer";
import { markAllRead } from "../useNotification";
import type {
  AppSettings,
  CounterProposerSession,
  FinalPosition,
  PositionsProposal,
  PositionUpdatePayload,
  SeedTickerResult,
  TriggeredAlert,
} from "./types";
import { invoke } from "@tauri-apps/api/core";
import { FinalConfirmationOverlay } from "./components/FinalConfirmationOverlay";
import PortfolioReview from "./components/PortfolioReview";
import { platform } from "@tauri-apps/plugin-os";
// import { mockProposal } from "./mock_proposal";
// import { mockProposal } from "./mock_proposal";

type TabValue = "proposal" | "unchanged" | "alerts";
type Status = "idle" | "running" | "done" | "error";

interface FunctionState {
  status: Status;
  message: string;
  lastRun?: string;
}

const submitPositions = async (
  counter_proposal: CounterProposerSession,
  finalPositions: FinalPosition[],
) => {
  const updates: PositionUpdatePayload[] = [];
  finalPositions.forEach((pos) => {
    const baseData = {
      stock: pos.ticker,
      primary_exchange: pos.exchange,
      currency: pos.currency,
      strategy: "manual",
      quantity: pos.new_weight,
      avg_price: pos.avg_price,
      operation: (pos.new_weight === 0 ? "delete" : "upsert") as
        | "upsert"
        | "delete",
    };

    if (pos.asset_type !== "call_option" && pos.asset_type !== "put_option") {
      updates.push({ asset_type: "stock", ...baseData });
    } else {
      updates.push({
        asset_type: "option",
        ...baseData,
        expiry: "",
        strike: 0,
        multiplier: "100",
        option_type: pos.asset_type === "call_option" ? "C" : "P",
        operation: (pos.new_weight === 0 ? "delete" : "upsert") as
          | "upsert"
          | "delete",
      });
    }
  });

  const res = await invoke("update_llm_positions", {
    positions: updates,
    counter_proposal,
  })
    .then(() => "")
    .catch((err) => `Failed to update target positions: ${err}`);

  return res;
};

const IDLE_STATE: FunctionState = { status: "idle", message: "" };

// ── Alert severity config ─────────────────────────────────────────────────────
const ALERT_SEVERITY_COLOUR: Record<string, string> = {
  informational: "#3b82f6",
  action_required: "#f59e0b",
  urgent: "#ef4444",
};

// ── Render helpers ────────────────────────────────────────────────────────────
const StatusChip = ({ state }: { state: FunctionState }) => {
  const map: Record<Status, { label: string; color: string }> = {
    idle: { label: "idle", color: "#666" },
    running: { label: "running", color: "#f59e0b" },
    done: { label: "done", color: "#10b981" },
    error: { label: "error", color: "#ef4444" },
  };
  const { label, color } = map[state.status];
  return (
    <Chip
      label={label}
      size="small"
      icon={
        state.status === "running" ? <CircularProgress size={10} /> : undefined
      }
      sx={{
        background: `${color}22`,
        color,
        fontWeight: 600,
        fontSize: "0.65rem",
      }}
    />
  );
};

const FunctionRow = ({
  icon,
  title,
  description,
  state,
  onRun,
  onForce,
  action, // New optional override prop for the right-hand UI alignment
  children,
  isDark,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  state: FunctionState;
  onRun?: () => void; // Made optional for backwards-compatibility
  onForce?: () => void; // Made optional for backwards-compatibility
  action?: React.ReactNode;
  children?: React.ReactNode;
  isDark: boolean;
}) => (
  <Paper
    variant="outlined"
    sx={{
      p: 2,
      mb: 1.5,
      borderRadius: 2,
      background:
        state.status === "running"
          ? isDark
            ? "rgba(245,158,11,0.05)"
            : "rgba(245,158,11,0.04)"
          : undefined,
    }}
  >
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Box
        sx={{ color: "text.secondary", display: "flex", alignItems: "center" }}
      >
        {icon}
      </Box>
      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <StatusChip state={state} />
          {state.lastRun && (
            <Typography variant="caption" color="text.secondary">
              @ {state.lastRun}
            </Typography>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
        {state.message && state.status !== "idle" && (
          <Typography
            variant="caption"
            display="block"
            sx={{
              mt: 0.5,
              color: state.status === "error" ? "error.main" : "text.secondary",
              fontStyle: "italic",
            }}
          >
            {state.message}
          </Typography>
        )}
      </Box>

      {/* Dynamic right action panel slot */}
      <Box
        sx={{ display: "flex", gap: 0.75, flexShrink: 0, alignItems: "center" }}
      >
        {action ? (
          action
        ) : (
          <>
            <Button
              size="small"
              variant="contained"
              onClick={onRun}
              disabled={state.status === "running"}
              sx={{ minWidth: 64 }}
            >
              Run
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={onForce}
              disabled={state.status === "running"}
              startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
              sx={{ minWidth: 72, fontSize: "0.7rem" }}
            >
              Force
            </Button>
          </>
        )}
      </Box>
    </Box>
    {children && <Box sx={{ mt: 1.5 }}>{children}</Box>}
  </Paper>
);

// ── Triggered alerts panel ────────────────────────────────────────────────────
const TriggeredAlertsPanel = ({ alerts }: { alerts: TriggeredAlert[] }) => {
  if (alerts.length === 0) return null;

  const urgentCount = alerts.filter((a) => a.severity === "urgent").length;
  const actionCount = alerts.filter(
    (a) => a.severity === "action_required",
  ).length;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        mb: 2,
        borderRadius: 2,
        borderColor:
          urgentCount > 0
            ? "rgba(239,68,68,0.4)"
            : actionCount > 0
              ? "rgba(245,158,11,0.35)"
              : "rgba(59,130,246,0.3)",
        background:
          urgentCount > 0
            ? "rgba(239,68,68,0.04)"
            : actionCount > 0
              ? "rgba(245,158,11,0.04)"
              : "rgba(59,130,246,0.04)",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <ErrorOutlineIcon
          sx={{
            fontSize: 16,
            color:
              urgentCount > 0
                ? "#ef4444"
                : actionCount > 0
                  ? "#f59e0b"
                  : "#3b82f6",
          }}
        />
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          Triggered Alerts
        </Typography>
        <Box sx={{ display: "flex", gap: 0.5, ml: "auto" }}>
          {urgentCount > 0 && (
            <Chip
              label={`${urgentCount} urgent`}
              size="small"
              sx={{
                background: "rgba(239,68,68,0.15)",
                color: "#ef4444",
                fontWeight: 700,
                fontSize: "0.6rem",
              }}
            />
          )}
          {actionCount > 0 && (
            <Chip
              label={`${actionCount} action required`}
              size="small"
              sx={{
                background: "rgba(245,158,11,0.15)",
                color: "#f59e0b",
                fontWeight: 700,
                fontSize: "0.6rem",
              }}
            />
          )}
        </Box>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
        {alerts.map((alert, i) => {
          const color = ALERT_SEVERITY_COLOUR[alert.severity];
          return (
            <Box
              key={i}
              sx={{
                display: "flex",
                gap: 1,
                alignItems: "flex-start",
                p: 1,
                borderRadius: 1,
                background: `${color}08`,
                border: `1px solid ${color}20`,
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: color,
                  mt: 0.5,
                  flexShrink: 0,
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box
                  sx={{
                    display: "flex",
                    gap: 0.75,
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Typography variant="caption" sx={{ fontWeight: 700, color }}>
                    {alert.ticker}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontSize: "0.6rem" }}
                  >
                    {alert.alert_type.replace(/_/g, " ")}
                  </Typography>
                  <Chip
                    label={alert.recommended_action.toUpperCase()}
                    size="small"
                    sx={{
                      background: `${color}15`,
                      color,
                      fontWeight: 700,
                      fontSize: "0.55rem",
                      height: 14,
                      ml: "auto",
                    }}
                  />
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 0.25 }}
                >
                  {alert.description}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
};

export default function NewsIdeas() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [currentView, setCurrentView] = useState<
    "dashboard" | "proposal-detail" | "last-proposal"
  >("dashboard");
  const platformName = platform();
  const isMobile = ["android", "ios"].includes(platformName);

  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(false);

  const [macroState, setMacroState] = useState<FunctionState>(IDLE_STATE);
  const [industryState, setIndustryState] = useState<FunctionState>(IDLE_STATE);
  const [ideasState, setIdeasState] = useState<FunctionState>(IDLE_STATE);
  const [deepDiveState, setDeepDiveState] = useState<FunctionState>(IDLE_STATE);
  const [proposerState, setProposerState] = useState<FunctionState>(IDLE_STATE);
  const [proposalState] = useState<FunctionState>(IDLE_STATE);

  const [deepDiveTicker, setDeepDiveTicker] = useState("");
  const [seedData, setSeedData] = useState<SeedTickerResult | null>(null);
  const [selectorState, setSelectorState] = useState<FunctionState>(IDLE_STATE);

  const [proposal, setProposal] = useState<PositionsProposal | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>("proposal");
  const [counterModalOpen, setCounterModalOpen] = useState(false);
  const [showFinalReview, setShowFinalReview] = useState(false);

  useEffect(() => {
    setLastProposal();
    markAllRead();
    loadSettings();
  }, []);

  const setLastProposal = async () => {
    await invoke<PositionsProposal>("get_last_proposal")
      .then((proposal: any) => {
        setProposal(JSON.parse(proposal.result!));
      })
      .catch((err) => {
        console.error(`Failed to get last proposal: ${err}`);
        throw Error(err);
      });
  };

  const loadSettings = async () => {
    try {
      await invoke<AppSettings>("get_settings")
        .then((s) => setSettings(s))
        .catch((err) => {
          console.error(`Failed to get settings: ${err}`);
          throw Error(err);
        });
    } catch {
      setSettings({
        options_mode: false,
        broad_search_model: "unknown",
        deep_reasoning_model: "unknown",
        long_merge_model: "unknown",
        max_positions: 10,
        max_conviction_1_weight: 0.05,
        max_conviction_2_weight: 0.12,
        max_conviction_3_weight: 0.2,
        enabled_economies: ["us", "uk", "japan", "korea"],
      });
    }
  };

  const toggleOptionsMode = async (enabled: boolean) => {
    if (!settings) return;
    setSettingsLoading(true);
    try {
      const updated = await invoke<{ options_mode: boolean }>(
        "set_options_mode",
        { enabled },
      ).catch((err) => {
        throw Error(`Failed to set options mode: ${err}`);
      });
      setSettings((s) =>
        s ? { ...s, options_mode: updated.options_mode } : s,
      );
    } finally {
      setSettingsLoading(false);
    }
  };

  // const run = async (
  //   setter: React.Dispatch<React.SetStateAction<FunctionState>>,
  //   fn: () => Promise<{ result: string } | PositionsProposal>,
  //   onSuccess?: (data: { result: string } | PositionsProposal) => void,
  // ) => {
  //   setter({ status: "running", message: "Running…" });
  //   try {
  //     const data = await fn();
  //     console.log(data);
  //     const msg =
  //       "result" in data
  //         ? (data as { result: string }).result.split("\n")[0]
  //         : `${(data as PositionsProposal).proposed_trades.length} positions proposed`;
  //     setter({
  //       status: "done",
  //       message: msg,
  //       lastRun: new Date().toLocaleTimeString(),
  //     });
  //     onSuccess?.(data);
  //   } catch (err) {
  //     console.log(err);
  //     setter({
  //       status: "error",
  //       message: err instanceof Error ? err.message : "Error",
  //     });
  //   }
  // };

  // Extended state to hold the enriched payload data
  interface FunctionState {
    status: "idle" | "running" | "done" | "error";
    message: string;
    lastRun?: string;
    data?: any; // Added to store raw data structures safely
  }

  const run = async (
    setter: React.Dispatch<React.SetStateAction<FunctionState>>,
    fn: () => Promise<any>,
    onSuccess?: (data: any) => void,
  ) => {
    setter((prev) => ({ ...prev, status: "running", message: "Running…" }));
    try {
      const data = await fn();

      // Backwards-compatible message parser supporting both raw strings and enriched response models
      let msg = "";
      if (data && typeof data === "object" && "result" in data) {
        if (typeof data.result === "string") {
          msg = data.result.split("\n")[0];
        } else if (data.result && typeof data.result === "object") {
          // Enriched structural data summary fallbacks
          const themesCount = data.result.macro_themes?.length || 0;
          const tickersCount = data.result.tickers?.length || 0;
          msg = `${tickersCount} tickers generated across ${themesCount} structural macro themes`;
        }
      } else if (data && "proposed_trades" in data) {
        msg = `${data.proposed_trades.length} positions proposed`;
      }

      setter({
        status: "done",
        message: msg,
        lastRun: new Date().toLocaleTimeString(),
        data: data?.result || data, // Cache internal structure directly into state
      });

      onSuccess?.(data);
    } catch (err) {
      console.log(err);
      setter({
        status: "error",
        message: err instanceof Error ? err.message : "Error",
      });
    }
  };

  const runMacro = (force = false) =>
    run(setMacroState, async () => await invoke("update_macro", { force }));

  const runSelector = (force = false) =>
    run(
      setSelectorState,
      async () => await invoke("ticker_selector", { force }),
      (data) => {
        const seed_ticker_res = (
          data as unknown as { result: SeedTickerResult }
        )["result"];
        setSeedData(seed_ticker_res);
      },
    );

  const runIndustries = (force = false) =>
    run(
      setIndustryState,
      async () => await invoke("update_industries", { force }),
    );

  const runIdeas = (force = false) =>
    run(setIdeasState, async () => await invoke("idea_generator", { force }));

  const runDeepDive = (force = false) => {
    if (!deepDiveTicker.trim()) return;
    run(
      setDeepDiveState,
      async () =>
        await invoke("deep_dive", {
          ticker: deepDiveTicker.trim().toUpperCase(),
          force,
        }),
    );
  };

  const runProposer = (force = false) =>
    run(
      setProposerState,
      async () =>
        await invoke("positions_proposer", {
          options_mode_override: null,
          force,
        }),
      (data) => {
        // console.log(data);
        if ("proposed_trades" in data) setProposal(data as PositionsProposal);
      },
    );

  // Build a lookup from ticker → alert for passing into PositionCard
  const alertByTicker: Record<string, TriggeredAlert> = {};
  proposal?.triggered_alerts?.forEach((a) => {
    alertByTicker[a.ticker] = a;
  });

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "1fr",
        width: "100%",
        overflow: "hidden",
      }}
    >
      {/* ── View 3: Last Proposal Details ── */}
      <Slide
        direction="left"
        in={currentView === "last-proposal"}
        mountOnEnter
        unmountOnExit
      >
        <VBox
          sx={{
            p: 2,
            gap: 2,
            gridArea: "1 / 1",
            width: `${isMobile ? "100vw" : "93vw"}`,
          }}
        >
          <Box
            sx={{
              top: -10,
              right: 0,
              p: 2,
              position: "fixed",
              display: "flex",
              alignItems: "center",
              gap: 1,
              pl: 0,
            }}
          >
            <Button
              startIcon={<ArrowBackIcon />}
              variant="contained"
              onClick={() => setCurrentView("dashboard")}
              sx={{ mb: 2 }}
            >
              Back to Pipeline
            </Button>
          </Box>
          <PortfolioReview />
        </VBox>
      </Slide>

      {/* ── View 2: Proposal Details ── */}
      <Slide
        direction="left"
        in={currentView === "proposal-detail"}
        mountOnEnter
        unmountOnExit
      >
        <VBox
          sx={{
            p: 2,
            gap: 2,
            gridArea: "1 / 1",
            width: `${isMobile ? "100vw" : "93vw"}`,
          }}
        >
          <Box
            className={`view-container ${currentView === "proposal-detail" ? "fade-enter-active" : "fade-enter"}`}
            sx={{ width: "100%" }}
          >
            <Box
              sx={{
                top: -10,
                right: 0,
                p: 2,
                position: "fixed",
                display: "flex",
                alignItems: "center",
                gap: 1,
                pl: 0,
              }}
            >
              <Button
                startIcon={<ArrowBackIcon />}
                variant="contained"
                onClick={() => setCurrentView("dashboard")}
                sx={{ mb: 2 }}
              >
                Back to Pipeline
              </Button>
            </Box>

            <TitleBox>
              <Box>
                <Typography variant="h1">Portfolio Proposal</Typography>
                <Typography variant="caption" color="text.secondary">
                  AI-powered portfolio proposal
                </Typography>
              </Box>
            </TitleBox>

            {proposal && (
              <Box>
                <Divider sx={{ mb: 2 }} />

                {/* ── Portfolio narrative ── */}
                <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 2 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Portfolio thesis
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {proposal.portfolio_thesis}
                  </Typography>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Macro backdrop
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {proposal.macro_backdrop}
                  </Typography>

                  <Box
                    sx={{ display: "flex", gap: 1, mt: 1.5, flexWrap: "wrap" }}
                  >
                    <Chip
                      label={`${proposal.proposed_trades.length} new/changed positions`}
                      size="small"
                      sx={{
                        fontSize: "0.65rem",
                        background: "rgba(16,185,129,0.15)",
                        color: "#10b981",
                      }}
                    />
                    {proposal.removed_positions.length > 0 && (
                      <Chip
                        label={`${proposal.removed_positions.length} removed: ${proposal.removed_positions.join(", ")}`}
                        size="small"
                        sx={{
                          fontSize: "0.65rem",
                          background: "rgba(239,68,68,0.15)",
                          color: "#ef4444",
                        }}
                      />
                    )}
                    {proposal.triggered_alerts.length > 0 && (
                      <Chip
                        label={`${proposal.triggered_alerts.length} alert${proposal.triggered_alerts.length !== 1 ? "s" : ""}`}
                        size="small"
                        sx={{
                          fontSize: "0.65rem",
                          background: proposal.triggered_alerts.some(
                            (a) => a.severity === "urgent",
                          )
                            ? "rgba(239,68,68,0.15)"
                            : "rgba(245,158,11,0.15)",
                          color: proposal.triggered_alerts.some(
                            (a) => a.severity === "urgent",
                          )
                            ? "#ef4444"
                            : "#f59e0b",
                        }}
                      />
                    )}
                    {/* Friction cost summary */}
                    <Chip
                      label={`~$${proposal.total_estimated_friction_usd.toFixed(0)} friction (${(proposal.total_friction_as_pct_nav * 100).toFixed(3)}% NAV)`}
                      size="small"
                      sx={{ fontSize: "0.65rem" }}
                    />
                    {/* Capital at proposal */}
                    <Chip
                      label={`Capital: $${proposal.capital_at_proposal.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                      size="small"
                      sx={{ fontSize: "0.65rem" }}
                    />
                    <Chip
                      label={`Generated ${new Date(proposal.generated_at).toLocaleTimeString()}`}
                      size="small"
                      sx={{ fontSize: "0.65rem" }}
                    />
                  </Box>
                </Paper>

                {/* ── Triggered alerts panel ── */}
                <TriggeredAlertsPanel alerts={proposal.triggered_alerts} />

                {/* ── Tabs ── */}
                <Tabs
                  value={activeTab}
                  onChange={(_, v) => setActiveTab(v)}
                  sx={{ mb: 2 }}
                  variant="scrollable"
                >
                  <Tab
                    value="proposal"
                    label={`Proposed (${proposal.proposed_trades.length})`}
                    sx={{ fontSize: "0.8rem" }}
                  />
                  <Tab
                    value="unchanged"
                    label={`Unchanged (${proposal.unchanged_positions.length})`}
                    sx={{ fontSize: "0.8rem" }}
                  />
                  {proposal.triggered_alerts.length > 0 && (
                    <Tab
                      value="alerts"
                      label={`Alerts (${proposal.triggered_alerts.length})`}
                      sx={{ fontSize: "0.8rem" }}
                    />
                  )}
                </Tabs>

                {activeTab === "proposal" && (
                  <>
                    {proposal.proposed_trades.map((pos) => (
                      <PositionCard
                        key={pos.ticker}
                        position={pos}
                        onWeightChange={() => {}}
                        showWeightSlider={false}
                        alert={alertByTicker[pos.ticker]}
                      />
                    ))}
                  </>
                )}

                {activeTab === "unchanged" && (
                  <>
                    {proposal.unchanged_positions.length === 0 ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ textAlign: "center", py: 3 }}
                      >
                        All positions were updated in this proposal
                      </Typography>
                    ) : (
                      proposal.unchanged_positions.map((pos) => (
                        <PositionCard
                          key={pos.ticker}
                          position={pos}
                          onWeightChange={() => {}}
                          showWeightSlider={false}
                          status="unchanged"
                          alert={alertByTicker[pos.ticker]}
                        />
                      ))
                    )}
                  </>
                )}

                {activeTab === "alerts" && (
                  <TriggeredAlertsPanel alerts={proposal.triggered_alerts} />
                )}

                {/* ── Action buttons ── */}
                <Button
                  variant="outlined"
                  fullWidth
                  startIcon={<ReplyIcon />}
                  onClick={() => setCounterModalOpen(true)}
                  sx={{ mt: 1, mb: 1 }}
                >
                  Counter-propose / discuss with AI
                </Button>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={() => setShowFinalReview(true)}
                  sx={{ mt: 1, mb: 1 }}
                >
                  Accept & Submit Positions
                </Button>
              </Box>
            )}

            {/* ── Counter-proposer modal ── */}
            <BottomSheetModal
              open={counterModalOpen}
              onClose={() => setCounterModalOpen(false)}
            >
              {proposal && (
                <CounterProposerChat
                  proposal={proposal}
                  submitPositions={submitPositions}
                />
              )}
            </BottomSheetModal>

            {showFinalReview && proposal && (
              <FinalConfirmationOverlay
                proposal={proposal}
                session={{
                  session_id: "",
                  proposal,
                  conversation: [],
                  weight_adjustments: [],
                  hold_current_positions: false,
                  hold_current_reason: "",
                }}
                onClose={() => setShowFinalReview(false)}
                onConfirm={async (counter_proposal, finalPositions) => {
                  return await submitPositions(
                    counter_proposal,
                    finalPositions,
                  );
                }}
                onConfirmAfterSuccess={() => {
                  setShowFinalReview(false);
                  setCurrentView("dashboard");
                }}
              />
            )}
          </Box>
        </VBox>
      </Slide>

      {/* ── View 1: Dashboard ── */}
      <Slide
        direction="right"
        in={currentView === "dashboard"}
        mountOnEnter
        unmountOnExit
      >
        <VBox
          sx={{
            p: 2,
            gap: 2,
            gridArea: "1 / 1",
            width: `${isMobile ? "100vw" : "92vw"}`,
          }}
        >
          <Box sx={{ width: "100%" }}>
            {/* ── Title + options toggle ── */}
            <TitleBox>
              <Box>
                <Typography variant="h1">News Ideas</Typography>
                <Typography variant="caption" color="text.secondary">
                  AI-powered trade idea generation and portfolio proposals
                </Typography>
              </Box>
              {settings && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.options_mode}
                        onChange={(e) => toggleOptionsMode(e.target.checked)}
                        disabled={settingsLoading}
                        size="small"
                        color="warning"
                      />
                    }
                    label={
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        Options mode
                      </Typography>
                    }
                    labelPlacement="start"
                  />
                  {settings.options_mode && (
                    <Chip
                      label="⚠️ Options ON"
                      size="small"
                      sx={{
                        background: "rgba(245,158,11,0.2)",
                        color: "#f59e0b",
                      }}
                    />
                  )}
                </Box>
              )}
            </TitleBox>

            {/* ── Pipeline controls ── */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{
                  mb: 1,
                  fontWeight: 700,
                  color: "text.secondary",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Knowledge base pipeline
              </Typography>

              <FunctionRow
                icon={<StorageIcon fontSize="small" />}
                title="Update Macro"
                description="Rebuilds or incrementally updates macro economy knowledge base for all economies"
                state={macroState}
                onRun={() => runMacro(false)}
                onForce={() => runMacro(true)}
                isDark={isDark}
              />
              <FunctionRow
                icon={<FactoryIcon fontSize="small" />}
                title="Update Industries"
                description="Updates industry headwinds/tailwinds for each economy-sector pair"
                state={industryState}
                onRun={() => runIndustries(false)}
                onForce={() => runIndustries(true)}
                isDark={isDark}
              />
              {/* <FunctionRow
                icon={<AutoFixHighIcon fontSize="small" />}
                title="Ticker Selector"
                description="LLM reads macro + industry KB and proposes seed tickers from first principles — no user bias"
                state={selectorState}
                onRun={() => runSelector(false)}
                onForce={() => runSelector(true)}
                isDark={isDark}
              /> */}
              <FunctionRow
                icon={<AutoFixHighIcon fontSize="small" />}
                title="Ticker Selector"
                description="LLM reads macro + industry KB and proposes seed tickers from first principles — no user bias"
                state={selectorState}
                onRun={() => runSelector(false)}
                onForce={() => runSelector(true)}
                isDark={isDark}
              >
                {/* Render contextually enriched indicators if the underlying state array holds parsed objects */}
                {seedData && seedData.tickers && (
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 1.5,
                      bgcolor: isDark
                        ? "rgba(255,255,255,0.02)"
                        : "rgba(0,0,0,0.01)",
                      border: "1px dashed",
                      borderColor: "divider",
                    }}
                  >
                    {/* Structural Macro Themes Overview */}
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 600, display: "block", mb: 1 }}
                    >
                      🎯 Active Macro Drivers (
                      {seedData.macro_themes?.length || 0})
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 0.5,
                        mb: 1.5,
                      }}
                    >
                      {seedData.macro_themes?.map(
                        (theme: string, idx: number) => (
                          <Chip
                            key={idx}
                            label={theme}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: "0.65rem", height: 22 }}
                          />
                        ),
                      )}
                    </Box>

                    {/* Ticker Vector Metric Breakdowns */}
                    <Grid container spacing={1}>
                      <Grid size={4}>
                        <Box
                          sx={{
                            p: 1,
                            bgcolor: "background.paper",
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "divider",
                            textAlign: "center",
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            Total Pool
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {seedData.tickers.length}
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={4}>
                        <Box
                          sx={{
                            p: 1,
                            bgcolor: "background.paper",
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "divider",
                            textAlign: "center",
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            Long / Short
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            <Box
                              component="span"
                              sx={{ color: "success.main" }}
                            >
                              {
                                seedData.tickers.filter(
                                  (t: any) => t.direction_bias === "long",
                                ).length
                              }
                            </Box>
                            {" / "}
                            <Box component="span" sx={{ color: "error.main" }}>
                              {
                                seedData.tickers.filter(
                                  (t: any) => t.direction_bias === "short",
                                ).length
                              }
                            </Box>
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid size={4}>
                        <Box
                          sx={{
                            p: 1,
                            bgcolor: "background.paper",
                            borderRadius: 1,
                            border: "1px solid",
                            borderColor: "divider",
                            textAlign: "center",
                          }}
                        >
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            Economies
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 700, textTransform: "uppercase" }}
                          >
                            {Array.from(
                              new Set(
                                seedData.tickers.map(
                                  (t: any) => t.economy || "global",
                                ),
                              ),
                            ).join(", ")}
                          </Typography>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </FunctionRow>

              {seedData && (
                <SeedTickerViewer
                  seedData={seedData}
                  selectedAt={seedData.selected_at}
                />
              )}

              <FunctionRow
                icon={<LightbulbOutlinedIcon fontSize="small" />}
                title="Idea Generator"
                description="Scans today's news for mispriced catalysts using 8 systematic heuristics (cached 24h)"
                state={ideasState}
                onRun={() => runIdeas(false)}
                onForce={() => runIdeas(true)}
                isDark={isDark}
              />
              <FunctionRow
                icon={<SearchIcon fontSize="small" />}
                title="Deep Dive"
                description="Full supply-chain + catalyst research on a specific ticker (cached 24h)"
                state={deepDiveState}
                onRun={() => runDeepDive(false)}
                onForce={() => runDeepDive(true)}
                isDark={isDark}
              >
                <TextField
                  size="small"
                  placeholder="Ticker (e.g. AAPL)"
                  value={deepDiveTicker}
                  onChange={(e) =>
                    setDeepDiveTicker(e.target.value.toUpperCase())
                  }
                  onKeyDown={(e) => e.key === "Enter" && runDeepDive(false)}
                  sx={{ width: 160 }}
                />
              </FunctionRow>
              <FunctionRow
                icon={<AccountBalanceWalletIcon fontSize="small" />}
                title="Positions Proposer"
                description="Synthesises all KB context with current positions to generate a portfolio proposal"
                state={proposerState}
                onRun={() => runProposer(false)}
                onForce={() => runProposer(true)}
                isDark={isDark}
              >
                {proposal && (
                  <Button
                    size="small"
                    variant="text"
                    endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                    onClick={() => setCurrentView("proposal-detail")}
                    sx={{ mt: 1, fontSize: "0.7rem", color: "primary.main" }}
                  >
                    Open Detailed Proposal View
                  </Button>
                )}
              </FunctionRow>
              <FunctionRow
                icon={<AccountBalanceWalletIcon fontSize="small" />}
                title="Check out the Last Accepted Positions Proposal"
                description="Shows latest accepted positions proposal"
                state={proposalState}
                isDark={isDark}
                action={
                  <Button
                    size="small"
                    variant="outlined"
                    endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                    onClick={() => setCurrentView("last-proposal")}
                    sx={{
                      fontSize: "0.725rem",
                      py: 0.75,
                      px: 1.5,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Open Detailed Proposal View
                  </Button>
                }
              />
            </Box>

            {/* ── Quick preview ── */}
            {proposal && (
              <Box sx={{ mt: 2, opacity: 0.8 }}>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, color: "text.secondary" }}
                >
                  LATEST PROPOSAL PREVIEW
                </Typography>
                {/* Alert summary row */}
                {proposal.triggered_alerts.length > 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      gap: 0.5,
                      mt: 0.75,
                      flexWrap: "wrap",
                    }}
                  >
                    {proposal.triggered_alerts
                      .filter((a) => a.severity !== "informational")
                      .slice(0, 3)
                      .map((a, i) => (
                        <Chip
                          key={i}
                          label={`${a.ticker}: ${a.recommended_action}`}
                          size="small"
                          sx={{
                            fontSize: "0.6rem",
                            background:
                              a.severity === "urgent"
                                ? "rgba(239,68,68,0.15)"
                                : "rgba(245,158,11,0.15)",
                            color:
                              a.severity === "urgent" ? "#ef4444" : "#f59e0b",
                            fontWeight: 600,
                          }}
                        />
                      ))}
                  </Box>
                )}
                <Paper
                  variant="outlined"
                  sx={{ p: 2, mt: 1, borderRadius: 2, cursor: "pointer" }}
                  onClick={() => setCurrentView("proposal-detail")}
                >
                  <Typography variant="body2" noWrap>
                    {proposal.portfolio_thesis}
                  </Typography>
                </Paper>
              </Box>
            )}
          </Box>
        </VBox>
      </Slide>
    </Box>
  );
}
