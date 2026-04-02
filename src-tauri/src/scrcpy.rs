// src-tauri/src/scrcpy.rs
// Scrcpy integration — manages scrcpy-server on device and H.264 stream capture

use serde::{Deserialize, Serialize};
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use tauri::{command, AppHandle, Emitter};

// ─── Structs ────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ScrcpyConfig {
    pub bitrate: u32,        // bps, default 2_000_000 (2 Mbps)
    pub max_width: u32,      // max resolution width, 0 = device native
    pub max_fps: u32,        // max FPS, 0 = unlimited
    pub codec: String,       // "h264" or "h265"
}

impl Default for ScrcpyConfig {
    fn default() -> Self {
        Self {
            bitrate: 2_000_000,
            max_width: 0,
            max_fps: 30,
            codec: "h264".to_string(),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ScrcpyError {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum StreamState {
    Idle,
    Starting,
    Streaming,
    Reconnecting,
    Stopped,
    Error,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct StreamStatus {
    pub state: StreamState,
    pub serial: Option<String>,
    pub config: ScrcpyConfig,
    pub error: Option<String>,
}

// ─── Global State ───────────────────────────────────────────────────────────

lazy_static::lazy_static! {
    static ref SCRCPY_PROCESS: Arc<Mutex<Option<Child>>> = Arc::new(Mutex::new(None));
    static ref STREAM_STATE: Arc<Mutex<StreamStatus>> = Arc::new(Mutex::new(StreamStatus {
        state: StreamState::Idle,
        serial: None,
        config: ScrcpyConfig::default(),
        error: None,
    }));
    static ref STOP_FLAG: Arc<Mutex<bool>> = Arc::new(Mutex::new(false));
}

// ─── Helper: ADB path (reuse from adb module) ──────────────────────────────

pub(crate) fn get_adb_path() -> String {
    if cfg!(debug_assertions) {
        let project_adb = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join("adb-x86_64-pc-windows-msvc.exe");
        if project_adb.exists() {
            return project_adb.to_string_lossy().to_string();
        }
        "adb".to_string()
    } else {
        let exe_dir = std::env::current_exe()
            .unwrap()
            .parent()
            .unwrap()
            .to_path_buf();
        #[cfg(target_os = "windows")]
        let adb_path = exe_dir.join("binaries").join("adb-x86_64-pc-windows-msvc.exe");
        #[cfg(not(target_os = "windows"))]
        let adb_path = exe_dir.join("binaries").join("adb");
        adb_path.to_string_lossy().to_string()
    }
}

pub(crate) fn get_scrcpy_exe_path() -> String {
    if cfg!(debug_assertions) {
        let project_path = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join("scrcpy-v3.0")
            .join("scrcpy.exe");
        project_path.to_string_lossy().to_string()
    } else {
        let exe_dir = std::env::current_exe()
            .unwrap()
            .parent()
            .unwrap()
            .to_path_buf();
        exe_dir.join("binaries").join("scrcpy-v3.0").join("scrcpy.exe").to_string_lossy().to_string()
    }
}

// Legacy methods removed — scrcpy.exe handles server push and start internally.

// ─── Tauri Commands ─────────────────────────────────────────────────────────

/// Mulai mirroring ke device tertentu menggunakan scrcpy.exe
#[command]
pub async fn start_scrcpy(
    app: AppHandle,
    serial: String,
    config: Option<ScrcpyConfig>,
) -> Result<StreamStatus, ScrcpyError> {
    let cfg = config.unwrap_or_default();
    let scrcpy_exe = get_scrcpy_exe_path();
    let adb_path = get_adb_path();

    // Update state: starting
    {
        let mut state = STREAM_STATE.lock().unwrap();
        state.state = StreamState::Starting;
        state.serial = Some(serial.clone());
        state.config = cfg.clone();
        state.error = None;
    }

    // Emit state change
    let _ = app.emit("scrcpy-state", &*STREAM_STATE.lock().unwrap());

    // Reset stop flag
    *STOP_FLAG.lock().unwrap() = false;

    // Launch scrcpy.exe
    let mut args = vec![
        "--serial".to_string(), serial.clone(),
        "--window-title".to_string(), format!("Mirroxd: {}", serial),
        "--always-on-top".to_string(),
        // --path-to-adb is removed in scrcpy v3.0, we use environment variable instead
    ];

    // Add bitrate if specified (scrcpy v3.0 uses --video-bit-rate)
    if cfg.bitrate > 0 {
        args.push("--video-bit-rate".to_string());
        args.push(cfg.bitrate.to_string());
    }

    // Add max size if specified
    if cfg.max_width > 0 {
        args.push("--max-size".to_string());
        args.push(cfg.max_width.to_string());
    }

    let scrcpy_dir = std::path::Path::new(&scrcpy_exe).parent().expect("Invalid scrcpy path");

    let mut child = Command::new(&scrcpy_exe)
        .args(&args)
        .env("ADB", adb_path) // Scrcpy v3.0 uses ADB env var for adb.exe path
        .current_dir(scrcpy_dir)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| ScrcpyError {
            code: "SCRCPY_EXE_FAILED".to_string(),
            message: format!("Gagal menjalankan scrcpy.exe: {}", e),
        })?;

    // Sadap stdout
    if let Some(stdout) = child.stdout.take() {
        std::thread::spawn(move || {
            use std::io::BufRead;
            let reader = std::io::BufReader::new(stdout);
            for line in reader.lines() {
                if let Ok(l) = line {
                    eprintln!("[SCRCPY-LOG] {}", l);
                }
            }
        });
    }

    // Sadap stderr
    if let Some(stderr) = child.stderr.take() {
        std::thread::spawn(move || {
            use std::io::BufRead;
            let reader = std::io::BufReader::new(stderr);
            for line in reader.lines() {
                if let Ok(l) = line {
                    eprintln!("[SCRCPY-ERR] {}", l);
                }
            }
        });
    }

    // Store child process
    *SCRCPY_PROCESS.lock().unwrap() = Some(child);

    // Update state: streaming (since it is an external window)
    {
        let mut state = STREAM_STATE.lock().unwrap();
        state.state = StreamState::Streaming;
    }
    
    let status = STREAM_STATE.lock().unwrap().clone();
    let _ = app.emit("scrcpy-state", &status);

    Ok(status)
}

// stream_reader removed — scrcpy.exe handles display natively.

pub fn get_active_serial() -> Option<String> {
    STREAM_STATE.lock().unwrap().serial.clone()
}


/// Stop mirroring
#[command]
pub async fn stop_scrcpy(app: AppHandle) -> Result<StreamStatus, ScrcpyError> {
    // Set stop flag
    *STOP_FLAG.lock().unwrap() = true;

    // Kill process
    if let Some(ref mut child) = *SCRCPY_PROCESS.lock().unwrap() {
        let _ = child.kill();
    }
    *SCRCPY_PROCESS.lock().unwrap() = None;

    // Update state
    {
        let mut state = STREAM_STATE.lock().unwrap();
        state.state = StreamState::Idle;
        state.serial = None;
        state.error = None;
    }

    let status = STREAM_STATE.lock().unwrap().clone();
    let _ = app.emit("scrcpy-state", &status);

    Ok(status)
}

/// Get current stream state
#[command]
pub async fn get_stream_status() -> Result<StreamStatus, ScrcpyError> {
    Ok(STREAM_STATE.lock().unwrap().clone())
}

/// Update scrcpy config (requires restart to take effect)
#[command]
pub async fn set_scrcpy_config(config: ScrcpyConfig) -> Result<(), ScrcpyError> {
    let mut state = STREAM_STATE.lock().unwrap();
    state.config = config;
    Ok(())
}

/// Kirim input touch ke device via ADB
#[command]
pub async fn send_touch_event(
    serial: String,
    x: u32,
    y: u32,
    action: String,
) -> Result<(), ScrcpyError> {
    let adb = get_adb_path();

    let cmd = match action.as_str() {
        "tap" => format!("input tap {} {}", x, y),
        "swipe" => format!("input tap {} {}", x, y), // simplified — real swipe needs start/end
        _ => format!("input tap {} {}", x, y),
    };

    let output = Command::new(&adb)
        .args(["-s", &serial, "shell", &cmd])
        .output()
        .map_err(|e| ScrcpyError {
            code: "INPUT_FAILED".to_string(),
            message: format!("Gagal kirim touch event: {}", e),
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(ScrcpyError {
            code: "INPUT_FAILED".to_string(),
            message: stderr,
        });
    }

    Ok(())
}

/// Kirim swipe gesture ke device
#[command]
pub async fn send_swipe_event(
    serial: String,
    x1: u32,
    y1: u32,
    x2: u32,
    y2: u32,
    duration_ms: u32,
) -> Result<(), ScrcpyError> {
    let adb = get_adb_path();

    let cmd = format!(
        "input swipe {} {} {} {} {}",
        x1, y1, x2, y2, duration_ms
    );

    let output = Command::new(&adb)
        .args(["-s", &serial, "shell", &cmd])
        .output()
        .map_err(|e| ScrcpyError {
            code: "INPUT_FAILED".to_string(),
            message: format!("Gagal kirim swipe event: {}", e),
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(ScrcpyError {
            code: "INPUT_FAILED".to_string(),
            message: stderr,
        });
    }

    Ok(())
}

/// Kirim key event (back, home, etc)
#[command]
pub async fn send_key_event(serial: String, keycode: u32) -> Result<(), ScrcpyError> {
    let adb = get_adb_path();

    let output = Command::new(&adb)
        .args([
            "-s",
            &serial,
            "shell",
            &format!("input keyevent {}", keycode),
        ])
        .output()
        .map_err(|e| ScrcpyError {
            code: "INPUT_FAILED".to_string(),
            message: format!("Gagal kirim key event: {}", e),
        })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(ScrcpyError {
            code: "INPUT_FAILED".to_string(),
            message: stderr,
        });
    }

    Ok(())
}
