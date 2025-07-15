import {
  Box,
  Typography,
  IconButton,
  Paper,
  Select,
  MenuItem,
  TextField,
  Button,
  Divider,
  Slide,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useState, useRef, useCallback } from "react";
import LogEntryCard from "./LogEntryCard";
import { LogFileEntry, LogFilter } from "./types";
import { invoke } from "@tauri-apps/api/core";
import { VBox } from "../theme";
import { platform } from "@tauri-apps/plugin-os";

// const logEntries: LogFileEntry[] = [
//   // Example 1: An INFO level log entry
//   [
//     "2025-07-14 09:00:01,123", // asctime
//     "INFO", // levelname
//     "my_app.data_processor", // name
//     "data_processor", // module
//     "process_data", // funcName
//     "45", // lineno
//     "Data batch 'A1B2C3D4' processed successfully.", // message
//   ],
//   // Example 2: A WARNING level log entry
//   [
//     "2025-07-14 09:00:05,456", // asctime
//     "WARNING", // levelname
//     "my_app.auth_service", // name
//     "auth_service", // module
//     "verify_token", // funcName
//     "120", // lineno
//     "Invalid authentication token received from IP: 192.168.1.100.", // message
//   ],
//   // Example 3: An ERROR level log entry
//   [
//     "2025-07-14 09:00:10,789", // asctime
//     "ERROR", // levelname
//     "get_stocks", // name
//     "db_connector", // module
//     "connect_to_db", // funcName
//     "88", // lineno
//     "Failed to connect to primary database. Retrying with replica.", // message
//   ],
//   // Example 4: A DEBUG level log entry
//   [
//     "2025-07-14 09:00:12,010", // asctime
//     "DEBUG", // levelname
//     "ibasyncbroker", // name
//     "api_handler", // module
//     "handle_request", // funcName
//     "205", // lineno
//     "Incoming request: GET /api/v1/status with params: { 'user_id': 'USR123' }", // message
//   ],
// ];

export default function LogViewerDrawer({
  open,
  onClose,
  file,
}: {
  open: boolean;
  onClose: () => void;
  file: string;
}) {
  const [entries, setEntries] = useState<LogFileEntry[]>([]);
  const [filter, setFilter] = useState<LogFilter>({
    level: null,
    name: null,
    exclude_name: null,
    limit: 50,
    start: 0,
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const platformName = platform();

  const loadEntries = useCallback(
    async (reset = false) => {
      setLoadingMore(true);
      console.log(filter);
      if (filter.name === "") {
        filter.name = null;
      }
      if (filter.exclude_name === "") {
        filter.exclude_name = null;
      }
      const newEntries: LogFileEntry[] = await invoke("get_log", {
        filter: { ...filter, start: reset ? 0 : filter.start },
        filename: file,
      })
        .then((a) => a as LogFileEntry[])
        .catch((_) => [] as LogFileEntry[]);
      // const newEntries = logEntries;
      console.log(newEntries);
      setEntries((prev) => (reset ? newEntries : [...prev, ...newEntries]));
      // setEntries(logEntries);
      // setFilter((prev) => ({
      //   ...prev,
      //   start: (prev.start || 0) + newEntries.length,
      // }));
      filter.start = (filter.start || 0) + newEntries.length;
      setLoadingMore(false);
    },
    [filter, file],
  );

  useEffect(() => {
    console.log(open);
    if (open) loadEntries(true);
    else setEntries([]);
  }, [open, loadEntries]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const bottom =
      e.currentTarget.scrollHeight - e.currentTarget.scrollTop ===
      e.currentTarget.clientHeight;
    if (bottom && !loadingMore) loadEntries();
  };

  const applyFilter = () => {
    setFilter((prev) => ({ ...prev, start: 0 }));
    loadEntries(true);
  };

  return (
    <Slide direction="left" in={open} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: ["android", "ios"].includes(platformName)
            ? "100%"
            : "calc(100% - 64px)",
          maxWidth: 600,
          height: ["android", "ios"].includes(platformName)
            ? "calc(100% - 48px)"
            : "100%",
          bgcolor: "background.default",
          zIndex: 1300,
          p: 2,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Typography variant="h1" sx={{ flexGrow: 1 }}>
            {file}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Paper variant="normal" sx={{ mb: 2 }}>
          <VBox sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Select
              value={filter.level || ""}
              onChange={(e) =>
                setFilter({ ...filter, level: e.target.value || null })
              }
              displayEmpty
              size="small"
              sx={{ minWidth: 120 }}
            >
              <MenuItem value="">All Levels</MenuItem>
              {["DEBUG", "INFO", "WARNING", "ERROR"].map((lvl) => (
                <MenuItem key={lvl} value={lvl}>
                  {lvl}
                </MenuItem>
              ))}
            </Select>
            <TextField
              label="Name"
              value={filter.name || ""}
              onChange={(e) =>
                setFilter({ ...filter, name: e.target.value || null })
              }
              size="small"
            />
            <TextField
              label="Exclude"
              value={filter.exclude_name || ""}
              onChange={(e) =>
                setFilter({ ...filter, exclude_name: e.target.value || null })
              }
              size="small"
            />
            <Button variant="outlined" onClick={applyFilter}>
              Apply
            </Button>
          </VBox>
        </Paper>

        <Divider />

        <Box
          ref={containerRef}
          onScroll={handleScroll}
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            mt: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {entries.map((entry, i) => (
            <LogEntryCard key={i} entry={entry} />
          ))}
          {loadingMore && (
            <Typography variant="body2" sx={{ textAlign: "center", py: 2 }}>
              Loading more...
            </Typography>
          )}
        </Box>
      </Box>
    </Slide>
  );
}
