import { Fragment } from "react";
import { useTheme, Typography, Divider } from "@mui/material";
import { VBox } from "../theme";


export default function Notification({
  title,
  description,
  include_divider,
  onClick,
}: {
  title: string;
  description: string;
  include_divider: boolean;
  onClick: (() => void) | null;
}) {
  const theme = useTheme();

  return (
    <Fragment>
      <VBox
        onClick={onClick === null ? () => {} : onClick}
        sx={{
          gap: 1,
          textAlign: "left",
          justifyContent: "flex-start",
          cursor: onClick === null ? "initial" : "pointer",
          py: 1.5,
        }}
      >
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          {title}
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 500 }}>
          {description}
        </Typography>
      </VBox>
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
