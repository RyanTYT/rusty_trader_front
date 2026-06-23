import { Fragment } from "react";
import { useTheme, Typography, Divider } from "@mui/material";
import { VBox } from "../theme";

export default function Notification({
  title,
  description,
  fn_name,
  include_divider,
  is_read, // Added prop
  onClick,
}: {
  title: string;
  description: string;
  fn_name: string;
  include_divider: boolean;
  is_read: boolean; // Added type
  onClick: (() => void) | null;
}) {
  const theme = useTheme();

  // Define the text color based on the read status
  const textColor = is_read
    ? theme.palette.text.secondary
    : theme.palette.text.primary;

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
          // Optional: slightly dim the entire container if read
          opacity: is_read ? 0.7 : 1,
          transition: "opacity 0.2s ease",
        }}
      >
        <VBox sx={{ gap: 0.5 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: is_read ? 400 : 600, // Make unread bolder
              color: textColor,
            }}
          >
            {title}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              fontWeight: 500,
              color: is_read
                ? theme.palette.text.disabled
                : theme.palette.text.secondary,
            }}
          >
            Function Name: {fn_name}
          </Typography>
        </VBox>
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 500,
            color: textColor,
          }}
        >
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
