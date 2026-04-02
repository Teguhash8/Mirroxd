// ─── MirroXD App ──────────────────────────────────────────────────────────────
// Main application layout: Zero UI floating panels on a dot-grid canvas

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DeviceList } from "./components/DeviceList";
import { MirrorView } from "./components/MirrorView";
import { StreamSettings } from "./components/StreamSettings";
import { RecordingPanel } from "./components/RecordingPanel";
import { AIHub } from "./components/AIHub";

import { ToastContainer, type Toast } from "./components/ui/Toast";
import { StatusIndicator } from "./components/ui/StatusIndicator";
import { useAdb } from "./hooks/useAdb";
import { useScrcpy } from "./hooks/useScrcpy";
import "./index.css";

type SidebarTab = "devices" | "settings" | "recordings" | "aihub";

export default function App() {
  const adb = useAdb();
  const scrcpy = useScrcpy();
  const [activeTab, setActiveTab] = useState<SidebarTab>("devices");
  const [isDark, setIsDark] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);

  // ── Theme management ────────────────────────────────────────────────────
  useEffect(() => {
    if (isDark) {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [isDark]);

  // ── Toast management ────────────────────────────────────────────────────
  const addToast = useCallback(
    (message: string, type: Toast["type"] = "info") => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Start mirroring handler ─────────────────────────────────────────────
  const handleStartMirroring = useCallback(
    async (serial: string) => {
      addToast("Memulai mirroring...", "info");
      await scrcpy.startMirroring(serial);
      if (scrcpy.streamState !== "error") {
        addToast("Mirroring aktif! 🎉", "success");
      }
    },
    [scrcpy, addToast]
  );

  // ── Stop mirroring handler ──────────────────────────────────────────────
  const handleStopMirroring = useCallback(async () => {
    await scrcpy.stopMirroring();
    addToast("Mirroring dihentikan", "info");
  }, [scrcpy, addToast]);

  const isMirroring =
    scrcpy.streamState === "streaming" ||
    scrcpy.streamState === "starting" ||
    scrcpy.streamState === "reconnecting";

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* ═══ Theme Toggle ═══════════════════════════════════════════════════════ */}
      <motion.button
        onClick={() => setIsDark(!isDark)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        style={{
          position: "absolute",
          top: 24,
          right: 24,
          zIndex: 100,
          width: 44,
          height: 44,
          borderRadius: "var(--radius-full)",
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-sm)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          cursor: "pointer",
          backdropFilter: "blur(var(--glass-blur))",
        }}
        title="Toggle Theme"
      >
        {isDark ? "☀️" : "🌙"}
      </motion.button>

      {/* ═══ Floating Control Panel (Former Sidebar) ═════════════════════════ */}
      <motion.div
        drag
        dragConstraints={containerRef}
        dragMomentum={false}
        initial={{ x: 24, y: 24, opacity: 0 }}
        animate={{ x: 24, y: 24, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{
          position: "absolute",
          width: 320,
          maxHeight: "calc(100vh - 48px)",
          display: "flex",
          flexDirection: "column",
          borderRadius: "var(--radius-xl)",
          background: "var(--glass-bg)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-lg)",
          backdropFilter: "blur(var(--glass-blur))",
          overflow: "hidden",
          zIndex: 50,
        }}
      >
        {/* App header - Draggable handle */}
        <motion.div
          style={{
            padding: "20px",
            borderBottom: "1px solid var(--color-border)",
            display: "flex",
            alignItems: "center",
            gap: 12,
            cursor: "grab",
          }}
          whileTap={{ cursor: "grabbing" }}
        >
          {/* Logo */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, var(--color-accent), var(--color-orange))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 700,
              color: "white",
              flexShrink: 0,
            }}
          >
            M
          </div>
          <div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--color-text-primary)",
                letterSpacing: "-0.5px",
              }}
            >
              MirroXD
            </div>
            <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
              Workspace
            </div>
          </div>

          {/* Stream status */}
          <div style={{ marginLeft: "auto" }}>
            <StatusIndicator
              status={
                isMirroring
                  ? "connected"
                  : adb.isScanning
                  ? "scanning"
                  : "disconnected"
              }
              size={8}
            />
          </div>
        </motion.div>

        {/* Tab buttons */}
        <div
          style={{
            display: "flex",
            padding: "12px",
            gap: 6,
          }}
        >
          {(
            [
              { key: "devices", icon: "📱", label: "Devices" },
              { key: "settings", icon: "⚙️", label: "Config" },
              { key: "recordings", icon: "🎬", label: "Media" },
              { key: "aihub", icon: "✨", label: "AI Hub" },
            ] as const
          ).map((tab) => (
            <motion.button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              style={{
                flex: 1,
                padding: "10px 4px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background:
                  activeTab === tab.key
                    ? "var(--color-surface-hover)"
                    : "transparent",
                color:
                  activeTab === tab.key
                    ? "var(--color-text-primary)"
                    : "var(--color-text-muted)",
                fontSize: 11,
                fontWeight: activeTab === tab.key ? 600 : 500,
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                transition: "all 0.2s ease",
              }}
            >
              <span style={{ fontSize: 16 }}>{tab.icon}</span>
              {tab.label}
            </motion.button>
          ))}
        </div>

        {/* Tab content */}
        <div
          style={{
            flex: 1,
            padding: 16,
            overflowY: "auto",
            overflowX: "hidden",
            /* enable pointer events internally */
            cursor: "auto",
          }}
          onPointerDown={(e) => e.stopPropagation()} // Stop drag when interacting with contents
        >
          <AnimatePresence mode="wait">
            {activeTab === "devices" && (
              <motion.div
                key="devices"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <DeviceList onStartMirroring={handleStartMirroring} adb={adb} />
              </motion.div>
            )}
            {activeTab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <StreamSettings
                  config={scrcpy.config}
                  onUpdate={scrcpy.updateConfig}
                  isStreaming={isMirroring}
                />
              </motion.div>
            )}
            {activeTab === "recordings" && (
              <motion.div
                key="recordings"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <RecordingPanel />
              </motion.div>
            )}
            {activeTab === "aihub" && (
              <motion.div
                key="aihub"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
              >
                <AIHub />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* ═══ Main Area (Mirroring or Welcome overlay) ═══════════════════════ */}
      <AnimatePresence>
        {isMirroring ? (
          <motion.div
             drag
             dragConstraints={containerRef}
             dragMomentum={false}
             initial={{ x: 380, y: 50, opacity: 0 }}
             animate={{ x: 380, y: 50, opacity: 1 }}
             exit={{ opacity: 0, scale: 0.9 }}
             style={{
               position: "absolute",
               width: 320,
               height: 600,
               zIndex: 40,
             }}
          >
             <MirrorView
               scrcpy={scrcpy}
               onDisconnect={handleStopMirroring}
               onOpenSettings={() => setActiveTab("settings")}
             />
          </motion.div>
        ) : (
          <motion.div
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             exit={{ opacity: 0 }}
             style={{
               position: "absolute",
               inset: 0,
               display: "flex",
               alignItems: "center",
               justifyContent: "center",
               pointerEvents: "none",
               zIndex: 10,
             }}
          >
            <WelcomeScreen
              hasDevices={adb.devices.length > 0}
              isScanning={adb.isScanning}
              selectedDevice={adb.selectedDevice}
              onStartMirroring={handleStartMirroring}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ Toasts ════════════════════════════════════════════════════════ */}
      <div style={{ position: "absolute", bottom: 20, right: 20, zIndex: 1000 }}>
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </div>
  );
}

