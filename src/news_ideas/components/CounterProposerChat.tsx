// src/news_ideas/components/CounterProposerChat.tsx
import {
  Box,
  Button,
  CircularProgress,
  Collapse,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Paper,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useEffect, useRef, useState } from "react";
import { useTheme } from "@mui/material/styles";
import PositionCard from "./PositionCard";
import type {
  ChatMessage,
  CounterProposerResponse,
  CounterProposerSession,
  FinalPosition,
  PositionsProposal,
  ProposedPosition,
  TriggeredAlert,
  WeightAdjustment,
} from "../types";
import { invoke } from "@tauri-apps/api/core";
import { FinalConfirmationOverlay } from "./FinalConfirmationOverlay";
import { useNavigate } from "react-router-dom";

interface Props {
  proposal: PositionsProposal;
  submitPositions: (
    counter_proposal: CounterProposerSession,
    positions: FinalPosition[],
  ) => Promise<string>;
}

type SectionKey = "proposed" | "unchanged" | "removed";

const SECTION_CONFIG: Record<
  SectionKey,
  { label: string; emptyLabel: string; color: string }
> = {
  proposed: {
    label: "Proposed",
    emptyLabel: "No proposed positions",
    color: "#10b981",
  },
  unchanged: {
    label: "Unchanged",
    emptyLabel: "No unchanged positions",
    color: "#3b82f6",
  },
  removed: {
    label: "Removed",
    emptyLabel: "No removed positions",
    color: "#ef4444",
  },
};

// Build a minimal ProposedPosition stub for removed tickers so they can
// be re-added via the weight slider.
function makeRemovedPositionStub(ticker: string): ProposedPosition {
  return {
    ticker,
    primary_exchange: "",
    currency: "",
    direction: "long",
    asset_type: "stock",
    proposed_weight: 0,
    current_weight: 0,
    conviction: 1,
    drivers: [],
    industry_context: { economy: "", industry: "", macro_linkage: "" },
    timing: {
      horizon_days: 0,
      validation_condition: {
        level: 0,
        rationale: "",
        action: "sell",
        signal_type: "technical",
      },
      invalidation_condition: {
        level: 0,
        rationale: "",
        action: "close",
        signal_type: "technical",
      },
      price_corridor_rationale: "",
      monitoring_checklist: [],
    },
    position_state: "hold",
    friction_estimate: {
      estimated_shares_or_contracts: 0,
      commission_usd: 0,
      estimated_slippage_usd: 0,
      total_friction_usd: 0,
      friction_as_pct_of_position: 0,
      round_trip_friction_usd: 0,
      round_trip_friction_pct: 0,
      ibkr_tier: "pro_fixed",
      spread_tier: "mid_cap",
    },
    friction_justification: "",
  };
}

function makeNewTickerStub(ticker: string): ProposedPosition {
  return {
    ...makeRemovedPositionStub(ticker),
    position_state: "new",
  };
}

