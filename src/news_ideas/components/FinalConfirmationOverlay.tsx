import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Divider,
  List,
  ListItem,
  Chip,
  IconButton,
  Fade,
  Snackbar,
  Alert,
  useTheme,
  AlertColor,
  Input,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import {
  PositionsProposal,
  CounterProposerSession,
  FinalPosition,
} from "../types";
import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import { HBox } from "../../theme";

export type strategy = {
  strategy: string;
  capital: number;
  initial_capital: number;
  status: string;
};

interface MinimalContract {
  stock: string;
  primary_exchange: string;
  currency: string;
  current_price: number;
}

type ContractFetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; contracts: MinimalContract[]; duplicates: string[] };

interface FinalConfirmationOverlayProps {
  proposal: PositionsProposal;
  session?: CounterProposerSession;
  onClose: () => void;
  onConfirm: (
    counter_proposal: CounterProposerSession,
    finalPositions: FinalPosition[],
  ) => Promise<string>;
  onConfirmAfterSuccess: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function contractKey(c: MinimalContract) {
  return `${c.stock}|${c.primary_exchange}|${c.currency}`;
}

function contractLabel(c: MinimalContract) {
  const exchange = c.primary_exchange || "—";
  const currency = c.currency || "—";
  return `${exchange} · ${currency}`;
}

function findDuplicates(contracts: MinimalContract[]): string[] {
  const seen = new Map<string, number>();
  for (const c of contracts) {
    const k = contractKey(c);
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  return [...seen.entries()]
    .filter(([, count]) => count > 1)
    .map(([k]) => {
      const [, exchange, currency] = k.split("|");
      return `${exchange || "—"} · ${currency || "—"}`;
    });
}

const STORE_KEY_PREFIX = "contract_default:";

// ── Per-row contract selector ─────────────────────────────────────────────────

interface ContractSelectorProps {
  ticker: string;
  onContractChange: (contract: MinimalContract | null) => void;
}

const ContractSelector: React.FC<ContractSelectorProps> = ({
  ticker,
  onContractChange,
}) => {
  const [fetchState, setFetchState] = useState<ContractFetchState>({
    status: "idle",
  });
  const [selected, setSelected] = useState<string>("");

  // Load saved default and fetch contracts on mount
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setFetchState({ status: "loading" });

      // Load persisted default
      let savedKey: string | null = null;
      try {
        const store = await load("store.json", { autoSave: false });
        const saved = await store.get<MinimalContract>(
          `${STORE_KEY_PREFIX}${ticker}`,
        );
        if (saved) {
          savedKey = contractKey(saved);
        }
      } catch {
        // Non-fatal — continue without default
      }

      try {
        const contracts = await invoke<MinimalContract[]>(
          "get_possible_contracts",
          {
            stock: ticker,
            primary_exchange: "",
            currency: "",
          },
        );

        if (cancelled) return;

        const duplicates = findDuplicates(contracts);

        setFetchState({ status: "success", contracts, duplicates });

        // Auto-select: saved default first, otherwise first contract
        if (contracts.length > 0) {
          const defaultContract =
            savedKey && contracts.find((c) => contractKey(c) === savedKey)
              ? contracts.find((c) => contractKey(c) === savedKey)!
              : contracts[0];

          const key = contractKey(defaultContract);
          setSelected(key);
          onContractChange(defaultContract);
        } else {
          onContractChange(null);
        }
      } catch (err) {
        if (cancelled) return;
        setFetchState({
          status: "error",
          message: String(err),
        });
        onContractChange(null);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticker]);

  const handleChange = useCallback(
    async (key: string) => {
      if (fetchState.status !== "success") return;
      const contract = fetchState.contracts.find((c) => contractKey(c) === key);
      if (!contract) return;

      setSelected(key);
      onContractChange(contract);

      // Persist default
      try {
        const store = await load("store.json", { autoSave: false });
        await store.set(`${STORE_KEY_PREFIX}${ticker}`, contract);
        await store.save();
      } catch {
        // Non-fatal
      }
    },
    [fetchState, ticker, onContractChange],
  );

  if (fetchState.status === "idle" || fetchState.status === "loading") {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
        <CircularProgress size={12} />
        <Typography variant="caption" color="text.secondary">
          Loading contracts…
        </Typography>
      </Box>
    );
  }

  if (fetchState.status === "error") {
    return (
      <Tooltip title={fetchState.message} placement="bottom-start">
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
          <WarningAmberIcon sx={{ fontSize: 14, color: "warning.main" }} />
          <Typography variant="caption" color="warning.main">
            Failed to load contracts — position will be set to 0
          </Typography>
        </Box>
      </Tooltip>
    );
  }

