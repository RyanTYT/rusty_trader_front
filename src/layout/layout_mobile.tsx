import { ReactNode, useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { useTheme } from "@mui/material/styles";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";

import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import PieChartOutlineIcon from "@mui/icons-material/PieChartOutline";
import ListAltIcon from '@mui/icons-material/ListAlt';
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import TuneIcon from "@mui/icons-material/Tune";
import WebSocket from "@tauri-apps/plugin-websocket";
import { load } from "@tauri-apps/plugin-store";
import { invoke } from "@tauri-apps/api/core";

import styles from "./layout_mobile.module.css";

export default function MobileLayout() {
  const theme = useTheme();

  useEffect(() => {
    invoke<string>("load_rust_backend_url").then((rust_backend_url) => {
      invoke<string>("load_bearer_token").then((bearer_token) => {
        WebSocket.connect(`ws://${rust_backend_url}?token=${bearer_token}`)
          .then((ws) => {
            ws.addListener(async (mismatched_positions) => {
              const store = await load("store.json", { autoSave: false });
              await store.set("mismatched_positions", mismatched_positions);
              await store.save();
            });
          })
          .catch((err) => {
            console.log(err);
          });
      });
    });
  }, []);

  const SidebarListItem = ({
    text,
    path,
    icon,
  }: {
    text: string;
    path: string;
    icon: ReactNode;
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
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                justifyContent: "center",
              }}
            >
              {icon}
            </ListItemIcon>

            <ListItemText primary={text} className={styles.close_span} />
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
          ].map((content) => (
            <SidebarListItem
              key={content[0] as string}
              text={content[0] as string}
              path={content[1] as string}
              icon={content[2] as ReactNode}
            />
          ))}
          <Divider orientation="vertical" flexItem />
          {[
            ["Logs", "/logs", <ListAltIcon />],
            ["Notifications", "/notifications", <NotificationsNoneIcon />],
            ["Settings", "/settings", <TuneIcon />],
          ].map((content) => (
            <SidebarListItem
              key={content[0] as string}
              text={content[0] as string}
              path={content[1] as string}
              icon={content[2] as ReactNode}
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
