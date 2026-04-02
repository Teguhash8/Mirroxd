// ─── MirrorView Component ─────────────────────────────────────────────────────
// Main mirroring view: canvas + floating controls + recording indicator

import { motion, AnimatePresence } from "framer-motion";
import { MirrorCanvas } from "./MirrorCanvas";
import { IconButton } from "./ui/IconButton";
import { GlassPanel } from "./ui/GlassPanel";
import type { useScrcpy } from "../hooks/useScrcpy";

interface MirrorViewProps {
  scrcpy: ReturnType<typeof useScrcpy>;
  onDisconnect: () => void;
  onOpenSettings: () => void;
}

// Android keycodes
const KEY_BACK = 4;
const KEY_HOME = 3;
const KEY_RECENT = 187;
const KEY_POWER = 26;
const KEY_VOLUME_UP = 24;
const KEY_VOLUME_DOWN = 25;

export function MirrorView({
  scrcpy,
  onDisconnect,
  onOpenSettings,
}: MirrorViewProps) {
  const isStreaming = scrcpy.streamState === "streaming";

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        gap: 16,
      }}
    >
      {/* Canvas area */}
      <div
        style={{
          flex: 1,
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        <MirrorCanvas
          isStreaming={isStreaming}
          deviceName={scrcpy.currentSerial ?? undefined}
        />

        {/* Recording indicator */}
        <AnimatePresence>
          {scrcpy.isRecording && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 12px",
                borderRadius: "var(--radius-sm)",
                background: "rgba(239, 68, 68, 0.15)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
              }}
            >
              <motion.div
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "#EF4444",
                  boxShadow: "0 0 8px #EF4444",
                }}
              />
              <span style={{ fontSize: 12, color: "#EF4444", fontWeight: 500 }}>
                REC {scrcpy.recordingStatus ? formatDuration(scrcpy.recordingStatus.duration_secs) : ""}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stream state overlay */}
        <AnimatePresence>
          {scrcpy.streamState === "starting" && (
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
                flexDirection: "column",
                gap: 12,
                background: "rgba(0,0,0,0.6)",
                borderRadius: "var(--radius-lg)",
              }}
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                style={{ fontSize: 32 }}
              >
                ⟳
              </motion.div>
              <span style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
                Memulai mirroring...
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        {scrcpy.streamState === "reconnecting" && (
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: "50%",
              transform: "translateX(-50%)",
              padding: "6px 14px",
              borderRadius: "var(--radius-sm)",
              background: "rgba(245, 158, 11, 0.15)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(245, 158, 11, 0.3)",
              fontSize: 12,
              color: "#F59E0B",
            }}
          >
            Reconnecting...
          </div>
        )}
      </div>

      {/* Side controls */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          alignItems: "center",
        }}
      >
        <GlassPanel padding="8px" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {/* Navigation keys */}
          <IconButton
            icon="◀"
            tooltip="Back"
            size="sm"
            variant="ghost"
            onClick={() => scrcpy.sendKey(KEY_BACK)}
          />
          <IconButton
            icon="●"
            tooltip="Home"
            size="sm"
            variant="ghost"
            onClick={() => scrcpy.sendKey(KEY_HOME)}
          />
          <IconButton
            icon="■"
            tooltip="Recent Apps"
            size="sm"
            variant="ghost"
            onClick={() => scrcpy.sendKey(KEY_RECENT)}
          />

          <div style={{ height: 1, background: "var(--color-border)", margin: "4px 0" }} />

          {/* Volume */}
          <IconButton
            icon="🔊"
            tooltip="Volume Up"
            size="sm"
            variant="ghost"
            onClick={() => scrcpy.sendKey(KEY_VOLUME_UP)}
          />
          <IconButton
            icon="🔉"
            tooltip="Volume Down"
            size="sm"
            variant="ghost"
            onClick={() => scrcpy.sendKey(KEY_VOLUME_DOWN)}
          />
          <IconButton
            icon="⏻"
            tooltip="Power"
            size="sm"
            variant="ghost"
            onClick={() => scrcpy.sendKey(KEY_POWER)}
          />
        </GlassPanel>

        <GlassPanel padding="8px" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {/* Recording */}
          <IconButton
            icon={scrcpy.isRecording ? "⏹" : "⏺"}
            tooltip={scrcpy.isRecording ? "Stop Recording" : "Start Recording"}
            size="sm"
            variant={scrcpy.isRecording ? "danger" : "default"}
            onClick={() =>
              scrcpy.isRecording ? scrcpy.stopRecording() : scrcpy.startRecording()
            }
          />

          <div style={{ height: 1, background: "var(--color-border)", margin: "4px 0" }} />

          {/* Settings & Disconnect */}
          <IconButton
            icon="⚙"
            tooltip="Settings"
            size="sm"
            variant="ghost"
            onClick={onOpenSettings}
          />
          <IconButton
            icon="✕"
            tooltip="Disconnect"
            size="sm"
            variant="danger"
            onClick={onDisconnect}
          />
        </GlassPanel>
      </div>
    </div>
  );
}

function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}