  if (fetchState.status === "success" && fetchState.contracts.length === 0) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
        <WarningAmberIcon sx={{ fontSize: 14, color: "warning.main" }} />
        <Typography variant="caption" color="warning.main">
          No contracts found — position will be set to 0
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mt: 0.75 }}>
      {/* Duplicate warning */}
      {fetchState.duplicates.length > 0 && (
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 0.5,
            mb: 0.5,
          }}
        >
          <WarningAmberIcon
            sx={{ fontSize: 13, color: "warning.main", mt: "1px" }}
          />
          <Typography variant="caption" color="warning.main">
            Duplicate contracts: {fetchState.duplicates.join(", ")}
          </Typography>
        </Box>
      )}

      <FormControl size="small" variant="outlined" sx={{ minWidth: 180 }}>
        <InputLabel sx={{ fontSize: "0.7rem" }}>Contract</InputLabel>
        <Select
          value={selected}
          label="Contract"
          onChange={(e) => handleChange(e.target.value)}
          sx={{ fontSize: "0.75rem", height: 30 }}
        >
          {fetchState.contracts.map((c) => {
            const key = contractKey(c);
            const isDupe = fetchState.duplicates.includes(contractLabel(c));
            return (
              <MenuItem key={key} value={key} sx={{ fontSize: "0.75rem" }}>
                {contractLabel(c)}
                {isDupe && (
                  <WarningAmberIcon
                    sx={{ fontSize: 13, ml: 0.75, color: "warning.main" }}
                  />
                )}
              </MenuItem>
            );
          })}
        </Select>
      </FormControl>
    </Box>
  );
};

// ── Main overlay ──────────────────────────────────────────────────────────────

export const FinalConfirmationOverlay: React.FC<
  FinalConfirmationOverlayProps
