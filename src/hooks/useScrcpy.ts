// src/hooks/useScrcpy.ts
// Hook untuk mengelola koneksi streaming scrcpy dan state mirroring

import { invoke } from "@tauri-apps/api/core";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { listen } from "@tauri-apps/api/event";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Types ──────────────────────────────────────────────────────────────────

export type StreamState =
  | "idle"
  | "starting"
  | "streaming"
  | "reconnecting"
  | "stopped"
  | "error";

export interface ScrcpyConfig {
  bitrate: number;
  max_width: number;
  max_fps: number;
  codec: string;
}

export interface StreamStatus {
  state: StreamState;
  serial: string | null;
  config: ScrcpyConfig;
  error: string | null;
}

export interface RecordingStatus {
  state: "idle" | "recording" | "processing" | "done" | "error";
  output_path: string | null;
  duration_secs: number;
  file_size_bytes: number;
  error: string | null;
}

// ─── Default config ─────────────────────────────────────────────────────────

const DEFAULT_CONFIG: ScrcpyConfig = {
  bitrate: 2_000_000,
  max_width: 0,
  max_fps: 30,
  codec: "h264",
};

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useScrcpy() {
  const [streamState, setStreamState] = useState<StreamState>("idle");
  const [config, setConfig] = useState<ScrcpyConfig>(DEFAULT_CONFIG);
  const [error, setError] = useState<string | null>(null);
  const [currentSerial, setCurrentSerial] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus | null>(null);

  // ── Listen to Tauri events ──────────────────────────────────────────────
  useEffect(() => {
    const unlistenState = listen<StreamStatus>("scrcpy-state", (event) => {
      setStreamState(event.payload.state);
      setCurrentSerial(event.payload.serial);
      if (event.payload.error) {
        setError(event.payload.error);
      }
    });

    const unlistenRecording = listen<RecordingStatus>("recording-status", (event) => {
      setRecordingStatus(event.payload);
      setIsRecording(event.payload.state === "recording");
    });

    return () => {
      unlistenState.then((fn) => fn());
      unlistenRecording.then((fn) => fn());
    };
  }, []);

  // ── Start mirroring ─────────────────────────────────────────────────────
  const startMirroring = useCallback(
    async (serial: string) => {
      setError(null);
      setStreamState("starting");
      setCurrentSerial(serial);

      try {
        const status = await invoke<StreamStatus>("start_scrcpy", {
          serial,
          config,
        });
        setStreamState(status.state);
        
        // Munculkan tauri toolbar
        try {
            const t = await WebviewWindow.getByLabel("toolbar");
            if (t) {
                await t.show();
            }
        } catch (e) {
            console.warn("Gagal memunculkan toolbar:", e);
        }
      } catch (e: unknown) {
        const err = e as { code?: string; message?: string };
        setError(err?.message ?? "Gagal memulai mirroring");
        setStreamState("error");
      }
    },
    [config]
  );

  // ── Stop mirroring ──────────────────────────────────────────────────────
  const stopMirroring = useCallback(async () => {
    try {
      await invoke("stop_scrcpy");
      setStreamState("idle");
      setCurrentSerial(null);

      // Sembunyikan tauri toolbar
      try {
          const t = await WebviewWindow.getByLabel("toolbar");
          if (t) {
              await t.hide();
          }
      } catch (e) {
          // ignore
      }
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? "Gagal stop mirroring");
    }
  }, []);

  // ── Update config ───────────────────────────────────────────────────────
  const updateConfig = useCallback(async (newConfig: Partial<ScrcpyConfig>) => {
    const merged = { ...config, ...newConfig };
    setConfig(merged);
    try {
      await invoke("set_scrcpy_config", { config: merged });
    } catch {
      // Config save failed — not critical
    }
  }, [config]);

  // ── Recording controls (Legacy/External) ────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const status = await invoke<RecordingStatus>("start_recording");
      setRecordingStatus(status);
      setIsRecording(true);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? "Gagal memulai rekaman");
    }
  }, []);

  const stopRecording = useCallback(async () => {
    try {
      const status = await invoke<RecordingStatus>("stop_recording");
      setRecordingStatus(status);
      setIsRecording(false);
    } catch (e: unknown) {
      const err = e as { message?: string };
      setError(err?.message ?? "Gagal stop rekaman");
    }
  }, []);

  // ── Input forwarding (Legacy/Optional for UI buttons) ───────────────────
  const sendTouch = useCallback(
    async (x: number, y: number, action: string = "tap") => {
      if (!currentSerial) return;
      try {
        await invoke("send_touch_event", {
          serial: currentSerial,
          x: Math.round(x),
          y: Math.round(y),
          action,
        });
      } catch {
        // Touch input failed — non-critical
      }
    },
    [currentSerial]
  );

  const sendKey = useCallback(
    async (keycode: number) => {
      if (!currentSerial) return;
      try {
        await invoke("send_key_event", {
          serial: currentSerial,
          keycode,
        });
      } catch {
        // Key event failed — non-critical
      }
    },
    [currentSerial]
  );

  const reconnectAttempts = useRef(0);

  // ── Auto-reconnect ─────────────────────────────────────────────────────
  useEffect(() => {
    if (streamState === "stopped" && currentSerial) {
      if (reconnectAttempts.current >= 3) {
        setError("Sambungan terus terputus. Jendela mungkin ditutup secara manual.");
        setStreamState("error");
        return;
      }
      reconnectAttempts.current += 1;

      const timer = setTimeout(() => {
        setStreamState("reconnecting");
        startMirroring(currentSerial);
      }, 3000);
      return () => clearTimeout(timer);
    } else if (streamState === "streaming") {
      reconnectAttempts.current = 0;
    }
  }, [streamState, currentSerial, startMirroring]);

  return {
    streamState,
    config,
    error,
    currentSerial,
    isRecording,
    recordingStatus,
    startMirroring,
    stopMirroring,
    updateConfig,
    startRecording,
    stopRecording,
    sendTouch,
    sendKey,
  };
}
