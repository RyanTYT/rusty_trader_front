import { useState, useEffect } from "react";
import { Paper, Typography, Box } from "@mui/material";
// import PieChartIcon from "@mui/icons-material/PieChart";
// import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
// import ShowChartIcon from "@mui/icons-material/ShowChart";
// import TrendingUpIcon from "@mui/icons-material/TrendingUp";
// import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import SelectField from "../components/Select";
import MetricCard from "../components/MetricCard";
import Holding from "../components/Holding";
import PerformanceChart from "../components/PerformanceChart";
import PortfolioPieChart from "../components/PieChart";
import { GridBox, HBox, TitleBox, VBox } from "../theme";
import { invoke } from "@tauri-apps/api/core";
import { metric, strategy } from "../strategy/strategy";
import { PortfolioDataForStrategy } from "../strategy/strategy";

type PortfolioData = {
  strategies: PortfolioDataForStrategy[];
  portfolio: [string, number][];
};

export type StrategyHolding = {
  strategy: string;
  allocation: number;
  initial_capital: number;
  capital: number;
};

export default function PortfolioDashboard() {
  const [timestep, setTimeStep] = useState("5 min");
  const [assets_group_by, set_assets_group_by] = useState("By Strategy");
  const assets_group_by_options = ["By Stock", "By Strategy"];
  const [timeframes_arr] = useState(["5 min", "30 min", "1 day", "1 week"]);
  const [strategies, setStrategies] = useState([] as strategy[]);
  const [performanceData, setPerformanceData] = useState(
    [] as { time: number; value: number }[],
  );
  const [portfolioMetrics, _] = useState([] as metric[]);
  const [topHoldings, setTopHoldings] = useState([] as StrategyHolding[]);

  function ceilToNext5Min(timestamp: number): number {
    const remainder = timestamp % 300;
    return remainder === 0 ? timestamp : timestamp + (300 - remainder);
  }
  useEffect(() => {
    invoke<strategy[]>("get_all_strategies").then((strategies) => {
      setStrategies(strategies);
    });
    invoke<PortfolioData>("get_portfolio_details")
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
        setTopHoldings(
          data.strategies.map((strat) => {
            return {
              strategy: strat.strategy,
              allocation:
                strat.portfolio[strat.portfolio.length - 1][1] /
                data.portfolio[data.portfolio.length - 1][1],
              initial_capital: strat.portfolio[0][1],
              capital: strat.portfolio[strat.portfolio.length - 1][1],
            };
          }),
        );
      })
      .catch((err) => console.log(err));
  }, []);

  return (
    <VBox
      sx={{
        p: 2,
        mx: "auto",
      }}
    >
      <TitleBox>
        <Typography variant="h1">Portfolio</Typography>
      </TitleBox>

      {/* Portfolio Allocation Pie Chart */}
      <Paper variant="normal">
        <TitleBox sx={{ mb: 2 }}>
          <Typography variant="h3">Asset Allocation</Typography>
        </TitleBox>
        <HBox>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Group allocation by:
          </Typography>
          <SelectField
            val={assets_group_by}
            setVal={set_assets_group_by}
            options={assets_group_by_options}
          />
        </HBox>

        <Box
          sx={{ height: 400, display: "flex", justifyContent: "center", p: 2 }}
        >
          <PortfolioPieChart
            data={
              assets_group_by === "By Strategy"
                ? strategies
                    .filter((strat) => strat.status !== "inactive")
                    .map((strat, index) => {
                      return {
                        name: strat.strategy,
                        value: parseFloat(
                          (
                            (strat.capital /
                              strategies
                                .filter((strat) => strat.status !== "inactive")
                                .map((strat) => strat.capital)
                                .reduce((l, r) => l + r)) *
                            100
                          ).toFixed(3),
                        ),
                        color: [
                          "#1976D2",
                          "#388E3C",
                          "#F9A825",
                          "E53935",
                          "#9C27B0",
                        ][index % 5],
                      };
                    })
                : assets_group_by === "By Stock"
                  ? []
                  : []
            }
          />
        </Box>
      </Paper>

      {/* Portfolio KPIs */}
      <GridBox
        sx={{
          mb: 2,
          mt: 2,
        }}
      >
        {portfolioMetrics.map((metric, index) => (
          <MetricCard
            key={index}
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

      {/* Performance Chart */}
      <Paper variant="normal">
        <TitleBox sx={{ mb: 2 }}>
          <Typography variant="h3">Performance</Typography>
        </TitleBox>

        <HBox>
          <SelectField
            val={timestep}
            setVal={setTimeStep}
            options={timeframes_arr}
          />
        </HBox>

        <Box sx={{ height: "fitContent", marginTop: 2 }}>
          <PerformanceChart data={performanceData} timestep={timestep} />
        </Box>
      </Paper>

      {/* Top Holdings */}
      <Paper elevation={0} variant="normal" sx={{ gap: 0 }}>
        <TitleBox sx={{ mb: 2 }}>
          <Typography variant="h3">Top Holdings</Typography>
          {
            // <Button
            //   variant="text"
            //   color="primary"
            //   startIcon={<AddCircleOutlineIcon />}
            //   sx={{ fontWeight: 500, boxShadow: "none" }}
            // >
            //   Add Position
            // </Button>
          }
        </TitleBox>

        {topHoldings.map((holding, index) => (
          <Holding
            key={holding.strategy}
            holding={holding}
            include_divider={index !== topHoldings.length - 1}
          />
        ))}

        {
          // <Button fullWidth variant="text" color="primary" sx={{ mt: 2 }}>
          //   View All Holdings
          // </Button>
        }
      </Paper>
    </VBox>
  );
}
