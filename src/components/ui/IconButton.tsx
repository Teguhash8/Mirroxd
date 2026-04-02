// ─── IconButton Component ─────────────────────────────────────────────────────
// Reusable icon button with hover/press animations

import { motion } from "framer-motion";
import type { ReactNode, CSSProperties } from "react";

interface IconButtonProps {
  icon: ReactNode;
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "ghost" | "default" | "accent" | "danger";
  size?: "sm" | "md" | "lg";
  tooltip?: string;
  style?: CSSProperties;
}

const SIZE_MAP = {
  sm: { button: 32, icon: 14, radius: 8 },
  md: { button: 38, icon: 16, radius: 10 },
  lg: { button: 44, icon: 18, radius: 12 },
};

const VARIANT_STYLES: Record<string, { bg: string; bgHover: string; color: string }> = {
  ghost: {
    bg: "transparent",
    bgHover: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.6)",
  },
  default: {
    bg: "rgba(255,255,255,0.06)",
    bgHover: "rgba(255,255,255,0.12)",
    color: "rgba(255,255,255,0.8)",
  },
  accent: {
    bg: "rgba(59,130,246,0.15)",
    bgHover: "rgba(59,130,246,0.25)",
    color: "#3B82F6",
  },
  danger: {
    bg: "rgba(239,68,68,0.12)",
    bgHover: "rgba(239,68,68,0.2)",
    color: "#EF4444",
  },
};

export function IconButton({
  icon,
  label,
  onClick,
  disabled = false,
  variant = "default",
  size = "md",
  tooltip,
  style,
}: IconButtonProps) {
  const sizeConfig = SIZE_MAP[size];
  const variantConfig = VARIANT_STYLES[variant];

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      whileHover={disabled ? {} : { scale: 1.05, backgroundColor: variantConfig.bgHover }}
      whileTap={disabled ? {} : { scale: 0.95 }}
      transition={{ duration: 0.15 }}
      style={{
        width: label ? "auto" : sizeConfig.button,
        height: sizeConfig.button,
        borderRadius: sizeConfig.radius,
        border: "none",
        background: variantConfig.bg,
        color: variantConfig.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        fontSize: sizeConfig.icon,
        padding: label ? "0 12px" : 0,
        fontWeight: 500,
        fontFamily: "inherit",
        transition: "opacity 0.15s ease",
        ...style,
      }}
    >
      <span style={{ display: "flex", alignItems: "center", fontSize: sizeConfig.icon }}>
        {icon}
      </span>
      {label && (
        <span style={{ fontSize: sizeConfig.icon - 2, whiteSpace: "nowrap" }}>
          {label}
        </span>
      )}
    </motion.button>
  );
}
