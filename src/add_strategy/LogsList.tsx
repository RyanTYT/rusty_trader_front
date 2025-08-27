import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItemButton,
  Divider,
  CircularProgress,
} from "@mui/material";
import LogViewerDrawer from "./LogViewerDrawer";
import { invoke } from "@tauri-apps/api/core";
import { TitleBox, VBox } from "../theme";

export default function LogList() {
  const [logFiles, setLogFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    invoke<string[]>("get_log_files")
      .then(setLogFiles)
      .catch(console.error)
      .finally(() => setLoading(false));
    // setLogFiles(["ah.log", "123.log"]);
    // setLoading(false);
  }, []);

  return (
    <VBox sx={{ p: 2 }}>
      <TitleBox sx={{ mb: 1 }}>
        <Typography variant="h1">Log Files</Typography>
      </TitleBox>
      <Paper variant="normal">
        {loading ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <CircularProgress />
          </Box>
        ) : logFiles.length === 0 ? (
          <Box
            sx={{
              py: 4,
              textAlign: "center",
              alignItems: "center",
              color: "text.secondary",
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
              No log files found.
            </Typography>
            <Typography variant="caption">
              Your app hasn't written any logs yet.
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {logFiles.map((file, i) => (
              <Box key={file}>
                <ListItemButton
                  onClick={() => {
                    setSelectedFile(file);
                    setDrawerOpen(true);
                  }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {file}
                  </Typography>
                </ListItemButton>
                {i !== logFiles.length - 1 && <Divider />}
              </Box>
            ))}
          </List>
        )}
      </Paper>

      {selectedFile && (
        <LogViewerDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          file={selectedFile}
        />
      )}
    </VBox>
  );
}
