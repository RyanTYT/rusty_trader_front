import { useTheme, Paper, Typography, Box } from "@mui/material";

// Alpha function for transparency
function alpha(color: string, value: number): string {
  return (
    color +
    Math.round(value * 255)
      .toString(16)
      .padStart(2, "0")
  );
}

// Improved KPI Card Component
export default function MetricCard({
  title,
  value,
  variant,
}: {
  title: string;
  value: string;
  variant: "primary" | "secondary" | "success" | "error" | "warning";
}) {
  const theme = useTheme();

  // Get colors based on variant
  const getColors = () => {
    const colors = {
      primary: {
        // bg: theme.palette.primary.light,
        bg: alpha(theme.palette.primary.main, 0.08),
        text: theme.palette.primary.dark,
        border: theme.palette.primary.main,
      },
      secondary: {
        // bg: theme.palette.secondary.light,
        bg: alpha(theme.palette.primary.main, 0.08),
        text: theme.palette.secondary.dark,
        border: theme.palette.secondary.main,
      },
      success: {
        bg: alpha(theme.palette.success.main, 0.1),
        // bg: alpha(theme.palette.primary.main, 0.08),
        text: theme.palette.success.dark,
        border: theme.palette.success.main,
      },
      error: {
        bg: alpha(theme.palette.error.main, 0.1),
        // bg: alpha(theme.palette.primary.main, 0.08),
        text: theme.palette.error.dark,
        border: theme.palette.error.main,
      },
      warning: {
        bg: alpha(theme.palette.warning.main, 0.1),
        // bg: alpha(theme.palette.primary.main, 0.08),
        text: theme.palette.warning.dark,
        border: theme.palette.warning.main,
      },
    };

    return colors[variant];
  };

  const colors = getColors();

  return (
    <Paper
      elevation={0}
      sx={{
        display: "flex",
        alignItems: "center",
        p: 1.5,
        border: `1px solid ${colors.border}`,
        bgcolor: colors.bg,
        color: colors.text,
        // boxShadow: theme.shadows[1],
        width: "100%",
      }}
    >
      <Box>
        <Typography variant="h3" sx={{ fontWeight: 700 }}>
          {value}
        </Typography>
        <Typography
          variant="caption"
          sx={{ textTransform: "uppercase", fontWeight: 500 }}
        >
          {title}
        </Typography>
      </Box>
    </Paper>
  );
}
