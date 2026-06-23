// src/settings/settings.tsx
// CHANGE: import AISettings and render it before the Account Actions paper.
// Everything else is identical to the original file.

import { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  Button,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  Snackbar,
  Alert,
  AlertColor,
} from "@mui/material";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import RefreshIcon from "@mui/icons-material/Refresh";
import LogoutIcon from "@mui/icons-material/Logout";
import { TitleBox, VBox } from "../theme";
import BottomSheetModal from "../components/MobilePopupModal";
import { invoke } from "@tauri-apps/api/core";
import AISettings from "./AISettings"; // ADD
import { listen } from "@tauri-apps/api/event";

export default function SettingsPage() {
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [confirmationPageOpen, setConfirmationPageOpen] = useState(false);
  const [isPauseGracefully, setIsPauseGracefully] = useState(true);
  const [websocketConnectionStatus, setWebsocketConnectionStatus] =
    useState("info");
  const [toast, setToast] = useState({
    open: false,
    severity: "error",
    message: "",
  });

  useEffect(() => {
    const getStatus = async () => {
      try {
        const health = await invoke("check_ws_health");
        setWebsocketConnectionStatus(health as string);
      } catch {
        setWebsocketConnectionStatus("error");
      }
    };

    getStatus();
    listen("ws-status", (ws_event_payload) => {
      const [ws_event, _] = ws_event_payload.payload as [number, string];
      if (ws_event === 200) {
        setWebsocketConnectionStatus("success");
      } else {
        setWebsocketConnectionStatus("error");
      }
    });
  }, [toast]);

  const handlePauseGracefully = () => {
    setConfirmationPageOpen(true);
    setIsPauseGracefully(true);
  };
  const handlePauseImmediately = () => {
    setConfirmationPageOpen(true);
    setIsPauseGracefully(false);
  };

  const handlePauseAccount = () => {
    setPauseDialogOpen(false);
    invoke<[number, string]>("pause_strategy", {
      graceful: isPauseGracefully,
    }).then(([status, msg]) => {
      if (status !== 200) console.log(msg);
    });
  };

  const handleCancelDialog = () => {
    setConfirmationPageOpen(false);
    setIsPauseGracefully(true);
    setPauseDialogOpen(false);
  };

  const handleRefreshWs = async () => {
    let should_refresh = false;
    try {
      const health = await invoke("check_ws_health");
      if (health === "error") {
        should_refresh = true;
      }
      setWebsocketConnectionStatus(health as string);
    } catch {
      should_refresh = true;
      setWebsocketConnectionStatus("error");
    }

    if (!should_refresh) {
      setToast({
        open: true,
        severity: "success",
        message: "Already Connected",
      });
      return;
    }

    await invoke("refresh_ws")
      .then(() => {
        setToast({
          open: true,
          severity: "info",
          message: "Trying to reconnect...",
        });
        listen("ws-status", (ws_event_payload) => {
          const payload = ws_event_payload.payload as [number, string];
          if (payload[0] === 200) {
            setToast({
              open: true,
              severity: "success",
              message: "Successfully Reconnected",
            });
          } else {
            const err = payload[1];
            setToast({
              open: true,
              severity: "error",
              message: `Encountered Error trying to reconnect with Server: ${err}`,
            });
          }
        });
      })
      .catch((err) => {
        setToast({
          open: true,
          severity: "error",
          message: `Encountered Error trying to get tauri backend to reconnect: ${err}`,
        });
      });
  };

  const ModalContent = ({
    confirmationPageOpen,
  }: {
    confirmationPageOpen: boolean;
  }) =>
    confirmationPageOpen ? (
      <>
        <DialogTitle>Pause Your Account?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Pausing your account will temporarily halt all trading activities
            and strategies. Your existing positions will remain intact but no
            new trades will be executed. You can reactivate your account at any
            time.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            id="confirmation"
            label="Type 'pause' to confirm"
            fullWidth
            variant="outlined"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handlePauseAccount} color="error">
            Pause Account
          </Button>
        </DialogActions>
      </>
    ) : (
      <>
        <DialogTitle>How do you want to pause your account?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ whiteSpace: "pre-line" }}>
            {`Pause Gracefully: Strategies will still be in play until positions are 0, after which they will stop\n\nPause Immediately: Immediately close all positions using market orders`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <VBox>
            <Button
              fullWidth
              variant="outlined"
              color="warning"
              onClick={handlePauseGracefully}
              sx={{ py: 1, fontWeight: 500, boxShadow: 0 }}
            >
              Pause Gracefully
            </Button>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              onClick={handlePauseImmediately}
              sx={{ py: 1, fontWeight: 500, boxShadow: 0 }}
            >
              Pause Immediately
            </Button>
          </VBox>
        </DialogActions>
      </>
    );

  return (
    <VBox sx={{ p: 2, mx: "auto" }}>
      <TitleBox sx={{ mb: 1 }}>
        <Typography variant="h1">Settings</Typography>
      </TitleBox>

      {/* ADD: AI / News Ideas settings */}
      <AISettings />

      {/* Account Actions — unchanged */}
      <Paper elevation={0} variant="normal">
        <VBox sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Button
            variant="text"
            color={websocketConnectionStatus as AlertColor}
            startIcon={<></>}
            sx={{ py: 1.5, boxShadow: 0 }}
          >
            Websocket Connection Status:{" "}
            {websocketConnectionStatus === "info"
              ? "Fetching"
              : websocketConnectionStatus === "success"
                ? "Connected"
                : "Disconnected"}
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<RefreshIcon />}
            onClick={handleRefreshWs}
            sx={{ py: 1.5, boxShadow: 0 }}
          >
            Refresh Websocket Connection
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<PauseCircleOutlineIcon />}
            onClick={() => setPauseDialogOpen(true)}
            sx={{ py: 1.5, boxShadow: 0 }}
          >
            Pause Account
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<LogoutIcon />}
            sx={{ py: 1.5, boxShadow: 0 }}
          >
            Log Out
          </Button>
        </VBox>
      </Paper>

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity as AlertColor}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>

      <BottomSheetModal open={pauseDialogOpen} onClose={handleCancelDialog}>
        <ModalContent confirmationPageOpen={confirmationPageOpen} />
      </BottomSheetModal>
    </VBox>
  );
}
