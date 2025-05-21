import { useState, useEffect, ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { useTheme } from "@mui/material/styles";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import { Box } from "@mui/material";

import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import PieChartOutlineIcon from "@mui/icons-material/PieChartOutline";
import AddIcon from "@mui/icons-material/Add";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import TuneIcon from "@mui/icons-material/Tune";
import WebSocket from "@tauri-apps/plugin-websocket";
import { load } from "@tauri-apps/plugin-store";

import styles from "./layout_desktop.module.css";

export default function DesktopLayout() {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const open_width = "12rem";
  const close_width = "64px";

  useEffect(() => {
    const rust_backend_url = process.env.RUST_BACKEND_URL || "";
    WebSocket.connect(`ws://${rust_backend_url}`)
      .then((ws) => {
        ws.addListener(async (mismatched_positions) => {
          const store = await load("store.json", { autoSave: false });
          await store.set("mismatched_positions", mismatched_positions);
        });
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  const SidebarListItem = ({
    text,
    path,
    icon,
    open,
  }: {
    text: string;
    path: string;
    icon: ReactNode;
    open: boolean;
  }) => {
    return (
      <NavLink to={path} style={{ textDecoration: "none" }}>
        <ListItem key={text} disablePadding sx={{ display: "block" }}>
          <ListItemButton
            sx={{
              minHeight: 48,
              px: 2.5,
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

            <ListItemText
              primary={text}
              sx={{ color: theme.palette.text.primary }}
              className={`${open ? styles.open_span : styles.close_span}`}
            />
          </ListItemButton>
        </ListItem>
      </NavLink>
    );
  };

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
          ].map((content) => (
            <SidebarListItem
              key={content[0] as string}
              text={content[0] as string}
              path={content[1] as string}
              icon={content[2] as ReactNode}
              open={open}
            />
          ))}
        </List>
        <Divider />
        <List>
          {[
            ["Add Strategy", "/add_strategy", <AddIcon />],
            ["Notifications", "/notifications", <NotificationsNoneIcon />],
            ["Settings", "/settings", <TuneIcon />],
          ].map((content) => (
            <SidebarListItem
              key={content[0] as string}
              text={content[0] as string}
              path={content[1] as string}
              icon={content[2] as ReactNode}
              open={open}
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
