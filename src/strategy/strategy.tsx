import { useEffect, useState } from "react";
import {
  // useTheme,
  Paper,
  Typography,
  Box,
  Button,
  // Divider,
  // Switch,
  // FormControlLabel,
  // MenuItem,
  // Select,
  // FormControl,
  // InputLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  // IconButton,
} from "@mui/material";
// import TrendingDownIcon from "@mui/icons-material/TrendingDown";
// import TrendingUpIcon from "@mui/icons-material/TrendingUp";
// import BarChartIcon from "@mui/icons-material/BarChart";
// import PercentIcon from "@mui/icons-material/Percent";
import CloseIcon from "@mui/icons-material/Close";
// import { Paper, Typography, Box, Button } from "@mui/material";
import SelectField from "../components/Select";
import MetricCard from "../components/MetricCard";
import Position from "../components/Position";
import PerformanceChart from "../components/PerformanceChart";
import { GridBox, HBox, TitleBox, VBox } from "../theme";
import { invoke } from "@tauri-apps/api/core";
import BottomSheetModal from "../components/MobilePopupModal";

// KPI data with icons
// const kpiData = [
//   {
//     title: "CAGR",
//     value: "+28.5%",
//     variant: "success",
//     icon: <TrendingUpIcon />,
//   },
//   {
//     title: "Max Drawdown",
//     value: "-12.3%",
//     variant: "error",
//     icon: <TrendingDownIcon />,
//   },
//   {
//     title: "Sharpe Ratio",
//     value: "1.74",
//     variant: "primary",
//     icon: <BarChartIcon />,
//   },
//   {
//     title: "Win Rate",
//     value: "63.2%",
//     variant: "warning",
//     icon: <PercentIcon />,
//   },
// ];

// Sample performance data - formatted for lightweight-charts
// const performanceData = [
//   { time: "2025-01-01", value: 1000 },
//   { time: "2025-01-15", value: 1040 },
//   { time: "2025-02-01", value: 1120 },
//   { time: "2025-02-15", value: 1080 },
//   { time: "2025-03-01", value: 1050 },
//   { time: "2025-03-15", value: 1100 },
//   { time: "2025-04-01", value: 1150 },
//   { time: "2025-04-15", value: 1230 },
//   { time: "2025-05-01", value: 1285 },
// ];

// const positions = [
//   { symbol: "AAPL", price: 174.32, position: 25 },
//   { symbol: "MSFT", price: 412.65, position: 12 },
//   { symbol: "TSLA", price: 215.43, position: -8 },
//   { symbol: "AMZN", price: 185.07, position: 4 },
//   { symbol: "NVDA", price: 940.18, position: 30 },
// ];

export type PortfolioDataForStrategy = {
  strategy: string;
  portfolio: [string, number][];
  metrics: {
    cagr: number;
    sharpe_ratio: number;
    max_drawdown: number;
    calmar_ratio: number;
    profit_factor: number | null;
    win_rate: number;
    avg_trade_return: number;
    positions: {
      [stock: string]: [number, number, number];
    };
  };
};

export type metric = {
  title: string;
  value: string;
  variant: string;
};

export type position = {
  stock: string;
  avg_price: number;
  quantity: number;
  recent_pnl: number;
};

export type strategy = {
  strategy: string;
  capital: number;
  initial_capital: number;
  status: string;
};

const ModalContent = ({
  // confirmationPageOpen,
  handlePauseGracefully,
  handlePauseImmediately,
}: {
  // confirmationPageOpen: boolean;
  handlePauseGracefully: () => void;
  handlePauseImmediately: () => void;
}) => {
  return (
    <>
      <DialogTitle>How do you want to stop your strategy?</DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ whiteSpace: "pre-line" }}>
          {`Pause Gracefully: Strategy will still be in play until positions are 0, after which they will stop  

            Pause Immediately: Immediately close all positions using market orders`}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <VBox>
          <Button
            fullWidth
            variant="outlined"
            color="warning"
            onClick={handlePauseGracefully}
            startIcon={null}
            sx={{
              py: 1,
              fontWeight: 500,
              textAlign: "left",
              // bgcolor: "error.main"
              boxShadow: 0,
            }}
          >
            Pause Gracefully
          </Button>

          <Button
            fullWidth
            variant="outlined"
            color="error"
            onClick={handlePauseImmediately}
            startIcon={null}
            sx={{
              py: 1,
              fontWeight: 500,
              textAlign: "left",
              // bgcolor: "error.main"
              boxShadow: 0,
            }}
          >
            Pause Immediately
          </Button>
        </VBox>
      </DialogActions>
    </>
  );
};

