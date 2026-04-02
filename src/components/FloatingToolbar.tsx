import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { motion } from "framer-motion";
import { IconButton } from "./ui/IconButton";

export function FloatingToolbar() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState("00:00");
  const appWindow = getCurrentWebviewWindow();

  useEffect(() => {
    const unlisten = listen<any>("recording-status", (event) => {
      const state = event.payload.state;
      setIsRecording(state === "recording");
      
      if (state === "recording") {
        const secs = Math.floor(event.payload.duration_secs);
        const m = Math.floor(secs / 60).toString().padStart(2, "0");
        const s = (secs % 60).toString().padStart(2, "0");
        setDuration(`${m}:${s}`);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const toggleRecording = async () => {
    if (isRecording) {
      await invoke("stop_recording");
    } else {
      await invoke("start_recording").catch(console.error);
    }
  };

  const closeToolbar = async () => {
    await appWindow.hide();
  };

  return (
    <div
      data-tauri-drag-region
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        background: "rgba(15, 15, 20, 0.85)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "12px",
        color: "white",
        userSelect: "none",
        overflow: "hidden"
      }}
    >
      <div 
        data-tauri-drag-region 
        style={{ display: "flex", alignItems: "center", gap: 12, cursor: "grab", flex: 1, height: "100%" }}
      >
        <span data-tauri-drag-region style={{ fontSize: 16 }}>📱</span>
        <span data-tauri-drag-region style={{ fontSize: 13, fontWeight: 600 }}>MirroXD</span>
      </div>
      
      <div style={{ display: "flex", alignItems: "center", gap: 8, zIndex: 10 }}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleRecording}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 12px",
            borderRadius: "6px",
            border: `1px solid ${isRecording ? "rgba(239, 68, 68, 0.5)" : "rgba(255, 255, 255, 0.1)"}`,
            background: isRecording ? "rgba(239, 68, 68, 0.2)" : "rgba(255, 255, 255, 0.05)",
            color: isRecording ? "#ef4444" : "white",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isRecording ? "#ef4444" : "#9ca3af",
              boxShadow: isRecording ? "0 0 8px #ef4444" : "none",
            }}
          />
          {isRecording ? duration : "Rekam"}
        </motion.button>
        <IconButton
          icon="✕"
          tooltip="Tutup Toolbar"
          variant="ghost"
          size="sm"
          onClick={closeToolbar}
        />
      </div>
    </div>
  );
}
