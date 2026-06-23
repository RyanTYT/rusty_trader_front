import { useState, ReactNode, useEffect, memo } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";

import { useTheme } from "@mui/material/styles";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import NewspaperIcon from "@mui/icons-material/Newspaper";
import { Badge, Box } from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import PieChartOutlineIcon from "@mui/icons-material/PieChartOutline";
import ListAltIcon from "@mui/icons-material/ListAlt";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import TuneIcon from "@mui/icons-material/Tune";
// import WebSocket from "@tauri-apps/plugin-websocket";
// import { load } from "@tauri-apps/plugin-store";
// import { invoke } from "@tauri-apps/api/core";

import styles from "./layout_desktop.module.css";
import { listen } from "@tauri-apps/api/event";
import { load } from "@tauri-apps/plugin-store";

interface SidebarListItemProps {
  text: string;
  path: string;
  icon: ReactNode;
  open: boolean;
  selected: boolean;
  theme: any;
  closeSidebar: () => void;
}

const SidebarListItem = memo(
  ({
    text,
    path,
    icon,
    open,
    selected,
    theme,
    closeSidebar,
  }: SidebarListItemProps) => {
    return (
      <NavLink
        to={path}
        style={{ textDecoration: "none" }}
        onClick={closeSidebar}
      >
        <ListItem key={text} disablePadding sx={{ display: "block" }}>
          <ListItemButton
            sx={{
              minHeight: 48,
              px: 2.5,
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

            <ListItemText
              primary={text}
              sx={{ color: theme.palette.text.primary }}
              className={`span_base ${open ? styles.open_span : styles.close_span}`}
            />
          </ListItemButton>
        </ListItem>
      </NavLink>
    );
  },
);

export default function DesktopLayout() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [numNotifs, setNumNotifs] = useState(0);
  const open_width = "12rem";
  const close_width = "64px";

  const location = useLocation();

  // useEffect(() => {
  //   invoke<string>("load_rust_backend_url").then((rust_backend_url) => {
  //     invoke<string>("load_bearer_token").then((bearer_token) => {
  //       WebSocket.connect(`ws://${rust_backend_url}?token=${bearer_token}`)
  //         .then((ws) => {
  //           ws.addListener(async (mismatched_positions) => {
  //             const store = await load("store.json", { autoSave: false });
  //             await store.set("mismatched_positions", mismatched_positions);
  //           });
  //         })
  //         .catch((err) => {
  //           console.log(err);
  //         });
  //     });
  //   });
  // }, []);

  useEffect(() => {
    const loadNotifs = async () => {
      const store = await load("store.json", { autoSave: false });
      let curr_notifications = await store.get<any[]>("notifications");
      if (!curr_notifications) {
        return;
      }
      console.log("Loading notifs");
      console.log(curr_notifications);

      setNumNotifs(curr_notifications.filter((notif) => !notif.read).length);
    };

    const listen_to_backend = async () => {
      // NEED TO CHECK THIS
      await listen("ws-event", async (ws_event_res) => {
        console.log(`OKOKOKOKOKOKOKKOKOKOKOKOKOKOOOKOKO`);
        console.log(ws_event_res);
        console.log(ws_event_res.payload);
        console.log(`OKOKOKOKOKOKOKKOKOKOKOKOKOKOOOKOKO`);
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
          const num_notifs = new_notifs.filter((notif) => !notif.read).length;
          setNumNotifs(num_notifs);
          await store.set("notifications", new_notifs);
          await store.save();
        }
      });
    };

    window.addEventListener("refresh-notifications", loadNotifs);
    loadNotifs();
    listen_to_backend();
  }, []);

  // const SidebarListItem = memo(
  //   ({ text, path, icon, open }: SidebarListItemProps) => {
  //     return (
  //       <NavLink to={path} style={{ textDecoration: "none" }}>
  //         <ListItem key={text} disablePadding sx={{ display: "block" }}>
  //           <ListItemButton
  //             sx={{
  //               minHeight: 48,
  //               px: 2.5,
  //             }}
  //           >
  //             <ListItemIcon
  //               sx={{
  //                 minWidth: 0,
  //                 justifyContent: "center",
  //               }}
  //             >
  //               {icon}
  //             </ListItemIcon>
  //
  //             <ListItemText
  //               primary={text}
  //               sx={{ color: theme.palette.text.primary }}
  //               className={`span_base ${open ? styles.open_span : styles.close_span}`}
  //             />
  //           </ListItemButton>
  //         </ListItem>
  //       </NavLink>
  //     );
  //   },
  // );

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <div
        style={{
          height: "100vh",
          position: "fixed",
          top: "0",
          left: "0",
          width: open ? open_width : "fit-content",
          transition: `all ${theme.transitions.duration.enteringScreen}ms  ${theme.transitions.easing.sharp}`,
          display: "flex",
          flexDirection: "column",
          zIndex: "1000",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            // width: "100%",
            cursor: "pointer",
            // justifyContent: open ? "flex-end" : "center",
            // justifyContent: "flex-end",
            // transition: `all ${theme.transitions.duration.enteringScreen}ms  ${theme.transitions.easing.sharp}`,
            padding: theme.spacing(1),
            // ...theme.mixins.toolbar
          }}
          onClick={() => setOpen(!open)}
          className={`${open ? styles.open_arrow : styles.close_arrow}`}
        >
          {open ? <ChevronLeftIcon /> : <MenuIcon />}
        </Box>

        <List>
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
              open={open}
              theme={theme}
              closeSidebar={() => setOpen(false)}
            />
          ))}
        </List>
        <Divider />
        <List>
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
              open={open}
              theme={theme}
              closeSidebar={() => setOpen(false)}
            />
          ))}
        </List>
      </div>
      <div
        style={{
          transition: `all ${theme.transitions.duration.enteringScreen}ms  ${theme.transitions.easing.sharp}`,
          marginLeft: open ? open_width : close_width,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Outlet />
      </div>
    </div>
  );
}
