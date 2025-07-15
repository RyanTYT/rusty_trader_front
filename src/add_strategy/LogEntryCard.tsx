import {
  Box,
  Typography,
  Paper,
  Chip,
  Collapse,
  IconButton,
} from "@mui/material";
import { useState } from "react";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { LogFileEntry } from "./types";
// import { getLogLevelColor } from "./logHelpers";

import { Theme } from "@mui/material/styles";

export function getLogLevelColor(level: string, theme?: Theme): string {
  switch (level.toUpperCase()) {
    case "ERROR":
      return theme?.palette.error.main || "#E53935";
    case "WARNING":
      return theme?.palette.warning.main || "#F9A825";
    case "INFO":
      return theme?.palette.primary.main || "#1976D2";
    case "DEBUG":
      return theme?.palette.grey[600] || "#757575";
    default:
      return theme?.palette.grey[400] || "#BDBDBD";
  }
}

export default function LogEntryCard({ entry }: { entry: LogFileEntry }) {
  const [expanded, setExpanded] = useState(false);
  const { asctime, levelname, name, module, funcName, lineno, message } = entry;

  return (
    <Paper
      variant="outlined"
      sx={{
        px: 2,
        py: 1.5,
        borderLeft: `5px solid ${getLogLevelColor(levelname)}`,
        bgcolor: expanded ? "grey.50" : "background.paper",
        transition: "background-color 0.2s",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Chip
            label={levelname}
            size="small"
            sx={{
              backgroundColor: getLogLevelColor(levelname),
              color: "white",
              fontWeight: 600,
              mr: 1,
            }}
          />
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            {asctime} <br />
            {name}: <br />
            {module}.{funcName}:{lineno}
          </Typography>
        </Box>
        <IconButton size="small" onClick={() => setExpanded(!expanded)}>
          <ExpandMoreIcon
            sx={{
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s",
            }}
          />
        </IconButton>
      </Box>

      <Collapse in={expanded}>
        <Typography
          variant="body2"
          sx={{
            mt: 1,
            fontFamily: "monospace",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {message}
        </Typography>
      </Collapse>
    </Paper>
  );
}
