// ─── StatusIndicator Component ────────────────────────────────────────────────
// Animated status dot with optional pulse ring

import { motion } from "framer-motion";

interface StatusIndicatorProps {
  status: "connected" | "scanning" | "disconnected" | "unauthorized" | "error";
  size?: number;
  showLabel?: boolean;
}

const STATUS_CONFIG: Record<string, { color: string; label: string; pulse: boolean }> = {
  connected: { color: "#22C55E", label: "Terhubung", pulse: false },
  scanning: { color: "#3B82F6", label: "Mencari...", pulse: true },
  disconnected: { color: "#6B7280", label: "Terputus", pulse: false },
  unauthorized: { color: "#F97316", label: "Perlu Izin", pulse: true },
  error: { color: "#EF4444", label: "Error", pulse: false },
};

export function StatusIndicator({
  status,
  size = 8,
  showLabel = false,
}: StatusIndicatorProps) {
  const config = STATUS_CONFIG[status];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div style={{ position: "relative", width: size * 2.5, height: size * 2.5, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* Pulse ring */}
        {config.pulse && (
          <motion.div
            animate={{
              scale: [1, 2.2],
              opacity: [0.6, 0],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeOut",
            }}
            style={{
              position: "absolute",
              width: size,
              height: size,
              borderRadius: "50%",
              background: config.color,
            }}
          />
        )}

        {/* Main dot */}
        <motion.div
          animate={config.pulse ? {
            scale: [1, 1.15, 1],
          } : {}}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            background: config.color,
            boxShadow: `0 0 ${size}px ${config.color}60`,
            position: "relative",
            zIndex: 1,
          }}
        />
      </div>

      {showLabel && (
        <span style={{ fontSize: 12, color: config.color, fontWeight: 500 }}>
          {config.label}
        </span>
      )}
    </div>
  );
}
