// src/hooks/useAdb.ts
// Custom hook untuk semua interaksi dengan ADB dari sisi React

import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useRef, useState } from "react";

let serverInitStarted = false;

// ─── Types (mirror dari Rust structs) ────────────────────────────────────────

export type DeviceState = "device" | "offline" | "unauthorized" | "unknown";
export type ConnectionType = "usb" | "wireless";

export interface AdbDevice {
  serial: string;
  state: DeviceState;
  connection_type: ConnectionType;
}

export interface DeviceInfo {
  serial: string;
  model: string;
  manufacturer: string;
  android_version: string;
  sdk_version: string;
  screen_width: number;
  screen_height: number;
  screen_density: number;
}

export interface AdbError {
  code: string;
  message: string;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = 2000; // scan setiap 2 detik

export function useAdb() {
  const [devices, setDevices] = useState<AdbDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<AdbDevice | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverReady, setServerReady] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevSerials = useRef<Set<string>>(new Set());

  // ── Start ADB server saat hook pertama kali mount ──────────────────────────
  useEffect(() => {
    const initServer = async () => {
      if (serverInitStarted) {
        setServerReady(true);
        return;
      }
      serverInitStarted = true;

      try {
        await invoke<string>("start_adb_server");
        setServerReady(true);
      } catch (e: unknown) {
        const err = e as AdbError;
        setError(`Gagal start ADB server: ${err?.message ?? "Unknown error"}. Pastikan ADB terinstall.`);
        serverInitStarted = false;
      }
    };
    initServer();
  }, []);

  // ── Fungsi scan manual ──────────────────────────────────────────────────────
  const scanDevices = useCallback(async () => {
    if (!serverReady) return;

    setIsScanning(true);
    setError(null);

    try {
      const found = await invoke<AdbDevice[]>("list_devices");
      setDevices(found);

      // Deteksi device baru yang baru connect (untuk notif)
      const newSerials = new Set(found.map((d) => d.serial));
      const newlyConnected = found.filter(
        (d) => !prevSerials.current.has(d.serial) && d.state === "device"
      );
      prevSerials.current = newSerials;

      // Auto-select device pertama yang ready jika belum ada yang dipilih
      if (!selectedDevice && newlyConnected.length > 0) {
        setSelectedDevice(newlyConnected[0]);
      }

      // Jika device yang dipilih disconnect, deselect
      if (selectedDevice && !newSerials.has(selectedDevice.serial)) {
        setSelectedDevice(null);
        setDeviceInfo(null);
      }

      return newlyConnected; // caller bisa pakai ini untuk notif
    } catch (e: unknown) {
      const err = e as AdbError;
      setError(err?.message ?? "Gagal scan device");
      return [];
    } finally {
      setIsScanning(false);
    }
  }, [serverReady, selectedDevice]);

  // ── Auto-polling ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!serverReady) return;

    // Scan langsung saat server ready
    scanDevices();

    // Kemudian poll setiap POLL_INTERVAL_MS
    pollRef.current = setInterval(() => {
      scanDevices();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [serverReady, scanDevices]);

  // ── Ambil info detail device saat dipilih ──────────────────────────────────
  useEffect(() => {
    if (!selectedDevice || selectedDevice.state !== "device") {
      setDeviceInfo(null);
      return;
    }

    const fetchInfo = async () => {
      try {
        const info = await invoke<DeviceInfo>("get_device_info", {
          serial: selectedDevice.serial,
        });
        setDeviceInfo(info);
      } catch {
        // Tidak perlu error state — info adalah bonus, bukan blocker
        setDeviceInfo(null);
      }
    };

    fetchInfo();
  }, [selectedDevice]);

  return {
    // State
    devices,
    selectedDevice,
    deviceInfo,
    isScanning,
    error,
    serverReady,

    // Actions
    selectDevice: setSelectedDevice,
    refresh: scanDevices,
  };
}

