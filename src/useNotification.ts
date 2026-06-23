// Extends the existing WebSocket listener in layout_desktop.tsx.
// When a "news_ideas" alert type arrives, we:
//   1. Store it in Tauri store (for the notification badge)
//   2. If the app is open, auto-navigate to /news_ideas
//
// HOW TO INTEGRATE:
// In layout_desktop.tsx, replace the existing ws.addListener block with the
// one shown in the comment at the bottom of this file.

import { load } from "@tauri-apps/plugin-store";

export interface PushNotification {
  title: string;
  body: string;
  alert_type: string;
  function: string;
  timestamp: string;
}

export interface StoredNotification {
  id: string;
  title: string;
  description: string;
  alert_type: string;
  function_name: string;
  timestamp: string;
  read: boolean;
}

// Call this from a component that has access to React Router's navigate
// export function useNewsIdeasNotificationHandler() {
//   const navigate = useNavigate();
//
//   const handleMessage = useCallback(
//     async (raw: unknown) => {
//       // The WS message could be the old mismatch format OR a new notification format
//       let parsed: { type?: string; payload?: PushNotification } | null = null;
//       try {
//         parsed =
//           typeof raw === "string"
//             ? JSON.parse(raw)
//             : typeof raw === "object" && raw !== null
//               ? (raw as { type?: string; payload?: PushNotification })
//               : null;
//       } catch {
//         // Legacy mismatch format (not JSON with type field) — handle as before
//         const store = await load("store.json", { autoSave: false });
//         await store.set("mismatched_positions", raw);
//         return;
//       }
//
//       if (!parsed) return;
//
//       // New notification format from LLM service
//       if (parsed.type === "notification" && parsed.payload) {
//         const notif = parsed.payload;
//         await _storeNotification(notif);
//
//         // Auto-navigate to /news_ideas if this is a news_ideas alert
//         if (notif.alert_type === "news_ideas") {
//           sendNotification(notif);
//           // navigate("/news_ideas");
//         }
//       } else {
//         // Legacy: position mismatch object
//         const store = await load("store.json", { autoSave: false });
//         await store.set("mismatched_positions", raw);
//       }
//     },
//     [navigate],
//   );
//
//   return handleMessage;
// }

export async function _storeNotification(
  notif: PushNotification,
): Promise<void> {
  const store = await load("store.json", { autoSave: false });
  const existing =
    (await store.get<StoredNotification[]>("push_notifications")) ?? [];

  const newNotif: StoredNotification = {
    id: `${notif.function}_${notif.timestamp}`,
    title: notif.title,
    description: notif.body,
    alert_type: notif.alert_type,
    function_name: notif.function,
    timestamp: notif.timestamp,
    read: false,
  };

  // Prepend and cap at 50 stored notifications
  const updated = [newNotif, ...existing].slice(0, 50);
  await store.set("push_notifications", updated);
}

// ── Notification badge count ───────────────────────────────────────────────

export async function getUnreadCount(): Promise<number> {
  const store = await load("store.json", { autoSave: false });
  const notifs =
    (await store.get<StoredNotification[]>("push_notifications")) ?? [];
  return notifs.filter((n) => !n.read).length;
}

export async function markAllRead(): Promise<void> {
  const store = await load("store.json", { autoSave: false });
  const notifs =
    (await store.get<StoredNotification[]>("push_notifications")) ?? [];
  const updated = notifs.map((n) => ({ ...n, read: true }));
  await store.set("push_notifications", updated);
}

export async function getStoredNotifications(): Promise<StoredNotification[]> {
  const store = await load("store.json", { autoSave: false });
  return (await store.get<StoredNotification[]>("push_notifications")) ?? [];
}

/*
──────────────────────────────────────────────────────────────────────────────
HOW TO UPDATE layout_desktop.tsx
──────────────────────────────────────────────────────────────────────────────

1. Import this hook:
   import { useNewsIdeasNotificationHandler } from "../news_ideas/useNotifications";
   import { Badge } from "@mui/material";          // for the badge on the sidebar icon
   import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";

2. Inside DesktopLayout(), add:
   const handleWsMessage = useNewsIdeasNotificationHandler();
   const [unreadCount, setUnreadCount] = useState(0);

3. Replace the existing ws.addListener block:

   ws.addListener(async (message) => {
     await handleWsMessage(message);
     // Refresh badge count
     const count = await getUnreadCount();
     setUnreadCount(count);
   });

4. Add /news_ideas to the sidebar nav list:
   ["News Ideas", "/news_ideas", 
     <Badge badgeContent={unreadCount} color="error" invisible={unreadCount === 0}>
       <LightbulbOutlinedIcon />
     </Badge>
   ],

5. Reset badge when user opens the page:
   // In the news_ideas page component, call markAllRead() in a useEffect.
──────────────────────────────────────────────────────────────────────────────
*/
