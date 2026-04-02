// ─── RecordingPanel Component ─────────────────────────────────────────────────
// Panel untuk browse, preview, dan manage rekaman

import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { motion, AnimatePresence } from "framer-motion";
import { GlassPanel } from "./ui/GlassPanel";
import { IconButton } from "./ui/IconButton";

interface RecordingFile {
  name: string;
  path: string;
  size_bytes: number;
  created_at: string;
  duration_secs: number | null;
}

export function RecordingPanel() {
  const [recordings, setRecordings] = useState<RecordingFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<RecordingFile | null>(null);
  const [gpuInfo, setGpuInfo] = useState<string>("software");

  // Load recordings on mount
  const loadRecordings = useCallback(async () => {
    setIsLoading(true);
    try {
      const files = await invoke<RecordingFile[]>("list_recordings");
      setRecordings(files);
    } catch {
      console.error("Gagal load recordings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecordings();
  }, [loadRecordings]);

  // Detect GPU
  useEffect(() => {
    invoke<string>("detect_gpu")
      .then((gpu) => setGpuInfo(gpu))
      .catch(() => {});
  }, []);

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
            }}
          >
            Rekaman
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 2 }}>
            {recordings.length} file · GPU: {gpuInfo}
          </div>
        </div>
        <IconButton
          icon="↻"
          tooltip="Refresh"
          size="sm"
          variant="ghost"
          onClick={loadRecordings}
        />
      </div>

      {/* List */}
      {isLoading ? (
        <GlassPanel padding="32px" style={{ textAlign: "center" }}>
          <div className="animate-shimmer" style={{ height: 60, borderRadius: 8 }} />
        </GlassPanel>
      ) : recordings.length === 0 ? (
        <GlassPanel padding="32px" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>🎬</div>
          <div style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            Belum ada rekaman.
          </div>
          <div style={{ fontSize: 12, color: "var(--color-text-muted)", marginTop: 4 }}>
            Mulai mirroring dan tekan tombol rekam.
          </div>
        </GlassPanel>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <AnimatePresence>
            {recordings.map((file, i) => (
              <motion.div
                key={file.path}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: i * 0.05 }}
              >
                <RecordingItem
                  file={file}
                  isSelected={selectedFile?.path === file.path}
                  onSelect={() =>
                    setSelectedFile(
                      selectedFile?.path === file.path ? null : file
                    )
                  }
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Export panel for selected file */}
      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <ExportOptions file={selectedFile} gpuInfo={gpuInfo} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── RecordingItem ───────────────────────────────────────────────────────────

function RecordingItem({
  file,
  isSelected,
  onSelect,
}: {
  file: RecordingFile;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.button
      onClick={onSelect}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      style={{
        width: "100%",
        padding: "10px 12px",
        borderRadius: "var(--radius-md)",
        border: `1px solid ${isSelected ? "var(--color-border-active)" : "var(--color-border)"}`,
        background: isSelected ? "var(--color-accent-soft)" : "var(--color-surface)",
        display: "flex",
        alignItems: "center",
        gap: 10,
        textAlign: "left",
        cursor: "pointer",
        transition: "all 0.15s ease",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: "rgba(255,255,255,0.06)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 16,
          flexShrink: 0,
        }}
      >
        🎥
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: "var(--color-text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {file.name}
        </div>
        <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
          {formatFileSize(file.size_bytes)} · {file.created_at}
        </div>
      </div>
    </motion.button>
  );
}

// ── ExportOptions ───────────────────────────────────────────────────────────

function ExportOptions({
  file,
  gpuInfo,
}: {
  file: RecordingFile;
  gpuInfo: string;
}) {
  const [exporting, setExporting] = useState(false);
  const [resolution, setResolution] = useState("original");
  const [encoder, setEncoder] = useState(
    gpuInfo === "nvidia"
      ? "h264_nvenc"
      : gpuInfo === "amd"
      ? "h264_amf" // Use h264_amf default
      : gpuInfo === "intel"
      ? "h264_qsv"
      : "libx264"
  );
  const [trimStart, setTrimStart] = useState("00:00:00");
  const [trimEnd, setTrimEnd] = useState("");

  const handleExport = async () => {
    setExporting(true);
    try {
      const outputPath = file.path.replace(/\.[^.]+$/, `_exported.mp4`);
      await invoke("export_recording", {
        inputPath: file.path,
        outputPath,
        encoder,
        resolution: resolution === "original" ? null : resolution,
      });
    } catch (e) {
      console.error("Export failed:", e);
    } finally {
      setExporting(false);
    }
  };

  const handleTrim = async () => {
    if (!trimStart || !trimEnd) return;
    setExporting(true);
    try {
      const outputPath = file.path.replace(/\.[^.]+$/, `_trimmed.mp4`);
      await invoke("trim_video", {
        inputPath: file.path,
        outputPath,
        startTime: trimStart,
        endTime: trimEnd,
      });
    } catch (e) {
      console.error("Trim failed:", e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <GlassPanel variant="accent" padding="14px">
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-accent)" }}>
          Media Options: {file.name}
        </div>

        {/* Trim Options */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, paddingBottom: 8, borderBottom: "1px solid var(--color-border)" }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4, display: "block" }}>
              Start Time (HH:MM:SS)
            </label>
            <input
              type="text"
              value={trimStart}
              onChange={(e) => setTrimStart(e.target.value)}
              placeholder="00:00:00"
              style={{
                width: "100%", padding: "6px 8px", borderRadius: 6,
                border: "1px solid var(--color-border)", background: "var(--color-surface)",
                color: "var(--color-text-primary)", fontSize: 12,
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4, display: "block" }}>
              End Time (HH:MM:SS)
            </label>
            <input
              type="text"
              value={trimEnd}
              onChange={(e) => setTrimEnd(e.target.value)}
              placeholder="00:00:10"
              style={{
                width: "100%", padding: "6px 8px", borderRadius: 6,
                border: "1px solid var(--color-border)", background: "var(--color-surface)",
                color: "var(--color-text-primary)", fontSize: 12,
              }}
            />
          </div>
          <div style={{ gridColumn: "span 2" }}>
             <motion.button
              onClick={handleTrim}
              disabled={exporting || !trimEnd}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: "100%", padding: "8px 16px", borderRadius: "var(--radius-sm)",
                border: "none", background: "var(--color-orange)", color: "white",
                fontSize: 13, fontWeight: 500, cursor: exporting || !trimEnd ? "not-allowed" : "pointer",
                opacity: (exporting || !trimEnd) ? 0.7 : 1,
              }}
            >
              Cukur Video (Trim) ✂️
            </motion.button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4, display: "block" }}>
              Resolusi
            </label>
            <select
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text-primary)",
                fontSize: 12,
              }}
            >
              <option value="original">Asli</option>
              <option value="1920:1080">1080p</option>
              <option value="1280:720">720p</option>
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--color-text-muted)", marginBottom: 4, display: "block" }}>
              Encoder
            </label>
            <select
              value={encoder}
              onChange={(e) => setEncoder(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                color: "var(--color-text-primary)",
                fontSize: 12,
              }}
            >
              <option value="copy">Copy (no re-encode)</option>
              <option value="libx264">Software (x264)</option>
              {gpuInfo === "nvidia" && <option value="h264_nvenc">NVIDIA NVENC</option>}
              {gpuInfo === "amd" && <option value="h264_amf">AMD AMF</option>}
              {gpuInfo === "intel" && <option value="h264_qsv">Intel QSV</option>}
            </select>
          </div>
        </div>

        <motion.button
          onClick={handleExport}
          disabled={exporting}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          style={{
            padding: "8px 16px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            background: "var(--color-accent)",
            color: "white",
            fontSize: 13,
            fontWeight: 500,
            cursor: exporting ? "wait" : "pointer",
            opacity: exporting ? 0.7 : 1,
          }}
        >
          {exporting ? "Memproses..." : "Export →"}
        </motion.button>
      </div>
    </GlassPanel>
  );
}

// ── Utils ───────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
