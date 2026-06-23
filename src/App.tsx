import { Routes, Route, useNavigate } from "react-router-dom";
import StrategyDashboard from "./strategy/strategy";
import PortfolioDashboard from "./portfolio/portfolio";
import DesktopLayout from "./layout/layout_desktop";
import MobileLayout from "./layout/layout_mobile";

import { platform } from "@tauri-apps/plugin-os";
import SettingsPage from "./settings/settings";
import Notifications from "./notifications/notifications";
// import PythonCodeEditor from "./add_strategy/add_strategy";
import LogList from "./add_strategy/LogsList";
import NewsIdeas from "./news_ideas/NewsIdeas";
import {
  isPermissionGranted,
  onAction,
  registerActionTypes,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { listen } from "@tauri-apps/api/event";
import { load } from "@tauri-apps/plugin-store";
import { attachConsole } from "@tauri-apps/plugin-log";
import { useEffect } from "react";
import { _storeNotification } from "./useNotification";
import KBBrowser from "./KBBrowser/KBBrowser";
import MobileKBBrowser from "./KBBrowser/MobilKBBrowser";

async function reqPermissionIfNeeded() {
  // Do you have permission to send a notification?
  let permissionGranted = await isPermissionGranted();

  // If not we need to request it
  if (!permissionGranted) {
    const permission = await requestPermission();
    permissionGranted = permission === "granted";
  }
}

export interface PushNotification {
  title: string;
  body: string;
  alert_type: string;
  function: string;
  timestamp: string;
}

interface WebsocketData {
  type?: string;
  payload?: PushNotification;
}

function App() {
  const platformName = platform();
  const navigate = useNavigate();
  listen("ws-status", async (ws_status) => {
    console.log(`WS-STATUS UPDATE: ${ws_status}`);
    await reqPermissionIfNeeded();
    const ws_status_payload: any = ws_status.payload;
    sendNotification({
      title: "Websocket Status",
      body: `${ws_status_payload[0]}: ${ws_status_payload[1]}`,
    });
  });
  listen("ws-event", async (ws_event_res) => {
    await reqPermissionIfNeeded();
    const ws_event_payload_raw: any = ws_event_res.payload;
    let parsed: WebsocketData | null = null;
    try {
      parsed =
        typeof ws_event_payload_raw === "string"
          ? JSON.parse(ws_event_payload_raw)
          : typeof ws_event_payload_raw === "object" &&
              ws_event_payload_raw !== null
            ? (ws_event_payload_raw as {
                type?: string;
                payload?: PushNotification;
              })
            : null;
    } catch {
      // Legacy mismatch format (not JSON with type field) — handle as before
      console.log("OLD OLD OLD!!!");
      const store = await load("store.json", { autoSave: false });
      await store.set("mismatched_positions", ws_event_payload_raw);
      return;
    }

    if (!parsed) return;

    // New notification format from LLM service
    if (parsed.type === "notification" && parsed.payload) {
      const notif = parsed.payload;
      await _storeNotification(notif);
      sendNotification(notif);

      // Auto-navigate to /news_ideas if this is a news_ideas alert
      if (notif.alert_type === "news_ideas") {
        navigate("/news_ideas");
      }
    } else {
      // Legacy: position mismatch object
      console.log("OLD OLD OLD!!!");
      const store = await load("store.json", { autoSave: false });
      await store.set("mismatched_positions", ws_event_payload_raw);
    }

    // sendNotification({
    //     title: "Websocket Event Payload",
    //     body: `Payload: ${parsed.payload}`,
    // });
  });

  useEffect(() => {
    const attachLogs = async () => {
      await attachConsole();
    };
    attachLogs();

    if (["android", "ios"].includes(platformName)) {
      const registerActionTypesPromise = async () => {
        registerActionTypes([
          {
            id: "news_ideas",
            actions: [
              {
                id: "mark-read",
                title: "Mark Read",
                foreground: true,
              },
              {
                id: "dismiss",
                title: "Dismiss",
                destructive: true,
              },
            ],
          },
        ]);
      };
      registerActionTypesPromise();

      const onActionPromise = async () => {
        await onAction((notification) => {
          console.log(notification);
          // if (notification.actionTypeId === "news_ideas") {
          //     notification.
          // }
        });
      };

      onActionPromise();
    }
  });

  return (
    <Routes>
      <Route
        path="/"
        element={
          ["android", "ios"].includes(platformName) ? (
            <MobileLayout />
          ) : (
            <DesktopLayout />
          )
        }
      >
        <Route index element={<StrategyDashboard />} />
        <Route path="/strategy" element={<StrategyDashboard />} />
        <Route path="/portfolio" element={<PortfolioDashboard />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/logs" element={<LogList />} />
        <Route path="/news_ideas" element={<NewsIdeas />} />
        <Route
          path="/knowledge_base"
          element={
            ["android", "ios"].includes(platformName) ? (
              <MobileKBBrowser />
            ) : (
              <KBBrowser />
            )
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
