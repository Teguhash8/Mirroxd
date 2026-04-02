import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import App from "./App";
import { FloatingToolbar } from "./components/FloatingToolbar";
import "./index.css";

const appWindow = getCurrentWebviewWindow();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {appWindow.label === "toolbar" ? <FloatingToolbar /> : <App />}
  </React.StrictMode>,
);
