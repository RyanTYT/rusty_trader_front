import { useState } from "react";
import {
  // useTheme,
  Paper,
  Typography,
  // Box,
  Button,
  // Divider,
  // Switch,
  // FormControlLabel,
  // MenuItem,
  // Select,
  // FormControl,
  // InputLabel,
  // Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  // IconButton,
} from "@mui/material";
// import NotificationsIcon from "@mui/icons-material/Notifications";
// import SecurityIcon from "@mui/icons-material/Security";
// import AccountCircleIcon from "@mui/icons-material/AccountCircle";
// import DisplaySettingsIcon from "@mui/icons-material/DisplaySettings";
// import PaymentIcon from "@mui/icons-material/Payment";
// import HelpIcon from "@mui/icons-material/Help";
import PauseCircleOutlineIcon from "@mui/icons-material/PauseCircleOutline";
import LogoutIcon from "@mui/icons-material/Logout";
// import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { TitleBox, VBox } from "../theme";
import BottomSheetModal from "../components/MobilePopupModal";
import { invoke } from "@tauri-apps/api/core";

export default function SettingsPage() {
  // const theme = useTheme();
  // const [darkMode, setDarkMode] = useState(false);
  // const [emailNotifications, setEmailNotifications] = useState(true);
  // const [pushNotifications, setPushNotifications] = useState(true);
  // const [currency, setCurrency] = useState("USD");
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [confirmationPageOpen, setConfirmationPageOpen] = useState(false);
  const [isPauseGracefully, setIsPauseGracefully] = useState(true);

  const handlePauseGracefully = () => {
    setConfirmationPageOpen(true);
    setIsPauseGracefully(true);
  };
  const handlePauseImmediately = () => {
    setConfirmationPageOpen(true);
    setIsPauseGracefully(false);
  };

  // Handle pause account confirmation
  const handlePauseAccount = () => {
    // Implement account pause logic
    setPauseDialogOpen(false);
    // Show confirmation or redirect
    invoke<[number, string]>("pause_strategy", {
      graceful: isPauseGracefully,
    }).then(([status, msg]) => {
      if (status !== 200) {
        console.log(msg);
      }
    });
  };

  const handleCancelDialog = () => {
    setConfirmationPageOpen(false);
    setIsPauseGracefully(true);
    setPauseDialogOpen(false);
  };

  const ModalContent = ({
    confirmationPageOpen,
  }: {
    confirmationPageOpen: boolean;
  }) => {
    return confirmationPageOpen ? (
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
          <DialogContentText sx={{ whiteSpace: 'pre-line' }}>
            {`Pause Gracefully: Strategies will still be in play until positions are 0, after which they will stop  

            Pause Immediately: Immediately close all positions using market orders`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <VBox>
            <Button
              fullWidth
              variant="outlined"
              color="warning"
              onClick={handlePauseGracefully}
              startIcon={null}
              sx={{
                py: 1,
                fontWeight: 500,
                textAlign: "left",
                // bgcolor: "error.main"
                boxShadow: 0,
              }}
            >
              Pause Gracefully
            </Button>

            <Button
              fullWidth
              variant="outlined"
              color="error"
              onClick={handlePauseImmediately}
              startIcon={null}
              sx={{
                py: 1,
                fontWeight: 500,
                textAlign: "left",
                // bgcolor: "error.main"
                boxShadow: 0,
              }}
            >
              Pause Immediately
            </Button>
          </VBox>
        </DialogActions>
      </>
    );
  };

  return (
    <VBox
      sx={{
        p: 2,
        mx: "auto",
      }}
    >
      <TitleBox sx={{ mb: 1 }}>
        <Typography variant="h1">Settings</Typography>
      </TitleBox>

      {
        // {/* Account Settings */}
        // <Paper
        //   elevation={0}
        //   sx={{
        //     bgcolor: theme.palette.background.paper,
        //     p: 2,
        //     borderRadius: "12px",
        //   }}
        // >
        //   <Box sx={{
        //     display: "flex",
        //     alignItems: "center",
        //     mb: 2
        //   }}>
        //     <AccountCircleIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
        //     <Typography variant="h3">Account Settings</Typography>
        //   </Box>
        //
        //   <Box sx={{ px: 1 }}>
        //     <Button
        //       fullWidth
        //       variant="text"
        //       color="primary"
        //       sx={{ justifyContent: "flex-start", py: 1.5 }}
        //     >
        //       Personal Information
        //     </Button>
        //     <Divider />
        //
        //     <Button
        //       fullWidth
        //       variant="text"
        //       color="primary"
        //       sx={{ justifyContent: "flex-start", py: 1.5 }}
        //     >
        //       Change Email
        //     </Button>
        //     <Divider />
        //
        //     <Button
        //       fullWidth
        //       variant="text"
        //       color="primary"
        //       sx={{ justifyContent: "flex-start", py: 1.5 }}
        //     >
        //       Change Password
        //     </Button>
        //   </Box>
        // </Paper>
        //
        // {/* Notification Settings */}
        // <Paper
        //   elevation={0}
        //   sx={{
        //     bgcolor: theme.palette.background.paper,
        //     p: 2,
        //     borderRadius: "12px",
        //   }}
        // >
        //   <Box sx={{
        //     display: "flex",
        //     alignItems: "center",
        //     mb: 2
        //   }}>
        //     <NotificationsIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
        //     <Typography variant="h3">Notifications</Typography>
        //   </Box>
        //
        //   <Box sx={{ px: 1 }}>
        //     <FormControlLabel
        //       control={
        //         <Switch
        //           checked={pushNotifications}
        //           onChange={(e) => setPushNotifications(e.target.checked)}
        //           color="primary"
        //         />
        //       }
        //       label="Push Notifications"
        //       sx={{ width: "100%", mb: 1 }}
        //     />
        //
        //     <FormControlLabel
        //       control={
        //         <Switch
        //           checked={emailNotifications}
        //           onChange={(e) => setEmailNotifications(e.target.checked)}
        //           color="primary"
        //         />
        //       }
        //       label="Email Notifications"
        //       sx={{ width: "100%", mb: 1 }}
        //     />
        //
        //     <Button
        //       fullWidth
        //       variant="text"
        //       color="primary"
        //       sx={{ justifyContent: "flex-start", py: 1.5 }}
        //     >
        //       Notification Preferences
        //     </Button>
        //   </Box>
        // </Paper>
        //
        // {/* Security Settings */}
        // <Paper
        //   elevation={0}
        //   sx={{
        //     bgcolor: theme.palette.background.paper,
        //     p: 2,
        //     borderRadius: "12px",
        //   }}
        // >
        //   <Box sx={{
        //     display: "flex",
        //     alignItems: "center",
        //     mb: 2
        //   }}>
        //     <SecurityIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
        //     <Typography variant="h3">Security</Typography>
        //   </Box>
        //
        //   <Box sx={{ px: 1 }}>
        //     <Button
        //       fullWidth
        //       variant="text"
        //       color="primary"
        //       sx={{ justifyContent: "flex-start", py: 1.5 }}
        //     >
        //       Two-Factor Authentication
        //     </Button>
        //     <Divider />
        //
        //     <Button
        //       fullWidth
        //       variant="text"
        //       color="primary"
        //       sx={{ justifyContent: "flex-start", py: 1.5 }}
        //     >
        //       Login History
        //     </Button>
        //     <Divider />
        //
        //     <Button
        //       fullWidth
        //       variant="text"
        //       color="primary"
        //       sx={{ justifyContent: "flex-start", py: 1.5 }}
        //     >
        //       Authorized Devices
        //     </Button>
        //   </Box>
        // </Paper>
        //
        // {/* Preferences */}
        // <Paper
        //   elevation={0}
        //   sx={{
        //     bgcolor: theme.palette.background.paper,
        //     p: 2,
        //     borderRadius: "12px",
        //   }}
        // >
        //   <Box sx={{
        //     display: "flex",
        //     alignItems: "center",
        //     mb: 2
        //   }}>
        //     <DisplaySettingsIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
        //     <Typography variant="h3">Preferences</Typography>
        //   </Box>
        //
        //   <Box sx={{ px: 1, mb: 2 }}>
        //     <FormControlLabel
        //       control={
        //         <Switch
        //           checked={darkMode}
        //           onChange={(e) => setDarkMode(e.target.checked)}
        //           color="primary"
        //         />
        //       }
        //       label="Dark Mode"
        //       sx={{ width: "100%", mb: 2 }}
        //     />
        //
        //     <FormControl fullWidth sx={{ mb: 2 }}>
        //       <InputLabel id="currency-select-label">Currency</InputLabel>
        //       <Select
        //         labelId="currency-select-label"
        //         id="currency-select"
        //         value={currency}
        //         label="Currency"
        //         onChange={(e) => setCurrency(e.target.value)}
        //       >
        //         <MenuItem value="USD">USD ($)</MenuItem>
        //         <MenuItem value="EUR">EUR (€)</MenuItem>
        //         <MenuItem value="GBP">GBP (£)</MenuItem>
        //         <MenuItem value="JPY">JPY (¥)</MenuItem>
        //       </Select>
        //     </FormControl>
        //   </Box>
        // </Paper>
        //
        // {/* Payment Methods */}
        // <Paper
        //   elevation={0}
        //   sx={{
        //     bgcolor: theme.palette.background.paper,
        //     p: 2,
        //     borderRadius: "12px",
        //   }}
        // >
        //   <Box sx={{
        //     display: "flex",
        //     alignItems: "center",
        //     mb: 2
        //   }}>
        //     <PaymentIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
        //     <Typography variant="h3">Payment Methods</Typography>
        //   </Box>
        //
        //   <Box sx={{ px: 1 }}>
        //     <Button
        //       fullWidth
        //       variant="text"
        //       color="primary"
        //       sx={{ justifyContent: "flex-start", py: 1.5 }}
        //     >
        //       Manage Payment Methods
        //     </Button>
        //     <Divider />
        //
        //     <Button
        //       fullWidth
        //       variant="text"
        //       color="primary"
        //       sx={{ justifyContent: "flex-start", py: 1.5 }}
        //     >
        //       Transaction History
        //     </Button>
        //   </Box>
        // </Paper>
        //
        // {/* Support & Help */}
        // <Paper
        //   elevation={0}
        //   sx={{
        //     bgcolor: theme.palette.background.paper,
        //     p: 2,
        //     borderRadius: "12px",
        //   }}
        // >
        //   <Box sx={{
        //     display: "flex",
        //     alignItems: "center",
        //     mb: 2
        //   }}>
        //     <HelpIcon sx={{ mr: 1.5, color: theme.palette.primary.main }} />
        //     <Typography variant="h3">Support & Help</Typography>
        //   </Box>
        //
        //   <Box sx={{ px: 1 }}>
        //     <Button
        //       fullWidth
        //       variant="text"
        //       color="primary"
        //       sx={{ justifyContent: "flex-start", py: 1.5 }}
        //     >
        //       Help Center
        //     </Button>
        //     <Divider />
        //
        //     <Button
        //       fullWidth
        //       variant="text"
        //       color="primary"
        //       sx={{ justifyContent: "flex-start", py: 1.5 }}
        //     >
        //       Contact Support
        //     </Button>
        //     <Divider />
        //
        //     <Button
        //       fullWidth
        //       variant="text"
        //       color="primary"
        //       sx={{ justifyContent: "flex-start", py: 1.5 }}
        //     >
        //       Privacy Policy
        //     </Button>
        //     <Divider />
        //
        //     <Button
        //       fullWidth
        //       variant="text"
        //       color="primary"
        //       sx={{ justifyContent: "flex-start", py: 1.5 }}
        //     >
        //       Terms of Service
        //     </Button>
        //   </Box>
        // </Paper>
      }
      {/* Account Actions */}
      <Paper elevation={0} variant="normal">
        <VBox
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
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

      {/* Pause Account Dialog */}
      <BottomSheetModal open={pauseDialogOpen} onClose={handleCancelDialog}>
        <ModalContent confirmationPageOpen={confirmationPageOpen} />
      </BottomSheetModal>
    </VBox>
  );
}
