import { useEffect, useState } from "react";
// Added DoneAllIcon and alpha utilities for beautiful hover states
import { Box, Paper, Typography, Button } from "@mui/material";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import { alpha } from "@mui/material/styles";
import { TitleBox, VBox } from "../theme";
import Notification from "../components/Notification";
import PositionsMismatchModal from "../components/PositionMismatchModal";
import BottomSheetModal from "../components/MobilePopupModal";
import { load } from "@tauri-apps/plugin-store";
import { listen } from "@tauri-apps/api/event";

export default function Notifications() {
  const [notifications, setNotifications] = useState(
    [] as {
      payload: {
        title: string;
        body: string;
        fn: () => void;
        function: string;
        timestamp: string;
      };
      read: boolean;
      type: string;
    }[],
  );
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const store = await load("store.json", { autoSave: false });
      let curr_notifications = await store.get<any[]>("notifications");
      curr_notifications = curr_notifications?.filter((notif) => {
        const time_created = new Date(notif.payload.timestamp);
        if (isNaN(time_created.getTime())) {
          return false;
        }

        const time_now = new Date();
        const time_since = time_now.getTime() - time_created.getTime();
        if (time_since > 5 * 24 * 60 * 60 * 1000) {
          return false;
        }
        return true;
      });
      curr_notifications =
        curr_notifications === undefined ? [] : curr_notifications;

      await store.set("notifications", curr_notifications);
      await store.save();

      setNotifications(curr_notifications!);
    };

    const listen_to_backend = async () => {
      await listen("ws-event", async (ws_event_res) => {
        const ws_event = JSON.parse(ws_event_res.payload as string);
        if (ws_event.type === "notification") {
          const store = await load("store.json", { autoSave: false });
          let curr_notifications = await store.get<any[]>("notifications");

          if (!Array.isArray(curr_notifications)) {
            curr_notifications = [];
          }

          const new_notif = {
            read: false,
            ...ws_event,
          };
          const new_notifs = [new_notif, ...curr_notifications];
          setNotifications(new_notifs);
          await store.set("notifications", new_notifs);
          await store.save();
        }
      });
    };

    loadData();
    listen_to_backend();
  }, []);

  const notifClicked = async (idx: number) => {
    console.log(notifications[idx]);
    if (notifications[idx].read) {
      return;
    }

    notifications[idx].read = true;
    const store = await load("store.json", { autoSave: false });
    await store.set("notifications", notifications);
    await store.save();
    setNotifications([...notifications]);
    window.dispatchEvent(new Event("refresh-notifications"));
  };

  const markAllAsRead = async () => {
    const hasUnread = notifications.some((notif) => !notif.read);
    if (!hasUnread) return;

    const updatedNotifications = notifications.map((notif) => ({
      ...notif,
      read: true,
    }));

    const store = await load("store.json", { autoSave: false });
    await store.set("notifications", updatedNotifications);
    await store.save();

    setNotifications(updatedNotifications);
    window.dispatchEvent(new Event("refresh-notifications"));
  };

  return (
    <VBox sx={{ p: 2 }}>
      <TitleBox
        sx={{
          mb: 2, // Slightly increased spacing for breathing room
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end", // Anchors it cleanly to the baseline of the H1 text
        }}
      >
        <Typography variant="h1">Notifications</Typography>

        {/* --- STYLIZED NEW BUTTON --- */}
        {notifications.some((n) => !n.read) && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<DoneAllIcon sx={{ fontSize: "16px !important" }} />}
            onClick={markAllAsRead}
            sx={{
              position: "fixed",
              top: 20,
              right: 20,
              textTransform: "none",
              borderRadius: "20px", // Rounded capsule shape
              px: 2,
              py: 0.5,
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "primary.main",
              borderColor: (theme) => alpha(theme.palette.primary.main, 0.3),
              backgroundColor: (theme) =>
                alpha(theme.palette.primary.main, 0.03),
              "&:hover": {
                borderColor: "primary.main",
                backgroundColor: (theme) =>
                  alpha(theme.palette.primary.main, 0.08),
              },
              transition: "all 0.2s ease-in-out",
            }}
          >
            Mark all as read
          </Button>
        )}
      </TitleBox>

      <Paper variant="normal">
        {notifications.length === 0 ? (
          <VBox
            sx={{
              py: 4,
              textAlign: "center",
              alignItems: "center",
              color: "text.secondary",
            }}
          >
            <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
              You're all caught up!
            </Typography>
            <Typography variant="caption">
              No new notifications for now.
            </Typography>
          </VBox>
        ) : (
          <Box>
            {notifications.map((notif, index) => (
              <Notification
                key={index}
                title={notif.payload.title}
                fn_name={notif.payload.function}
                description={notif.payload.body}
                onClick={() => notifClicked(index)}
                include_divider={index !== notifications.length - 1}
                is_read={notif.read}
              />
            ))}
          </Box>
        )}
      </Paper>

      <BottomSheetModal open={modalOpen} onClose={() => setModalOpen(false)}>
        <PositionsMismatchModal close={() => setModalOpen(false)} />
      </BottomSheetModal>
    </VBox>
  );
}
