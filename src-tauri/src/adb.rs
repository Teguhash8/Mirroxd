// src-tauri/src/adb.rs
// Semua logic ADB ada di sini — device listing, info, server management

use serde::{Deserialize, Serialize};
use std::process::Command;
use tauri::command;

// ─── Structs ────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AdbDevice {
    pub serial: String, // misal: "emulator-5554" atau "192.168.1.5:5555"
    pub state: DeviceState,
    pub connection_type: ConnectionType,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum DeviceState {
    Device,       // terhubung dan siap
    Offline,      // terdeteksi tapi tidak responsif
    Unauthorized, // perlu konfirmasi di HP (Allow USB Debugging)
    Unknown,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum ConnectionType {
    Usb,
    Wireless, // format serial: IP:port
}

#[derive(Debug, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub serial: String,
    pub model: String,           // misal: "Pixel 7"
    pub manufacturer: String,    // misal: "Google"
    pub android_version: String, // misal: "14"
    pub sdk_version: String,     // misal: "34"
    pub screen_width: u32,
    pub screen_height: u32,
    pub screen_density: u32,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct AdbError {
    pub code: String,
    pub message: String,
}

// ─── Helper: Path ke ADB binary ─────────────────────────────────────────────

/// Mengembalikan path ke ADB binary yang di-bundle dengan app.
/// Di development, gunakan system ADB. Di production, gunakan sidecar.
fn get_adb_path() -> String {
    // 1. Coba system ADB terlebih dahulu.
    // Ini penting agar tidak terjadi bentrok daemon (port 5037) jika user sudah
    // menjalankan ADB dari Android Studio atau terminal (versi berbeda akan saling kill).
    if let Ok(output) = std::process::Command::new("adb").arg("version").output() {
        if output.status.success() {
            return "adb".to_string();
        }
    }

    // 2. Fallback: gunakan binary yang ada di folder binaries project
    if cfg!(debug_assertions) {
        let project_adb = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join("adb-x86_64-pc-windows-msvc.exe");

        if project_adb.exists() {
            return project_adb.to_string_lossy().to_string();
        }

        "adb".to_string()
    } else {
        // Production: ambil dari folder di samping executable
        let exe_dir = std::env::current_exe()
            .unwrap()
            .parent()
            .unwrap()
            .to_path_buf();

        #[cfg(target_os = "windows")]
        let adb_path = exe_dir
            .join("binaries")
            .join("adb-x86_64-pc-windows-msvc.exe");
        #[cfg(not(target_os = "windows"))]
        let adb_path = exe_dir.join("binaries").join("adb");

        adb_path.to_string_lossy().to_string()
    }
}

/// Jalankan perintah ADB dan return stdout sebagai String
fn run_adb(args: &[&str]) -> Result<String, AdbError> {
    let adb = get_adb_path();

    let output = Command::new(&adb)
        .args(args)
        .output()
        .map_err(|e| AdbError {
            code: "ADB_NOT_FOUND".to_string(),
            message: format!("Tidak bisa menjalankan ADB: {}. Pastikan ADB terinstall atau bundle binary sudah benar.", e),
        })?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        Err(AdbError {
            code: "ADB_COMMAND_FAILED".to_string(),
            message: stderr,
        })
    }
}

/// Jalankan `adb -s <serial> shell <command>` — untuk perintah spesifik ke device
fn run_adb_shell(serial: &str, shell_cmd: &str) -> Result<String, AdbError> {
    run_adb(&["-s", serial, "shell", shell_cmd])
}

// ─── Parse `adb devices` output ─────────────────────────────────────────────

fn parse_devices_output(output: &str) -> Vec<AdbDevice> {
    let mut devices = Vec::new();

    for line in output.lines() {
        // Skip header line "List of devices attached" dan baris kosong
        if line.starts_with("List of") || line.trim().is_empty() {
            continue;
        }

        // Format: "<serial>\t<state>"
        let parts: Vec<&str> = line.splitn(2, '\t').collect();
        if parts.len() < 2 {
            continue;
        }

        let serial = parts[0].trim().to_string();
        let state_str = parts[1].trim();

        let state = match state_str {
            "device" => DeviceState::Device,
            "offline" => DeviceState::Offline,
            "unauthorized" => DeviceState::Unauthorized,
            _ => DeviceState::Unknown,
        };

        // Tentukan tipe koneksi: wireless jika serial mengandung IP:port
        // Format IP: angka.angka.angka.angka:angka
        let connection_type = if serial.contains(':') && serial.split(':').count() == 2 {
            let port = serial.split(':').last().unwrap_or("0");
            if port.parse::<u16>().is_ok() {
                ConnectionType::Wireless
            } else {
                ConnectionType::Usb
            }
        } else {
            ConnectionType::Usb
        };

        devices.push(AdbDevice {
            serial,
            state,
            connection_type,
        });
    }

    devices
}