> = ({ proposal, session, onClose, onConfirm, onConfirmAfterSuccess }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [avgPrices, setAvgPrices] = useState(
    new Map<string, number | string>(),
  );

  // Map of ticker → chosen MinimalContract (null = failed/empty fetch)
  const [selectedContracts, setSelectedContracts] = useState(
    new Map<string, MinimalContract | null>(),
  );

  const [toast, setToast] = useState({
    open: false,
    severity: "error",
    message: "Failed to send updated target positions",
  });

  // ── Helpers ────────────────────────────────────────────────────────────────

  const getFinalWeight = (ticker: string, originalWeight: number) => {
    if (session) {
      const adj = session.weight_adjustments.find((a) => a.ticker === ticker);
      return adj ? adj.new_weight : originalWeight;
    }
    return originalWeight;
  };

  const isStockPosition = (pos: { asset_type: string }) =>
    pos.asset_type === "stock";

  // ── Build final positions list ─────────────────────────────────────────────

  const allPositions = [
    ...proposal.proposed_trades,
    ...proposal.unchanged_positions,
  ];

  const allPositionsTickers = new Set(allPositions.map((p) => p.ticker));

  const finalPositions: FinalPosition[] = allPositions.map((position) => ({
    ticker: position.ticker,
    exchange: position.primary_exchange,
    primary_exchange: position.primary_exchange,
    currency: position.currency,
    asset_type: position.asset_type,
    new_weight: getFinalWeight(position.ticker, position.proposed_weight),
    avg_price: 0,
  }));

  session?.weight_adjustments.forEach((wa) => {
    if (allPositionsTickers.has(wa.ticker)) return;
    finalPositions.push({
      ticker: wa.ticker,
      exchange: "",
      asset_type: "stock",
      new_weight: wa.new_weight,
      avg_price: 0,
      primary_exchange: "",
      currency: "",
    });
  });

  useEffect(() => {
    finalPositions.forEach((pos) => {
      avgPrices.set(pos.ticker, 0.0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Contract change handler ────────────────────────────────────────────────

  const handleContractChange = useCallback(
    (ticker: string, contract: MinimalContract | null) => {
      setSelectedContracts((prev) => {
        const next = new Map(prev);
        next.set(ticker, contract);
        return next;
      });
    },
    [],
  );

  // ── Submission ─────────────────────────────────────────────────────────────

  const handleConfirm = async () => {
    try {
      const raw_strat_capital = await invoke<{ sgd_value: number }>(
        "get_capital_now",
      );
      const strat_capital = raw_strat_capital.sgd_value;
      // const strat_capital = (await invoke<strategy[]>(
      //   "get_all_strategies",
      // ).then((strategies) => {
      //   return strategies.find((s) => s.strategy === "manual")!.capital;
      // })) as number;

      const positions = await Promise.all(
        finalPositions.map(async (position) => {
          const isStock = position.asset_type === "stock";
          const contract = isStock
            ? selectedContracts.get(position.ticker) ?? null
            : null;

          // If stock but no valid contract, force weight to 0
          const contractMissing = isStock && contract === null;
          const price = contract?.current_price ?? 1.0;

          const avg_price = avgPrices.get(position.ticker);
          const resolvedAvgPrice =
            avg_price === "" ? 0.0 : (avg_price as number);

          return {
            position: {
              ...position,
              new_weight: contractMissing ? 0 : position.new_weight,
              avg_price: resolvedAvgPrice,
              primary_exchange: contract?.primary_exchange ?? "",
              currency: contract?.currency ?? "",
            },
            price,
          };
        }),
      );

      const res = await onConfirm(
        session!,
        await Promise.all(
          positions.map(async ({ position, price }) => {
            let effectivePrice =
              position.avg_price === 0.0 ? price : position.avg_price;
            if (position.currency != "SGD") {
              let raw_price = await invoke<{ price: number }>(
                "get_exchange_rate",
                {
                  quote: `${position.currency}`,
                },
              );
              let exchange_rate = raw_price.price;
              effectivePrice *= exchange_rate;
            }
            return {
              ...position,
              new_weight: Math.floor(
                (position.new_weight * strat_capital) /
                  (effectivePrice as number),
              ),
            };
          }),
        ),
      );

      if (res !== "") {
        setToast({
          ...toast,
          open: true,
          message: `Failed to send updated target positions: ${res}`,
          severity: "error",
        });
      } else {
        setToast({
          ...toast,
          open: true,
          message: "Positions successfully updated!",
          severity: "success",
        });
        await new Promise((resolve) => setTimeout(resolve, 5000));
        onConfirmAfterSuccess();
      }
    } catch (e) {
      setToast({
        ...toast,
        open: true,
        message: `Failed to submit positions: ${e}`,
        severity: "error",
      });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Fade in={true}>
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          bgcolor: "background.default",
          zIndex: 1300,
          display: "flex",
          flexDirection: "column",
          p: { xs: 2, md: 4 },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 3,
          }}
        >
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              Review Final Positions
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Please perform a final check of your portfolio weights and
              direction before submission.
            </Typography>
          </Box>
          <IconButton onClick={onClose} sx={{ mt: -1 }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Scrollable Content Area */}
        <Box sx={{ flex: 1, overflow: "auto", mb: 3 }}>
          <Paper
            variant="outlined"
            sx={{ borderRadius: 3, overflow: "hidden" }}
          >
            <Box
              sx={{ p: 2, bgcolor: "action.hover", display: "flex", gap: 2 }}
            >
              <Chip
                icon={<TrendingUpIcon />}
                label="Final Allocations"
                color="primary"
              />
              <Chip
                label={`${allPositions.length} Active Positions`}
                variant="outlined"
              />
            </Box>
            <Divider />

            <List disablePadding>
              {allPositions
                .sort(
                  (a, b) =>
                    getFinalWeight(b.ticker, b.proposed_weight) -
                    getFinalWeight(a.ticker, a.proposed_weight),
                )
                .map((pos, index) => {
                  const finalWeight = getFinalWeight(
                    pos.ticker,
                    pos.proposed_weight,
                  );
                  const isAdjusted = session
                    ? session.weight_adjustments.some(
                        (a) => a.ticker === pos.ticker,
                      )
                    : false;
                  const isStock = isStockPosition(pos);

                  // Warn if stock has no valid contract yet
                  const contractForRow = selectedContracts.get(pos.ticker);
                  const contractResolved = selectedContracts.has(pos.ticker); // set after fetch completes
                  const contractMissing =
                    isStock && contractResolved && contractForRow === null;

                  console.log(pos);
                  return (
                    <React.Fragment key={pos.ticker}>
                      <ListItem
                        sx={{
                          py: 2,
                          px: 3,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          bgcolor: contractMissing ? "warning.main" : undefined,
                          opacity: contractMissing ? 0.08 : 1,
                        }}
                      >
                        {/* Left: ticker info + contract selector */}
                        <Box>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                            }}
                          >
                            <Typography
                              variant="subtitle1"
                              sx={{ fontWeight: 700 }}
                            >
                              {pos.ticker}
                            </Typography>
                            <Chip
                              label={pos.direction.toUpperCase()}
                              size="small"
                              color={
                                pos.direction === "long" ? "success" : "error"
                              }
                              sx={{ fontSize: "0.6rem", height: 20 }}
                            />
                            {contractMissing && (
                              <Tooltip title="No contract found — quantity will be 0">
                                <WarningAmberIcon
                                  sx={{
                                    fontSize: 16,
                                    color: "warning.main",
                                    opacity: 1,
                                  }}
                                />
                              </Tooltip>
                            )}
                          </Box>

                          <Typography variant="caption" color="text.secondary">
                            {pos.asset_type.replace("_", " ")} •{" "}
                            {pos.primary_exchange}
                          </Typography>

                          {/* Contract selector — stocks only */}
                          {isStock && (
                            <ContractSelector
                              ticker={pos.ticker}
                              onContractChange={(contract) =>
                                handleContractChange(pos.ticker, contract)
                              }
                            />
                          )}
                        </Box>

                        {/* Right: price input + weight */}
                        <HBox sx={{ width: "fit-content" }}>
                          <HBox>
                            <Typography variant="body1">Price:</Typography>
                            <Input
                              type="number"
                              value={avgPrices.get(pos.ticker)}
                              onChange={(e) => {
                                e.preventDefault();
                                const value = e.target.value;
                                setAvgPrices((prev) => {
                                  const next = new Map(prev);
                                  next.set(
                                    pos.ticker,
                                    value === "" ? "" : Number(value),
                                  );
                                  return next;
                                });
                              }}
                              placeholder="Empty/0 for Mkt Order"
                            />
                          </HBox>
                          <Box sx={{ textAlign: "right", width: "6rem" }}>
                            <Typography
                              variant="h6"
                              sx={{
                                fontWeight: 600,
                                color: contractMissing
                                  ? "warning.main"
                                  : isAdjusted
                                    ? "primary.main"
                                    : "text.primary",
                              }}
                            >
                              {contractMissing
                                ? "0.00%"
                                : `${(finalWeight * 100).toFixed(2)}%`}
                            </Typography>
                            {isAdjusted && !contractMissing && (
                              <Typography
                                variant="caption"
                                sx={{
                                  fontStyle: "italic",
                                  color: "primary.main",
                                }}
                              >
                                Adjusted in chat
                              </Typography>
                            )}
                            {contractMissing && (
                              <Typography
                                variant="caption"
                                sx={{
                                  fontStyle: "italic",
                                  color: "warning.main",
                                }}
                              >
                                No contract
                              </Typography>
                            )}
                          </Box>
                        </HBox>
                      </ListItem>
                      {index < allPositions.length - 1 && (
                        <Divider component="li" />
                      )}
                    </React.Fragment>
                  );
                })}
            </List>
          </Paper>

          {proposal.removed_positions.length > 0 && (
            <Paper
              variant="outlined"
              sx={{
                mt: 2,
                p: 2,
                borderRadius: 3,
                borderColor: "error.light",
                bgcolor: "error.main",
                opacity: 0.05,
              }}
            >
              <Typography
                variant="body2"
                color="error.main"
                sx={{ fontWeight: 600 }}
              >
                Positions to be closed: {proposal.removed_positions.join(", ")}
              </Typography>
            </Paper>
          )}
        </Box>

        {/* Footer */}
        <Box
          sx={{
            p: 3,
            borderRadius: 4,
            bgcolor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
            border: "1px solid",
            borderColor: "divider",
            textAlign: "center",
          }}
        >
          <Typography
            variant="body2"
            sx={{ mb: 2, color: "text.secondary", maxWidth: 600, mx: "auto" }}
          >
            By clicking confirm, these positions will be sent to the execution
            engine. Ensure you have reviewed the
            <strong> conviction drivers</strong> and{" "}
            <strong>invalidation conditions</strong> for any newly added
            tickers.
          </Typography>

          <Box sx={{ display: "flex", gap: 2, justifyContent: "center" }}>
            <Button
              variant="outlined"
              size="large"
              onClick={onClose}
              sx={{ minWidth: "30%" }}
            >
              Back to Chat
            </Button>
            <Button
              variant="contained"
              size="large"
              color="success"
              startIcon={<CheckCircleOutlineIcon />}
              onClick={handleConfirm}
              sx={{ minWidth: "70%", fontWeight: 700 }}
            >
              Confirm and Submit Positions
            </Button>
          </Box>
        </Box>

        <Snackbar
          open={toast.open}
          autoHideDuration={6000}
          onClose={() => setToast({ ...toast, open: false })}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            onClose={() => setToast({ ...toast, open: false })}
            severity={toast.severity as AlertColor}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      </Box>
    </Fade>
  );
};
