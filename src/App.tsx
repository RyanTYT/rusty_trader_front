import { Routes, Route } from "react-router-dom";
import StrategyDashboard from "./strategy/strategy";
import PortfolioDashboard from "./portfolio/portfolio";
import DesktopLayout from "./layout/layout_desktop";
import MobileLayout from "./layout/layout_mobile";

import { platform } from "@tauri-apps/plugin-os";
import SettingsPage from "./settings/settings";
import Notifications from "./notifications/notifications";
// import PythonCodeEditor from "./add_strategy/add_strategy";
import LogList from "./add_strategy/LogsList";

function App() {
  const platformName = platform();
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
      </Route>
    </Routes>
  );
}

export default App;