// ── Welcome Screen (when not mirroring) ──
function WelcomeScreen({
  hasDevices,
  isScanning,
  selectedDevice,
  onStartMirroring,
}: {
  hasDevices: boolean;
  isScanning: boolean;
  selectedDevice: { serial: string; state: string } | null;
  onStartMirroring: (serial: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 24,
        pointerEvents: "auto",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          background: "var(--glass-bg)",
          backdropFilter: "blur(var(--glass-blur))",
          padding: 40,
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 800,
            color: "var(--color-text-primary)",
            letterSpacing: "-0.5px",
          }}
        >
          {hasDevices ? "Device Siap" : "Hubungkan Perangkat"}
        </div>
        <div
          style={{
            fontSize: 14,
            color: "var(--color-text-muted)",
            textAlign: "center",
            maxWidth: 300,
          }}
        >
          {hasDevices
            ? "Pilih perangkat dari panel Workspace dan klik 'Mulai Mirroring'."
            : isScanning
            ? "Mencari perangkat Android..."
            : "Hubungkan HP via USB dan aktifkan USB Debugging."}
        </div>
        <AnimatePresence>
          {selectedDevice && selectedDevice.state === "device" && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onStartMirroring(selectedDevice.serial)}
                style={{
                  padding: "14px 32px",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: "var(--color-accent)",
                  color: "white",
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  boxShadow: "var(--shadow-glow)",
                  marginTop: 12,
                }}
              >
                ▶ Mulai Mirroring
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
