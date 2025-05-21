import { useEffect, useState } from "react";
import { Box, Paper, Typography } from "@mui/material";
import { TitleBox, VBox } from "../theme";
import Notification from "../components/Notification";
import PositionsMismatchModal from "../components/PositionMismatchModal";
import BottomSheetModal from "../components/MobilePopupModal";
import { load } from "@tauri-apps/plugin-store";

type MismatchedPosition = {
  strategy: string;
  broker: number;
  local: number;
  fix: number;
};

export default function Notifications() {
  const [notifications, setNotifications] = useState(
    [] as { title: string; description: string; fn: () => void }[],
  );
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const store = await load("store.json", { autoSave: false });
      const mismatched_positions = await store.get<{
        [stock: string]: MismatchedPosition[];
      }>("mismatched_positions");
      setNotifications(
        mismatched_positions
          ? [
              {
                title: "Position Mismatch",
                description:
                  "Positions of stocks between Broker and Postgres Database are mismatched! Fix them ASAP!",
                fn: () => setModalOpen(true),
              },
            ]
          : [],
      );
    };
    loadData();
  }, []);

  return (
    <VBox sx={{ p: 2 }}>
      <TitleBox sx={{ mb: 1 }}>
        <Typography variant="h1">Notifications</Typography>
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
                key={notif.title}
                title={notif.title}
                description={notif.description}
                onClick={notif.fn}
                include_divider={index !== notifications.length - 1}
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
