// ─── StreamSettings Component ─────────────────────────────────────────────────
// Panel untuk konfigurasi streaming: bitrate, resolusi, FPS

import { motion } from "framer-motion";
import { GlassPanel } from "./ui/GlassPanel";
import type { ScrcpyConfig } from "../hooks/useScrcpy";

interface StreamSettingsProps {
  config: ScrcpyConfig;
  onUpdate: (config: Partial<ScrcpyConfig>) => void;
  isStreaming: boolean;
}

const BITRATE_OPTIONS = [
  { label: "1 Mbps", value: 1_000_000, description: "Hemat bandwidth" },
  { label: "2 Mbps", value: 2_000_000, description: "Default — seimbang" },
  { label: "4 Mbps", value: 4_000_000, description: "Kualitas tinggi" },
  { label: "8 Mbps", value: 8_000_000, description: "Maksimal" },
];

const RESOLUTION_OPTIONS = [
  { label: "Asli", value: 0, description: "Resolusi device" },
  { label: "1080p", value: 1080, description: "Full HD" },
  { label: "720p", value: 720, description: "HD — ringan" },
  { label: "480p", value: 480, description: "Hemat resource" },
];

const FPS_OPTIONS = [
  { label: "30 FPS", value: 30, description: "Default" },
  { label: "60 FPS", value: 60, description: "Halus" },
];

export function StreamSettings({ config, onUpdate, isStreaming }: StreamSettingsProps) {
  return (
    <GlassPanel padding="16px">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16 }}>⚙️</span>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--color-text-primary)",
            }}
          >
            Pengaturan Stream
          </span>
          {isStreaming && (
            <span
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 6,
                background: "rgba(245,158,11,0.15)",
                color: "#F59E0B",
                marginLeft: "auto",
              }}
            >
              Restart diperlukan
            </span>
          )}
        </div>

        {/* Bitrate */}
        <SettingGroup label="Bitrate" icon="📶">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {BITRATE_OPTIONS.map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                description={opt.description}
                isActive={config.bitrate === opt.value}
                onClick={() => onUpdate({ bitrate: opt.value })}
              />
            ))}
          </div>
        </SettingGroup>

        {/* Resolusi */}
        <SettingGroup label="Resolusi Maks" icon="🖥️">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {RESOLUTION_OPTIONS.map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                description={opt.description}
                isActive={config.max_width === opt.value}
                onClick={() => onUpdate({ max_width: opt.value })}
              />
            ))}
          </div>
        </SettingGroup>

        {/* FPS */}
        <SettingGroup label="Frame Rate" icon="🎞️">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {FPS_OPTIONS.map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                description={opt.description}
                isActive={config.max_fps === opt.value}
                onClick={() => onUpdate({ max_fps: opt.value })}
              />
            ))}
          </div>
        </SettingGroup>
      </div>
    </GlassPanel>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

function SettingGroup({
  label,
  icon,
  children,
}: {
  label: string;
  icon: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 12,
          color: "var(--color-text-secondary)",
          fontWeight: 500,
        }}
      >
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}

function OptionButton({
  label,
  description,
  isActive,
  onClick,
}: {
  label: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      style={{
        padding: "8px 10px",
        borderRadius: "var(--radius-sm)",
        border: `1px solid ${isActive ? "var(--color-border-active)" : "var(--color-border)"}`,
        background: isActive ? "var(--color-accent-soft)" : "var(--color-surface)",
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        transition: "all 0.15s ease",
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: isActive ? "var(--color-accent)" : "var(--color-text-primary)",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 10,
          color: "var(--color-text-muted)",
        }}
      >
        {description}
      </span>
    </motion.button>
  );
}
