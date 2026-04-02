// ─── GlassPanel Component ─────────────────────────────────────────────────────
// Glassmorphism panel with blur backdrop and subtle border
// Usage: <GlassPanel>content</GlassPanel>

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

interface GlassPanelProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  variant?: "default" | "strong" | "accent";
  padding?: string;
  noBorder?: boolean;
}

export function GlassPanel({
  children,
  variant = "default",
  padding = "16px",
  noBorder = false,
  style,
  ...motionProps
}: GlassPanelProps) {
  const variants = {
    default: {
      background: "rgba(255, 255, 255, 0.05)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: noBorder ? "none" : "1px solid rgba(255, 255, 255, 0.08)",
    },
    strong: {
      background: "rgba(255, 255, 255, 0.08)",
      backdropFilter: "blur(30px)",
      WebkitBackdropFilter: "blur(30px)",
      border: noBorder ? "none" : "1px solid rgba(255, 255, 255, 0.12)",
    },
    accent: {
      background: "rgba(59, 130, 246, 0.08)",
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: noBorder
        ? "none"
        : "1px solid rgba(59, 130, 246, 0.25)",
    },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      style={{
        borderRadius: "var(--radius-lg)",
        padding,
        ...variants[variant],
        ...style,
      }}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
}