// ─── Tauri Commands ─────────────────────────────────────────────────────────

/// Ambil daftar semua perangkat yang terdeteksi ADB.
/// Return Vec<AdbDevice> — bisa kosong jika tidak ada device.
#[command]
pub async fn list_devices() -> Result<Vec<AdbDevice>, AdbError> {
    let output = run_adb(&["devices"])?;
    let devices = parse_devices_output(&output);
    Ok(devices)
}

/// Ambil info detail dari satu device (model, resolusi, Android version, dll).
/// Membutuhkan serial dari `list_devices`.
#[command]
pub async fn get_device_info(serial: String) -> Result<DeviceInfo, AdbError> {
    // Semua property diambil sekaligus lewat getprop untuk efisiensi
    let model = run_adb_shell(&serial, "getprop ro.product.model")?
        .trim()
        .to_string();

    let manufacturer = run_adb_shell(&serial, "getprop ro.product.manufacturer")?
        .trim()
        .to_string();

    let android_version = run_adb_shell(&serial, "getprop ro.build.version.release")?
        .trim()
        .to_string();

    let sdk_version = run_adb_shell(&serial, "getprop ro.build.version.sdk")?
        .trim()
        .to_string();

    // Ambil resolusi layar: format output "Physical size: WxH"
    let size_output = run_adb_shell(&serial, "wm size")?;
    let (width, height) = parse_screen_size(&size_output);

    // Ambil DPI layar: format output "Physical density: N"
    let density_output = run_adb_shell(&serial, "wm density")?;
    let density = parse_screen_density(&density_output);

    Ok(DeviceInfo {
        serial,
        model,
        manufacturer,
        android_version,
        sdk_version,
        screen_width: width,
        screen_height: height,
        screen_density: density,
    })
}

/// Start ADB server. Harus dipanggil sekali saat app launch.
/// Jika server sudah berjalan, perintah ini tidak berbuat apa-apa (aman).
#[command]
pub async fn start_adb_server() -> Result<String, AdbError> {
    let adb = get_adb_path();

    eprintln!("[ADB DEBUG] Menggunakan binary: {}", adb);
    eprintln!(
        "[ADB DEBUG] File exists: {}",
        std::path::Path::new(&adb).exists()
    );

    let output = std::process::Command::new(&adb)
        .args(["start-server"])
        .output()
        .map_err(|e| AdbError {
            code: "ADB_NOT_FOUND".to_string(),
            message: format!("Tidak bisa jalankan ADB di path: {} — Error: {}", adb, e),
        })?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();

    eprintln!("[ADB DEBUG] start-server stdout: {}", stdout);
    eprintln!("[ADB DEBUG] start-server stderr: {}", stderr);
    eprintln!("[ADB DEBUG] exit code: {:?}", output.status.code());

    // ADB start-server sering return non-zero tapi tetap berhasil
    // Anggap sukses selama binary bisa dijalankan
    Ok(format!(
        "ADB server started. stdout={} stderr={}",
        stdout.trim(),
        stderr.trim()
    ))
}

/// Kill ADB server. Dipanggil saat app ditutup (cleanup).
#[command]
pub async fn kill_adb_server() -> Result<String, AdbError> {
    run_adb(&["kill-server"])
}