const ConfirmationDialog = ({
  openModal,
  handleCloseModal,
  handleConfirmSubmit,
}: {
  openModal: boolean;
  handleCloseModal: () => void;
  handleConfirmSubmit: () => void;
}) => {
  return (
    <Dialog
      open={openModal}
      onClose={handleCloseModal}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle id="alert-dialog-title">{"Pause Strategy"}</DialogTitle>
      <DialogContent>
        <DialogContentText id="alert-dialog-description">
          Are you sure you want to pause this strategy? This cannot be reversed
          easily.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleCloseModal} color="primary">
          Cancel
        </Button>
        <Button
          onClick={handleConfirmSubmit}
          color="primary"
          variant="contained"
          autoFocus
        >
          Confirm Pause Strategy
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Main Dashboard Component
export default function StrategyDashboard() {
  // const theme = useTheme();
  const [timestep, setTimestep] = useState("5 min");
  const [strategy, setStrategy] = useState("");
  // const [strategy_arr] = useState(["EMA", "SMA"]);
  const [timesteps_arr] = useState(["5 min", "30 min", "1 day", "1 week"]);
  const [strategies, setStrategies] = useState([] as strategy[]);
  const [performanceData, setPerformanceData] = useState(
    [] as { time: number; value: number }[],
  );
  const [metrics, setMetrics] = useState([] as metric[]);
  const [positions, setPositions] = useState([] as position[]);
  function getMetricVariant(
    title: string,
    value: number,
  ): "success" | "warning" | "error" | "primary" {
    switch (title) {
      case "CAGR":
        return value > 0.15 ? "success" : value > 0.05 ? "warning" : "error";
      case "Win Rate":
        return value > 0.6 ? "success" : value > 0.4 ? "warning" : "error";
      case "Calmar Ratio":
        return value > 3 ? "success" : value > 1 ? "warning" : "error";
      case "Max Drawdown":
        return value < 0.1 ? "success" : value < 0.25 ? "warning" : "error";
      case "Sharpe Ratio":
        return value > 2 ? "success" : value > 1 ? "warning" : "error";
      case "Profit Factor":
        return value > 1.5 ? "success" : value > 1.0 ? "warning" : "error";
      case "Average Trade Return":
        return value > 0 ? "success" : value === 0 ? "warning" : "error";
      default:
        return "primary";
    }
  }

  useEffect(() => {
    invoke<strategy[]>("get_all_strategies").then((strategies) => {
      setStrategies(strategies);
      setStrategy(strategies[0].strategy);
    });
  }, []);

  function ceilToNext5Min(timestamp: number): number {
    const remainder = timestamp % 300;
    return remainder === 0 ? timestamp : timestamp + (300 - remainder);
  }
  useEffect(() => {
    if (!strategy) return;
    invoke<PortfolioDataForStrategy>("get_strategy_details", {
      strategy_name: strategy,
    })
      .then((data) => {
        const times: { [time: number]: number } = {};
        setPerformanceData(
          data.portfolio
            .map((time_step) => {
              const originalTimestamp = new Date(time_step[0]).getTime() / 1000;
              const roundedTimestamp = ceilToNext5Min(originalTimestamp);
              return {
                time: roundedTimestamp,
                value: time_step[1],
              };
            })
            .filter((data) => {
              if (times[data.time] !== undefined) {
                return false;
              }
              times[data.time] = 0.0;
              return true;
            })!,
        );
        console.log(data);
        setMetrics([
          {
            title: "CAGR",
            value: `${(data.metrics.cagr * 100).toFixed(3)}%`,
            variant: getMetricVariant("CAGR", data.metrics.cagr),
          },
          {
            title: "Win Rate",
            value: `${(data.metrics.win_rate * 100).toFixed(3)}%`,
            variant: getMetricVariant("Win Rate", data.metrics.win_rate),
          },
          {
            title: "Calmar Ratio",
            value: `${data.metrics.calmar_ratio.toFixed(4)}`,
            variant: getMetricVariant(
              "Calmar Ratio",
              data.metrics.calmar_ratio,
            ),
          },
          {
            title: "Max Drawdown",
            value: `${(data.metrics.max_drawdown * 100).toFixed(3)}%`,
            variant: getMetricVariant(
              "Max Drawdown",
              data.metrics.max_drawdown,
            ),
          },
          {
            title: "Sharpe Ratio",
            value: `${data.metrics.sharpe_ratio.toFixed(4)}`,
            variant: getMetricVariant(
              "Sharpe Ratio",
              data.metrics.sharpe_ratio,
            ),
          },
          {
            title: "Profit Factor",
            value: `${data.metrics.profit_factor === null ? "inf" : data.metrics.profit_factor.toFixed(4)}`,
            variant: getMetricVariant(
              "Profit Factor",
              data.metrics.profit_factor === null
                ? 5
                : data.metrics.profit_factor,
            ),
          },
          {
            title: "Average Trade Return",
            value: `${data.metrics.avg_trade_return < 0.0 ? "-$" : "$"}${Math.abs(data.metrics.avg_trade_return).toFixed(3)}`,
            variant: getMetricVariant(
              "Average Trade Return",
              data.metrics.avg_trade_return,
            ),
          },
        ]);
        setPositions(
          Object.keys(data.metrics.positions).map((key) => {
            const position = data.metrics.positions[key];
            return {
              stock: key,
              avg_price: position[0],
              quantity: position[1],
              recent_pnl: position[2],
            };
          }),
        );
      })
      .catch((err) => console.log(err));
  }, [strategy]);

  const [closeStrategyChoicesDialogOpen, setCloseStrategyChoicesDialogOpen] =
    useState(false);
  const handleStrategyChoicesDialogClose = () => {
    setCloseStrategyChoicesDialogOpen(false);
    setGracefulClose(false);
    setConfirmationModalOpen(false);
  };

  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);

  const [gracefulClose, setGracefulClose] = useState(false);
  const handlePauseGracefulButtonPressed = () => {
    setGracefulClose(true);
    setConfirmationModalOpen(true);
  };
  const handlePauseImmediatelyButtonPressed = () => {
    setGracefulClose(false);
    setConfirmationModalOpen(true);
  };

  const handleConfirmSubmit = () => {
    invoke<[number, string]>("pause_strategy", {
      strategy: strategy,
      graceful: gracefulClose,
    }).then(([status, msg]) => {
      if (status !== 200) {
        console.log(msg);
      }
    });
    setGracefulClose(false);
    setCloseStrategyChoicesDialogOpen(false);
    setConfirmationModalOpen(false);
  };

  return (
    <VBox padding={2}>
      <TitleBox>
        <Typography variant="h1">Strategy</Typography>
      </TitleBox>

      <Box sx={{ width: "100%" }}>
        <SelectField
          val={strategy}
          setVal={setStrategy}
          options={strategies.map((strat) => strat.strategy)}
        />
      </Box>

      {/* Chart Detailing Performance */}
      <Paper variant="normal">
        <Typography variant="h3">Performance</Typography>

        <HBox>
          <SelectField
            val={timestep}
            setVal={setTimestep}
            options={timesteps_arr}
          />
        </HBox>

        <Box sx={{ marginTop: 2 }}>
          <PerformanceChart data={performanceData} timestep={timestep} />
        </Box>
      </Paper>

      {/* Data for Key Metrics */}
      <GridBox
        sx={{
          mb: 2,
          mt: 2,
        }}
      >
        {metrics.map((metric, index) => (
          <MetricCard
            key={`${strategy}-${metric.title}-${index}`}
            title={metric.title}
            value={metric.value}
            variant={
              metric.variant as
                | "primary"
                | "secondary"
                | "warning"
                | "error"
                | "success"
            }
          />
        ))}
      </GridBox>

      {/* Positions Component displaying positions*/}
      <Paper elevation={0} variant="normal" sx={{ gap: 0 }}>
        <Typography variant="h3" sx={{ mb: 2 }}>
          Positions
        </Typography>

        {positions.length > 0 ? (
          positions.map((position, index) => (
            <Position
              key={`${strategy}-${position.stock}-${index}`}
              position={position}
              include_divider={index !== positions.length - 1}
            />
          ))
        ) : (
          <Typography variant="body1">No positions available</Typography>
        )}
      </Paper>

      {/* Close Strategy button fixed at bottom */}
      <Button
        fullWidth
        variant="outlined"
        color="error"
        onClick={() => setCloseStrategyChoicesDialogOpen(true)}
        startIcon={<CloseIcon />}
        sx={{
          py: 1,
          fontWeight: 500,
          textAlign: "left",
          // bgcolor: "error.main"
          boxShadow: 0,
        }}
      >
        Close Strategy
      </Button>

      <BottomSheetModal
        open={closeStrategyChoicesDialogOpen}
        onClose={handleStrategyChoicesDialogClose}
      >
        <ModalContent
          handlePauseGracefully={handlePauseGracefulButtonPressed}
          handlePauseImmediately={handlePauseImmediatelyButtonPressed}
        />
      </BottomSheetModal>

      <ConfirmationDialog
        openModal={confirmationModalOpen}
        handleCloseModal={() => setConfirmationModalOpen(false)}
        handleConfirmSubmit={handleConfirmSubmit}
      />
    </VBox>
  );
}
