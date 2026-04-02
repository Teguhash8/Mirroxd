// ─── DeviceList Component (Redesigned) ────────────────────────────────────────
// Premium device listing with glassmorphism, animations, and auto-detect UX

import { motion, AnimatePresence } from "framer-motion";
import { type AdbDevice, type DeviceInfo, useAdb } from "../hooks/useAdb";
import { GlassPanel } from "./ui/GlassPanel";
import { StatusIndicator } from "./ui/StatusIndicator";
import { IconButton } from "./ui/IconButton";

// ── DeviceCard (Premium) ──────────────────────────────────────────────────────

interface DeviceCardProps {
  device: AdbDevice;
  info?: DeviceInfo | null;
  isSelected: boolean;
  onSelect: () => void;
}

function DeviceCard({ device, info, isSelected, onSelect }: DeviceCardProps) {
  const isReady = device.state === "device";
  const statusMap: Record<string, "connected" | "disconnected" | "unauthorized" | "error"> = {
    device: "connected",
    offline: "disconnected",
    unauthorized: "unauthorized",
    unknown: "error",
  };

  return (
    <motion.button
      onClick={onSelect}
      disabled={!isReady}
      layout
      whileHover={isReady ? { scale: 1.02 } : {}}
      whileTap={isReady ? { scale: 0.98 } : {}}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      style={{
        width: "100%",
        padding: "14px 16px",
        borderRadius: "var(--radius-md)",
        border: `1px solid ${
          isSelected ? "rgba(59,130,246,0.5)" : "var(--color-border)"
        }`,
        background: isSelected
          ? "rgba(59,130,246,0.1)"
          : "var(--color-surface)",
        cursor: isReady ? "pointer" : "not-allowed",
        opacity: isReady ? 1 : 0.5,
        display: "flex",
        alignItems: "center",
        gap: 14,
        textAlign: "left",
        transition: "border-color 0.2s ease, background 0.2s ease",
      }}
    >
      {/* Device icon */}
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 11,
          background: isSelected
            ? "rgba(59,130,246,0.15)"
            : "rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontSize: 20,
          transition: "background 0.2s ease",
        }}
      >
        {device.connection_type === "wireless" ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: isSelected ? "#3B82F6" : "rgba(255,255,255,0.5)" }}>
            <path d="M5 12.55a11 11 0 0 1 14.08 0" />
            <path d="M1.42 9a16 16 0 0 1 21.16 0" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: isSelected ? "#3B82F6" : "rgba(255,255,255,0.5)" }}>
            <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" />
          </svg>
        )}
      </div>

      {/* Device info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: "var(--color-text-primary)",
            marginBottom: 3,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {info
            ? `${info.manufacturer} ${info.model}`
            : device.serial}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--color-text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {info
            ? `Android ${info.android_version} · ${info.screen_width}×${info.screen_height}`
            : device.connection_type === "wireless"
            ? "Wireless"
            : "USB"}
        </div>
      </div>

      {/* Status indicator */}
      <StatusIndicator
        status={statusMap[device.state] ?? "error"}
        size={7}
        showLabel
      />
    </motion.button>
  );
}

// ── Unauthorized Guide ────────────────────────────────────────────────────────

function UnauthorizedGuide() {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
    >
      <GlassPanel
        variant="accent"
        padding="12px 14px"
        style={{
          background: "rgba(249,115,22,0.08)",
          border: "1px solid rgba(249,115,22,0.2)",
        }}
      >
        <div style={{ fontSize: 12, color: "rgba(249,115,22,0.9)", lineHeight: 1.6 }}>
          <strong>💡 Perlu izin:</strong> Buka HP → notif "Allow USB Debugging" → tap
          <strong> Allow</strong>
        </div>
      </GlassPanel>
    </motion.div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <GlassPanel padding="32px 16px" style={{ textAlign: "center" }}>
      <motion.div
        className="animate-float"
        style={{ fontSize: 40, marginBottom: 16, opacity: 0.6 }}
      >
        📱
      </motion.div>
      <div
        style={{
          fontSize: 14,
          color: "var(--color-text-secondary)",
          marginBottom: 8,
          fontWeight: 500,
        }}
      >
        Tidak ada perangkat
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--color-text-muted)",
          lineHeight: 1.7,
        }}
      >
        Hubungkan HP via <strong>USB</strong> dan aktifkan
        <br />
        <strong>USB Debugging</strong>
        <br />
        <span style={{ opacity: 0.6 }}>
          Settings → Developer Options → USB Debugging
        </span>
      </div>
    </GlassPanel>
  );
}

// ── Scanning Indicator ───────────────────────────────────────────────────────

function ScanningIndicator() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        padding: "8px 0",
      }}
    >
      <StatusIndicator status="scanning" size={6} />
      <span style={{ fontSize: 12, color: "var(--color-text-muted)" }}>
        Mencari perangkat...
      </span>
    </div>
  );
}

// ── Main DeviceList ──────────────────────────────────────────────────────────

interface DeviceListProps {
  onStartMirroring?: (serial: string) => void;
  adb: ReturnType<typeof useAdb>;
}

export function DeviceList({ onStartMirroring, adb }: DeviceListProps) {
  const {
    devices,
    selectedDevice,
    deviceInfo,
    isScanning,
    error,
    serverReady,
    selectDevice,
    refresh,
  } = adb;

  const hasUnauthorized = devices.some((d) => d.state === "unauthorized");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "var(--color-text-primary)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Perangkat
            {serverReady && (
              <span
                style={{
                  fontSize: 11,
                  padding: "1px 6px",
                  borderRadius: 4,
                  background: "rgba(34,197,94,0.12)",
                  color: "#22C55E",
                }}
              >
                ADB Ready
              </span>
            )}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--color-text-muted)",
              marginTop: 2,
            }}
          >
            {!serverReady
              ? "Menginisialisasi..."
              : `${devices.length} perangkat terdeteksi`}
          </div>
        </div>

        <IconButton
          icon="↻"
          tooltip="Refresh"
          size="sm"
          variant="ghost"
          onClick={refresh}
          disabled={isScanning || !serverReady}
        />
      </div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <GlassPanel
              variant="accent"
              padding="10px 14px"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <div style={{ fontSize: 12, color: "rgba(239,68,68,0.9)" }}>
                {error}
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unauthorized guide */}
      <AnimatePresence>{hasUnauthorized && <UnauthorizedGuide />}</AnimatePresence>

      {/* Scanning indicator */}
      {isScanning && devices.length === 0 && <ScanningIndicator />}

      {/* Device list */}
      {devices.length === 0 && !isScanning && serverReady ? (
        <EmptyState />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <AnimatePresence>
            {devices.map((device) => (
              <DeviceCard
                key={device.serial}
                device={device}
                info={
                  selectedDevice?.serial === device.serial
                    ? deviceInfo
                    : null
                }
                isSelected={selectedDevice?.serial === device.serial}
                onSelect={() => selectDevice(device)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Start Mirroring CTA */}
      <AnimatePresence>
        {selectedDevice && selectedDevice.state === "device" && onStartMirroring && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
          >
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onStartMirroring(selectedDevice.serial)}
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "var(--radius-md)",
                border: "none",
                background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
                color: "white",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 4px 16px rgba(59,130,246,0.3)",
              }}
            >
              <span>▶</span>
              Mulai Mirroring
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}