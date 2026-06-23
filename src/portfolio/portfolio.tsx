import { useState, useEffect } from "react";
import { Paper, Typography, Box, Button } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
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
import { metric, strategy, strategy_val } from "../strategy/strategy";
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

const Mapper = {
  "1 week": 7 * 24 * 60 * 60,
  "1 month": 30 * 24 * 60 * 60,
  "No cutoff": 10000 * 24 * 60 * 60,
};

export default function PortfolioDashboard() {
  const [timesteps_arr] = useState(["5 min", "30 min", "1 day", "1 week"]);
  const [timestep, setTimestep] = useState("5 min");
  const [cutoffOptions] = useState(["1 week", "1 month", "No cutoff"]);
  const [cutoff, setCutoff] = useState("1 month" as keyof typeof Mapper);
  const [assets_group_by, set_assets_group_by] = useState("By Strategy");
  const assets_group_by_options = ["By Stock", "By Strategy"];
  const [strategies, setStrategies] = useState([] as strategy_val[]);
  const [performanceData, setPerformanceData] = useState(
    [] as { time: number; value: number }[],
  );
  const [portfolioMetrics, _] = useState([] as metric[]);
  const [topHoldings, setTopHoldings] = useState([] as StrategyHolding[]);

  function ceilToNext5Min(timestamp: number): number {
    const remainder = timestamp % 300;
    return remainder === 0 ? timestamp : timestamp + (300 - remainder);
  }
  const refresh_portfolio_data_over_time = () => {
    const cutoff_sec = Mapper[cutoff];
    invoke<PortfolioData>("get_portfolio_details", {
      cutoff: cutoff_sec,
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
      .catch(([status, msg]) => {
        console.error(
          `Failed to get portfolio details via get_portfolio_details: (${status}) ${msg}`,
        );
      });
  };

  useEffect(() => {
    invoke<strategy[]>("get_all_strategies")
      .then(async (strategies) => {
        const populated_strats = await Promise.all(
          strategies.map(async (strategy) => {
            let value = await invoke<{ sgd_value: number }>(
              "get_strategy_capital",
              { strategy: strategy.strategy },
            );
            return {
              strategy: strategy.strategy,
              status: strategy.status,
              sgd_value: value.sgd_value,
            };
          }),
        ).then((strats) => strats.filter((strat) => strat.sgd_value > 0.0));
        setStrategies(populated_strats);
      })
      .catch(([status, msg]) => {
        console.error(
          `Failed to get strategy details via get_all_strategies: (${status}) ${msg}`,
        );
      });
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
          <Typography variant="h3">
            $
            {strategies
              .reduce((value, strat) => value + strat.sgd_value, 0)
              .toLocaleString()}{" "}
          </Typography>
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
          sx={{
            height: 500,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            p: 0.5,
            flexDirection: "column",
          }}
        >
          <PortfolioPieChart
            data={
              assets_group_by === "By Strategy"
                ? strategies
                    .filter((strat) => strat.status !== "inactive")
                    .map((strat, index) => {
                      return {
                        name: strat.strategy,
                        value: strat.sgd_value,
                        percentage: parseFloat(
                          (
                            (strat.sgd_value /
                              strategies
                                .filter((strat) => strat.status !== "inactive")
                                .map((strat) => strat.sgd_value)
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
          <VBox>
            <Typography variant="caption">Timestep</Typography>
            <SelectField
              val={timestep}
              setVal={setTimestep}
              options={timesteps_arr}
            />
          </VBox>

          <VBox>
            <Typography variant="caption">Cutoff</Typography>
            <SelectField
              val={cutoff}
              setVal={(val) => setCutoff(val as keyof typeof Mapper)}
              options={cutoffOptions}
            />
          </VBox>
        </HBox>

        <Box sx={{ height: "fitContent", marginTop: 2 }}>
          {performanceData.length === 0 ? (
            <VBox
              sx={{
                alignItems: "center",
                justifyContent: "center",
                gap: 2,
                py: 6,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No performance data available
              </Typography>

              <Button
                variant="outlined"
                onClick={refresh_portfolio_data_over_time}
              >
                <RefreshIcon />
                Refresh
              </Button>
            </VBox>
          ) : (
            <PerformanceChart data={performanceData} timestep={timestep} />
          )}
        </Box>
      </Paper>

      {/* Top Holdings */}
      {performanceData ? (
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
      ) : (
        <></>
      )}
    </VBox>
  );
}