export default function CounterProposerChat({
  proposal,
  submitPositions,
}: Props) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigator = useNavigate();
  const bottomRef = useRef<HTMLDivElement>(null);

  const removedPositions = proposal.removed_positions.map(
    makeRemovedPositionStub,
  );

  const [session, setSession] = useState<CounterProposerSession>({
    session_id: "",
    proposal,
    conversation: [],
    weight_adjustments: [],
    hold_current_positions: false,
    hold_current_reason: "",
  });
  const [prevWeightPositions, setPrevWeightPositions] = useState<
    WeightAdjustment[]
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "weights">("weights");
  const [collapsedSections, setCollapsedSections] = useState<
    Record<SectionKey, boolean>
  >({
    proposed: false,
    unchanged: true,
    removed: true,
  });

  const [newTickers, setNewTickers] = useState<ProposedPosition[]>([]);
  const [newTickerInput, setNewTickerInput] = useState("");
  const [newTickerCollapsed, setNewTickerCollapsed] = useState(false);
  const [showFinalReview, setShowFinalReview] = useState(false);

  // Build alert lookup from proposal
  const alertByTicker: Record<string, TriggeredAlert> = {};
  proposal.triggered_alerts?.forEach((a) => {
    alertByTicker[a.ticker] = a;
  });

  const handleHoldCurrentPositionsToggled = (
    hold_current_positions: boolean,
  ) => {
    if (session.hold_current_positions === hold_current_positions) return;

    let weight_adjustments = session.weight_adjustments;
    if (session.hold_current_positions) {
      weight_adjustments = prevWeightPositions;
    } else {
      setPrevWeightPositions(session.weight_adjustments);
      weight_adjustments = [];
      for (const stock of session.proposal.proposed_trades) {
        weight_adjustments.push({
          ticker: stock.ticker,
          new_weight: stock.current_weight,
          old_weight: stock.proposed_weight,
          reason: "Holding of current weight",
        });
      }
    }
    setSession({
      ...session,
      hold_current_positions: !session.hold_current_positions,
      weight_adjustments: [...weight_adjustments],
    });
  };

  const handleAddTicker = () => {
    const ticker = newTickerInput.trim().toUpperCase();
    if (!ticker) return;
    const allKnown = [
      ...proposal.proposed_trades.map((p) => p.ticker),
      ...proposal.unchanged_positions.map((p) => p.ticker),
      ...proposal.removed_positions,
      ...newTickers.map((p) => p.ticker),
    ];
    if (allKnown.includes(ticker)) {
      setNewTickerInput("");
      return;
    }
    setNewTickers((prev) => [...prev, makeNewTickerStub(ticker)]);
    setNewTickerInput("");
  };

  const handleRemoveNewTicker = (ticker: string) => {
    setNewTickers((prev) => prev.filter((p) => p.ticker !== ticker));
    setSession((prev) => ({
      ...prev,
      weight_adjustments: prev.weight_adjustments.filter(
        (a) => a.ticker !== ticker,
      ),
    }));
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.conversation]);

  const handleWeightChange = (
    ticker: string,
    newWeight: number,
    reason: string,
  ) => {
    setSession((prev) => {
      const existing = prev.weight_adjustments.find((a) => a.ticker === ticker);
      const original =
        proposal.proposed_trades.find((p) => p.ticker === ticker)
          ?.proposed_weight ??
        proposal.unchanged_positions.find((p) => p.ticker === ticker)
          ?.proposed_weight ??
        0;
      if (existing) {
        return {
          ...prev,
          weight_adjustments: prev.weight_adjustments.map((a) =>
            a.ticker === ticker ? { ...a, new_weight: newWeight, reason } : a,
          ),
        };
      }
      return {
        ...prev,
        weight_adjustments: [
          ...prev.weight_adjustments,
          { ticker, old_weight: original, new_weight: newWeight, reason },
        ],
      };
    });
  };

  const handleSend = async () => {
    if (!input.trim() && !session.hold_current_positions) return;

    const userMsg: ChatMessage = {
      role: "user",
      content:
        input.trim() ||
        `I want to hold my current positions. ${session.hold_current_reason}`,
      timestamp: new Date().toISOString(),
    };

    setSession((prev) => ({
      ...prev,
      conversation: [...prev.conversation, userMsg],
    }));
    setInput("");
    setLoading(true);

    try {
      const resp = await invoke<CounterProposerResponse>("counter_proposer", {
        session,
        userMessage: userMsg.content,
      }).catch((err) => {
        throw Error(`Failed to send counter proposal: ${err}`);
      });

      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: resp.response,
        timestamp: resp.timestamp,
      };
      setSession((prev) => ({
        ...prev,
        session_id: resp.session_id,
        conversation: [...prev.conversation, assistantMsg],
      }));
    } catch (err) {
      const errMsg: ChatMessage = {
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        timestamp: new Date().toISOString(),
      };
      setSession((prev) => ({
        ...prev,
        conversation: [...prev.conversation, errMsg],
      }));
    } finally {
      setLoading(false);
    }
  };

  const adjustmentCount = session.weight_adjustments.filter(
    (a) => Math.abs(a.new_weight - a.old_weight) > 0.001,
  ).length;

  const toggleSection = (key: SectionKey) =>
    setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const renderSection = (key: SectionKey, positions: ProposedPosition[]) => {
    const cfg = SECTION_CONFIG[key];
    const isCollapsed = collapsedSections[key];
    if (positions.length === 0) return null;

    return (
      <Box key={key} sx={{ mb: 1 }}>
        <Box
          onClick={() => toggleSection(key)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1,
            py: 0.75,
            mb: 1,
            cursor: "pointer",
            borderRadius: 1.5,
            "&:hover": {
              background: isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(0,0,0,0.03)",
            },
          }}
        >
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: cfg.color,
              flexShrink: 0,
            }}
          />
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: cfg.color,
              flex: 1,
            }}
          >
            {cfg.label}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {positions.length} position{positions.length !== 1 ? "s" : ""}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 700 }}
          >
            {isCollapsed ? "▸" : "▾"}
          </Typography>
        </Box>

        {!isCollapsed &&
          positions.map((pos) => (
            <PositionCard
              key={pos.ticker}
              position={pos}
              weightAdjustment={session.weight_adjustments.find(
                (a) => a.ticker === pos.ticker,
              )}
              onWeightChange={handleWeightChange}
              showWeightSlider={true}
              status={
                key === "proposed"
                  ? "proposed"
                  : key === "unchanged"
                    ? "unchanged"
                    : "removed"
              }
              fixedSlider={session.hold_current_positions}
              alert={alertByTicker[pos.ticker]}
            />
          ))}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        maxHeight: "90vh",
      }}
    >
      {/* ── Header ── */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Counter-Proposer
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Adjust weights, challenge the thesis, or propose holding current
          positions
        </Typography>
        <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
          {(["weights", "chat"] as const).map((tab) => (
            <Button
              key={tab}
              size="small"
              variant={activeTab === tab ? "contained" : "outlined"}
              onClick={() => setActiveTab(tab)}
              sx={{ textTransform: "capitalize", minWidth: 90 }}
            >
              {tab === "weights"
                ? `Weights${adjustmentCount > 0 ? ` (${adjustmentCount})` : ""}`
                : `Discussion${session.conversation.length > 0 ? ` (${session.conversation.length})` : ""}`}
            </Button>
          ))}
        </Box>
      </Box>

      {/* ── Weights tab ── */}
      {activeTab === "weights" && (
        <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
          {/* Hold current positions toggle */}
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 2,
              borderRadius: 2,
              background: session.hold_current_positions
                ? "rgba(239,68,68,0.06)"
                : undefined,
              borderColor: session.hold_current_positions
                ? "rgba(239,68,68,0.3)"
                : undefined,
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={session.hold_current_positions}
                  onChange={(e) =>
                    handleHoldCurrentPositionsToggled(e.target.checked)
                  }
                  color="error"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Counter-propose: hold current positions
                </Typography>
              }
            />
            {session.hold_current_positions && (
              <TextField
                fullWidth
                size="small"
                placeholder="Why do you want to hold current positions?"
                value={session.hold_current_reason}
                onChange={(e) =>
                  setSession((prev) => ({
                    ...prev,
                    hold_current_reason: e.target.value,
                  }))
                }
                sx={{ mt: 1.5 }}
                multiline
                rows={2}
              />
            )}
          </Paper>

          {/* Positions grouped by status */}
          {renderSection("proposed", proposal.proposed_trades)}
          {renderSection("unchanged", proposal.unchanged_positions)}
          {renderSection("removed", removedPositions)}

          {/* ── New tickers section ── */}
          <Box sx={{ mb: 1 }}>
            <Box
              onClick={() => setNewTickerCollapsed((v) => !v)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1,
                py: 0.75,
                mb: 1,
                cursor: "pointer",
                borderRadius: 1.5,
                "&:hover": {
                  background: isDark
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.03)",
                },
              }}
            >
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#a855f7",
                  flexShrink: 0,
                }}
              />
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#a855f7",
                  flex: 1,
                }}
              >
                New Positions
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {newTickers.length} position{newTickers.length !== 1 ? "s" : ""}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 700 }}
              >
                {newTickerCollapsed ? "▸" : "▾"}
              </Typography>
            </Box>

            {!newTickerCollapsed && (
              <>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    mb: 1.5,
                    borderRadius: 2,
                    borderColor: isDark
                      ? "rgba(168,85,247,0.25)"
                      : "rgba(168,85,247,0.3)",
                    background: isDark
                      ? "rgba(168,85,247,0.04)"
                      : "rgba(168,85,247,0.03)",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 1 }}
                  >
                    Add a ticker to propose it as a new position. Set its target
                    weight with the slider.
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <TextField
                      size="small"
                      placeholder="Ticker (e.g. NVDA)"
                      value={newTickerInput}
                      onChange={(e) =>
                        setNewTickerInput(e.target.value.toUpperCase())
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddTicker();
                        }
                      }}
                      inputProps={{ maxLength: 12, style: { fontWeight: 700 } }}
                      sx={{ flex: 1 }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <AddCircleOutlineIcon
                              sx={{ fontSize: 16, color: "#a855f7" }}
                            />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={handleAddTicker}
                      disabled={!newTickerInput.trim()}
                      sx={{
                        borderColor: "#a855f7",
                        color: "#a855f7",
                        "&:hover": {
                          borderColor: "#9333ea",
                          background: "rgba(168,85,247,0.08)",
                        },
                        minWidth: 64,
                      }}
                    >
                      Add
                    </Button>
                  </Box>
                </Paper>

                {newTickers.map((pos) => (
                  <Box key={pos.ticker} sx={{ position: "relative" }}>
                    <Tooltip title="Remove ticker">
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveNewTicker(pos.ticker)}
                        sx={{
                          position: "absolute",
                          top: 14,
                          right: 110,
                          zIndex: 1,
                          color: "#ef4444",
                          opacity: 0.7,
                          "&:hover": { opacity: 1 },
                        }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <PositionCard
                      position={pos}
                      weightAdjustment={session.weight_adjustments.find(
                        (a) => a.ticker === pos.ticker,
                      )}
                      onWeightChange={handleWeightChange}
                      showWeightSlider={true}
                      status="new"
                    />
                  </Box>
                ))}

                {newTickers.length === 0 && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ px: 1, display: "block" }}
                  >
                    No new tickers added yet.
                  </Typography>
                )}
              </>
            )}
          </Box>

          {adjustmentCount > 0 || session.hold_current_positions ? (
            <Button
              variant="outlined"
              fullWidth
              onClick={() => setActiveTab("chat")}
              sx={{ mt: 1 }}
            >
              {session.hold_current_positions ? (
                <>Discuss holding current positions with the model →</>
              ) : (
                <>
                  Discuss {adjustmentCount} adjustment
                  {adjustmentCount > 1 ? "s" : ""} with the model →
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="contained"
              fullWidth
              onClick={() => setShowFinalReview(true)}
              sx={{ mt: 1 }}
            >
              Accept & Submit Positions
            </Button>
          )}
        </Box>
      )}

      {/* ── Chat tab ── */}
      {activeTab === "chat" && (
        <>
          <Box
            sx={{
              flex: 1,
              overflow: "auto",
              p: 2,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            {session.conversation.length === 0 && (
              <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
                <Typography variant="body2">
                  Adjust weights on the Weights tab or type your
                  counter-argument below.
                </Typography>
              </Box>
            )}
            {session.conversation.map((msg, i) => (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  justifyContent:
                    msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <Paper
                  sx={{
                    p: 1.5,
                    maxWidth: "85%",
                    borderRadius: 2,
                    background:
                      msg.role === "user"
                        ? "primary.main"
                        : isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(0,0,0,0.04)",
                    color:
                      msg.role === "user"
                        ? "primary.contrastText"
                        : "text.primary",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}
                  >
                    {msg.content}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      mt: 0.5,
                      opacity: 0.6,
                      fontSize: "0.6rem",
                    }}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </Typography>
                </Paper>
              </Box>
            ))}
            {loading && (
              <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
                <Paper
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    background: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(0,0,0,0.04)",
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <CircularProgress size={14} />
                  <Typography variant="caption" color="text.secondary">
                    Thinking…
                  </Typography>
                </Paper>
              </Box>
            )}
            <div ref={bottomRef} />
          </Box>

          <Divider />

          <Collapse in={session.conversation.length > 0}>
            <Box sx={{ px: 2, pb: 2 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: isDark
                    ? "rgba(46, 125, 50, 0.15)"
                    : "rgba(46, 125, 50, 0.05)",
                  border: "1px solid",
                  borderColor: "success.main",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600, color: "success.main" }}
                >
                  Ready to finalize?
                </Typography>
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  onClick={() => setShowFinalReview(true)}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Finish Discussion and Submit Positions
                </Button>
              </Paper>
            </Box>
          </Collapse>

          {(adjustmentCount > 0 || session.hold_current_positions) && (
            <Box sx={{ px: 2, pt: 1.5, pb: 0 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 600 }}
              >
                Included adjustments:
              </Typography>
              {session.weight_adjustments
                .filter((a) => Math.abs(a.new_weight - a.old_weight) > 0.001)
                .map((a) => (
                  <Typography
                    key={a.ticker}
                    variant="caption"
                    display="block"
                    color="text.secondary"
                  >
                    {a.ticker}: {(a.old_weight * 100).toFixed(1)}% →{" "}
                    {(a.new_weight * 100).toFixed(1)}%
                    {a.reason && ` — "${a.reason}"`}
                  </Typography>
                ))}
            </Box>
          )}

          <Box sx={{ p: 2, display: "flex", gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Your counter-argument…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              multiline
              maxRows={4}
              disabled={loading}
            />
            <Button
              variant="contained"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              sx={{ minWidth: 48, px: 1.5 }}
            >
              <SendIcon fontSize="small" />
            </Button>
          </Box>
        </>
      )}

      {showFinalReview && (
        <FinalConfirmationOverlay
          proposal={proposal}
          session={session}
          onClose={() => setShowFinalReview(false)}
          onConfirm={async (counter_proposal, finalPositions) => {
            return await submitPositions(counter_proposal, finalPositions);
          }}
          onConfirmAfterSuccess={() => {
            setShowFinalReview(false);
            navigator("/news_ideas");
          }}
        />
      )}
    </Box>
  );
}
