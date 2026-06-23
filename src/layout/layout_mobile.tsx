import { ReactNode, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { useTheme } from "@mui/material/styles";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import Divider from "@mui/material/Divider";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import Stack from "@mui/material/Stack";

import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import PieChartOutlineIcon from "@mui/icons-material/PieChartOutline";
import ListAltIcon from "@mui/icons-material/ListAlt";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import TuneIcon from "@mui/icons-material/Tune";
import { load } from "@tauri-apps/plugin-store";

import { listen } from "@tauri-apps/api/event";
import { Badge } from "@mui/material";

export default function MobileLayout() {
  const theme = useTheme();
  const [numNotifs, setNumNotifs] = useState(0);

  const location = useLocation();

  useEffect(() => {
    const loadNotifs = async () => {
      const store = await load("store.json", { autoSave: false });
      let curr_notifications = await store.get<any[]>("notifications");
      if (!curr_notifications) {
        return;
      }

      setNumNotifs(curr_notifications.filter((notif) => notif.read).length);
    };

    const listen_to_backend = async () => {
      // NEED TO CHECK THIS
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
          setNumNotifs(numNotifs + 1);
          await store.set("notifications", new_notifs);
          await store.save();
        }
      });
    };

    window.addEventListener("refresh-notifications", loadNotifs);
    loadNotifs();
    listen_to_backend();
  }, []);

  // useEffect(() => {
  //   invoke<string>("load_rust_backend_url").then((rust_backend_url) => {
  //     invoke<string>("load_bearer_token").then((bearer_token) => {
  //       WebSocket.connect(`ws://${rust_backend_url}?token=${bearer_token}`)
  //         .then((ws) => {
  //           ws.addListener(async (mismatched_positions) => {
  //             const store = await load("store.json", { autoSave: false });
  //             await store.set("mismatched_positions", mismatched_positions);
  //             await store.save();
  //           });
  //         })
  //         .catch((err) => {
  //           console.log(err);
  //         });
  //     });
  //   });
  // }, []);

  const SidebarListItem = ({
    text,
    path,
    icon,
    selected,
  }: {
    text: string;
    path: string;
    icon: ReactNode;
    selected: boolean;
  }) => {
    return (
      <NavLink to={path}>
        <ListItem key={text} disablePadding sx={{ display: "block" }}>
          <ListItemButton
            sx={{
              minHeight: 48,
              px: 2.5,
              borderRadius: "10%",
              width: "fit-content",
            }}
            selected={selected}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                justifyContent: "center",
              }}
            >
              {icon}
            </ListItemIcon>

            {// <ListItemText primary={text} className={styles.close_span} />
            }
          </ListItemButton>
        </ListItem>
      </NavLink>
    );
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          width: "100vw",
          position: "fixed",
          bottom: "0",
          left: "0",
          // width: open ? open_width : "fit-content",
          transition: `all ${theme.transitions.duration.enteringScreen}ms  ${theme.transitions.easing.sharp}`,
          background: theme.palette.background.default,
          display: "flex",
          flexDirection: "row",
          zIndex: "1000",
          overflow: "auto"
        }}
      >
        <List
          component={Stack}
          direction="row"
          sx={{ justifyContent: "space-evenly", width: "100%" }}
        >
          {[
            ["Strategy", "/strategy", <AutoGraphIcon />],
            ["Portfolio", "/portfolio", <PieChartOutlineIcon />],
            ["Knowledge Base", "/knowledge_base", <NewspaperIcon />],
            [
              "News Ideas",
              "/news_ideas",
              <Badge
                badgeContent={numNotifs}
                color="error"
                invisible={numNotifs === 0}
              >
                <LightbulbOutlinedIcon />
              </Badge>,
            ],
          ].map((content) => (
            <SidebarListItem
              key={content[0] as string}
              text={content[0] as string}
              path={content[1] as string}
              icon={content[2] as ReactNode}
              selected={content[1] === location.pathname}
            />
          ))}
          <Divider orientation="vertical" flexItem />
          {[
            ["Logs", "/logs", <ListAltIcon />],
            [
              "Notifications",
              "/notifications",
              <Badge
                badgeContent={numNotifs}
                color="error"
                invisible={numNotifs === 0}
              >
                <NotificationsNoneIcon />
              </Badge>,
            ],
            ["Settings", "/settings", <TuneIcon />],
          ].map((content) => (
            <SidebarListItem
              key={content[0] as string}
              text={content[0] as string}
              path={content[1] as string}
              icon={content[2] as ReactNode}
              selected={content[1] === location.pathname}
            />
          ))}
        </List>
      </div>
      <div
        style={{
          transition: `all ${theme.transitions.duration.enteringScreen}ms  ${theme.transitions.easing.sharp}`,
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          paddingBottom: "100px",
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}
