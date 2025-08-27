import { Fragment } from "react";
import { useTheme, Typography, Box, Divider } from "@mui/material";
import { position } from "../strategy/strategy";

export default function Position({
  position,
  include_divider,
}: {
  position: position;
  include_divider: boolean;
}) {
  const theme = useTheme();
  return (
    <Fragment>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          py: 1.5,
        }}
      >
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          {position.stock}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ${position.avg_price.toFixed(2)}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {position.quantity.toFixed(0)}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color:
              position.recent_pnl > 0
                ? theme.palette.success.main
                : position.recent_pnl < 0
                  ? theme.palette.error.main
                  : theme.palette.text.disabled,
            fontWeight: 500,
          }}
        >
          {position.recent_pnl > 0
            ? `+${position.recent_pnl.toFixed(3)}`
            : position.recent_pnl.toFixed(3)}
        </Typography>
      </Box>
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
    </Fragment>
  );
}
