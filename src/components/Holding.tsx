import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import { Box, Divider, Typography } from "@mui/material";
import { useTheme } from "@mui/material";
import { HBox } from "../theme";
import { StrategyHolding } from "../portfolio/portfolio";

export default function Holding({
  holding,
  include_divider,
}: {
  holding: StrategyHolding;
  include_divider: boolean;
}) {
  const theme = useTheme();
  const change =
    (holding.capital - holding.initial_capital) / holding.initial_capital;
  return (
    <Box>
      <HBox sx={{ py: 1.5, justifyContent: "space-between" }}>
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 500 }}>
            {holding.strategy}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {(holding.allocation * 100).toFixed(3)}% of portfolio
          </Typography>
        </Box>

        <Box sx={{ textAlign: "right" }}>
          <Typography variant="body1">
            $
            {holding.capital.toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color:
                change > 0
                  ? theme.palette.success.main
                  : theme.palette.error.main,
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            {change > 0 ? (
              <TrendingUpIcon sx={{ fontSize: 14, mr: 0.5 }} />
            ) : (
              <TrendingDownIcon sx={{ fontSize: 14, mr: 0.5 }} />
            )}
            {change > 0 ? "+" : ""}
            {change.toFixed(5)}%
          </Typography>
        </Box>
      </HBox>
      {include_divider && (
        <Divider
          sx={{
            my: 0.5,
            borderColor:
              theme.palette.mode === "light"
                ? "rgba(0, 0, 0, 0.08)"
                : "rgba(255, 255, 255, 0.12)",
          }}
        />
      )}
    </Box>
  );
}