/// Tunggu sampai ada device yang connect (blocking dengan timeout).
/// `timeout_secs`: maksimal detik menunggu (0 = tunggu selamanya).
/// Berguna untuk tampilkan "Waiting for device..." state di UI.
#[command]
pub async fn wait_for_device(serial: Option<String>, timeout_secs: u32) -> Result<bool, AdbError> {
    // Clone semua data yang dibutuhkan thread SEBELUM spawn
    // Thread butuh owned data ('static), bukan reference
    let serial_owned = serial.clone();

    let result = if timeout_secs > 0 {
        let handle = std::thread::spawn(move || {
            // Bangun args di dalam thread dari owned data
            let mut args: Vec<String> = Vec::new();
            if let Some(ref s) = serial_owned {
                args.push("-s".to_string());
                args.push(s.clone());
            }
            args.push("wait-for-device".to_string());

            // Convert Vec<String> ke Vec<&str> untuk run_adb
            let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
            run_adb(&args_ref)
        });

        std::thread::sleep(std::time::Duration::from_secs(timeout_secs as u64));

        if handle.is_finished() {
            handle.join().unwrap_or(Err(AdbError {
                code: "THREAD_PANIC".to_string(),
                message: "Wait thread panicked".to_string(),
            }))
        } else {
            return Ok(false);
        }
    } else {
        // Tanpa timeout — jalankan langsung tanpa thread
        let mut args: Vec<String> = Vec::new();
        if let Some(ref s) = serial {
            args.push("-s".to_string());
            args.push(s.clone());
        }
        args.push("wait-for-device".to_string());

        let args_ref: Vec<&str> = args.iter().map(|s| s.as_str()).collect();
        run_adb(&args_ref)
    };

    match result {
        Ok(_) => Ok(true),
        Err(e) if e.code == "ADB_NOT_FOUND" => Err(e),
        Err(_) => Ok(false),
    }
}

// ─── Parse Helpers ───────────────────────────────────────────────────────────

fn parse_screen_size(output: &str) -> (u32, u32) {
    // Output: "Physical size: 1080x2340\n" atau "Override size: 1080x2340"
    for line in output.lines() {
        if line.contains("size:") {
            if let Some(size_part) = line.split(':').nth(1) {
                let parts: Vec<&str> = size_part.trim().split('x').collect();
                if parts.len() == 2 {
                    let w = parts[0].trim().parse::<u32>().unwrap_or(0);
                    let h = parts[1].trim().parse::<u32>().unwrap_or(0);
                    if w > 0 && h > 0 {
                        return (w, h);
                    }
                }
            }
        }
    }
    (1080, 1920) // default fallback
}

fn parse_screen_density(output: &str) -> u32 {
    // Output: "Physical density: 420\n"
    for line in output.lines() {
        if line.contains("density:") {
            if let Some(density_part) = line.split(':').nth(1) {
                if let Ok(d) = density_part.trim().parse::<u32>() {
                    return d;
                }
            }
        }
    }
    420 // default fallback (xxhdpi)
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_devices_usb() {
        let output = "List of devices attached\nR5CT101ABCD\tdevice\n";
        let devices = parse_devices_output(output);
        assert_eq!(devices.len(), 1);
        assert_eq!(devices[0].serial, "R5CT101ABCD");
        assert!(matches!(devices[0].state, DeviceState::Device));
        assert!(matches!(devices[0].connection_type, ConnectionType::Usb));
    }

    #[test]
    fn test_parse_devices_wireless() {
        let output = "List of devices attached\n192.168.1.100:5555\tdevice\n";
        let devices = parse_devices_output(output);
        assert_eq!(devices.len(), 1);
        assert!(matches!(
            devices[0].connection_type,
            ConnectionType::Wireless
        ));
    }

    #[test]
    fn test_parse_devices_unauthorized() {
        let output = "List of devices attached\nR5CT101ABCD\tunauthorized\n";
        let devices = parse_devices_output(output);
        assert_eq!(devices.len(), 1);
        assert!(matches!(devices[0].state, DeviceState::Unauthorized));
    }

    #[test]
    fn test_parse_devices_empty() {
        let output = "List of devices attached\n\n";
        let devices = parse_devices_output(output);
        assert_eq!(devices.len(), 0);
    }

    #[test]
    fn test_parse_screen_size() {
        let output = "Physical size: 1080x2340\n";
        let (w, h) = parse_screen_size(output);
        assert_eq!(w, 1080);
        assert_eq!(h, 2340);
    }

    #[test]
    fn test_parse_screen_density() {
        let output = "Physical density: 420\n";
        let d = parse_screen_density(output);
        assert_eq!(d, 420);
    }
}
