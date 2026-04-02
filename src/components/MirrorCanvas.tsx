import { useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MirrorCanvasProps {
  /** Is stream active */
  isStreaming: boolean;
  /** Device serial or name */
  deviceName?: string;
}

export function MirrorCanvas({
  isStreaming,
  deviceName,
}: MirrorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "radial-gradient(circle at center, #1a1a1a 0%, #000 100%)",
        borderRadius: "var(--radius-lg)",
        position: "relative",
        border: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <AnimatePresence mode="wait">
        {isStreaming ? (
          <motion.div
            key="streaming"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 24,
              textAlign: "center",
              padding: 40,
            }}
          >
            {/* Animated Status Ring */}
            <div style={{ position: "relative" }}>
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.2, 0.4, 0.2],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{
                  position: "absolute",
                  inset: -10,
                  borderRadius: "50%",
                  background: "var(--color-accent)",
                  filter: "blur(20px)",
                }}
              />
              <div 
                style={{ 
                  width: 80, 
                  height: 80, 
                  borderRadius: "50%", 
                  background: "var(--color-surface-bright)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 32,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  position: "relative",
                  zIndex: 1,
                }}
              >
                📡
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <h2 style={{ 
                fontSize: 18, 
                fontWeight: 600, 
                color: "var(--color-text-primary)",
                margin: 0
              }}>
                Mirroring Aktif
              </h2>
              <p style={{ 
                fontSize: 14, 
                color: "var(--color-text-secondary)",
                maxWidth: 240,
                lineHeight: "1.5",
                margin: 0
              }}>
                Tampilan sedang diputar di jendela native {deviceName ? `(${deviceName})` : ""} untuk performa maksimal.
              </p>
              <p style={{ 
                fontSize: 11,
                color: "var(--color-accent)",
                marginTop: 4,
                opacity: 0.8
              }}>
                💡 Tip: Tekan <b>Alt + R</b> pada jendela HP untuk merekam secara native.
              </p>
            </div>

            <div style={{
              padding: "8px 16px",
              borderRadius: 30,
              background: "rgba(52, 211, 153, 0.1)",
              border: "1px solid rgba(52, 211, 153, 0.2)",
              color: "#34D399",
              fontSize: 12,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <motion.div 
                animate={{ opacity: [1, 0.4, 1] }} 
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399" }} 
              />
              ANDROID 15 COMPATIBLE MODE
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              color: "rgba(255,255,255,0.2)",
            }}
          >
            <div style={{ fontSize: 64, filter: "grayscale(1) opacity(0.3)" }}>📱</div>
            <div style={{ fontSize: 13, letterSpacing: "0.05em", fontWeight: 500 }}>
              SIAP UNTUK KONEKSI
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decorative background grid */}
      <div 
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)",
          backgroundSize: "30px 30px",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
