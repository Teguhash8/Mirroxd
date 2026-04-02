// Recording pipeline — taps into H.264 stream buffer and writes to file
use serde::{Deserialize, Serialize};
use std::fs;

use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{command, AppHandle, Emitter};

// ─── Structs

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum RecordingState {
    Idle,
    Recording,
    Processing,
    Done,
    Error,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecordingStatus {
    pub state: RecordingState,
    pub output_path: Option<String>,
    pub duration_secs: f64,
    pub file_size_bytes: u64,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct RecordingError {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct RecordingFile {
    pub name: String,
    pub path: String,
    pub size_bytes: u64,
    pub created_at: String,
    pub duration_secs: Option<f64>,
}

// ─── Global State

lazy_static::lazy_static! {
    static ref RECORDING_STATUS: Arc<Mutex<RecordingStatus>> = Arc::new(Mutex::new(RecordingStatus {
        state: RecordingState::Idle,
        output_path: None,
        duration_secs: 0.0,
        file_size_bytes: 0,
        error: None,
    }));
    static ref RECORDING_PROCESS: Arc<Mutex<Option<std::process::Child>>> = Arc::new(Mutex::new(None));
    static ref RECORDING_START: Arc<Mutex<Option<std::time::Instant>>> = Arc::new(Mutex::new(None));
}

// ─── Helper: Get recordings directory

fn get_recordings_dir() -> PathBuf {
    let videos_dir = dirs::video_dir().unwrap_or_else(|| {
        dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("Videos")
    });

    let app_dir = videos_dir.join("MirroXD");
    let date_dir = app_dir.join(chrono::Local::now().format("%Y-%m-%d").to_string());

    // Create directories if they don't exist
    fs::create_dir_all(&date_dir).ok();

    date_dir
}

fn generate_filename() -> String {
    let now = chrono::Local::now();
    format!("recording_{}.mkv", now.format("%H-%M-%S"))
}

/// Start recording — launches background scrcpy to record to .mkv
#[command]
pub async fn start_recording(app: AppHandle) -> Result<RecordingStatus, RecordingError> {
    let serial = crate::scrcpy::get_active_serial().ok_or_else(|| RecordingError {
        code: "NO_ACTIVE_STREAM".to_string(),
        message: "Tidak ada stream aktif untuk direkam".to_string(),
    })?;

    let dir = get_recordings_dir();
    let filename = generate_filename();
    let filepath = dir.join(&filename);

    let scrcpy_exe = crate::scrcpy::get_scrcpy_exe_path();
    let adb_path = crate::scrcpy::get_adb_path();

    let scrcpy_dir = std::path::Path::new(&scrcpy_exe)
        .parent()
        .expect("Invalid scrcpy path");

    let args = vec![
        "--serial".to_string(),
        serial,
        "--no-video-playback".to_string(),
        "--no-audio-playback".to_string(),
        "--record".to_string(),
        filepath.to_string_lossy().to_string(),
    ];

    let child = std::process::Command::new(&scrcpy_exe)
        .args(&args)
        .env("ADB", adb_path)
        .current_dir(scrcpy_dir)
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null())
        .spawn()
        .map_err(|e| RecordingError {
            code: "PROCESS_START_FAILED".to_string(),
            message: format!("Gagal menjalankan scrcpy perekam: {}", e),
        })?;

    // Set recording state
    {
        *RECORDING_PROCESS.lock().unwrap() = Some(child);
        *RECORDING_START.lock().unwrap() = Some(std::time::Instant::now());

        let mut status = RECORDING_STATUS.lock().unwrap();
        status.state = RecordingState::Recording;
        status.output_path = Some(filepath.to_string_lossy().to_string());
        status.duration_secs = 0.0;
        status.file_size_bytes = 0;
        status.error = None;
    }

    let app_clone = app.clone();
    std::thread::spawn(move || {
        loop {
            std::thread::sleep(std::time::Duration::from_millis(500));

            let mut status = RECORDING_STATUS.lock().unwrap();
            if status.state != RecordingState::Recording {
                break;
            }

            if let Some(start) = *RECORDING_START.lock().unwrap() {
                status.duration_secs = start.elapsed().as_secs_f64();

                // Update file size periodically
                if let Some(path) = &status.output_path {
                    if let Ok(meta) = std::fs::metadata(path) {
                        status.file_size_bytes = meta.len();
                    }
                }
            }

            let _ = app_clone.emit("recording-status", &*status);
        }
    });

    let status = RECORDING_STATUS.lock().unwrap().clone();
    let _ = app.emit("recording-status", &status);

    Ok(status)
}

/// Stop recording and finalize MKV wrapper
#[command]
pub async fn stop_recording(app: AppHandle) -> Result<RecordingStatus, RecordingError> {
    if let Some(mut child) = RECORDING_PROCESS.lock().unwrap().take() {
        let _ = child.kill();
        let _ = child.wait();
    }

    let mkv_path = {
        let status = RECORDING_STATUS.lock().unwrap();
        status.output_path.clone()
    };

    if let Some(ref path) = mkv_path {
        let mut status = RECORDING_STATUS.lock().unwrap();
        status.state = RecordingState::Done;
        // update final size
        if let Ok(meta) = std::fs::metadata(path) {
            status.file_size_bytes = meta.len();
        }
    } else {
        let mut status = RECORDING_STATUS.lock().unwrap();
        status.state = RecordingState::Idle;
    }

    let status = RECORDING_STATUS.lock().unwrap().clone();
    let _ = app.emit("recording-status", &status);

    Ok(status)
}

/// Get current recording status
#[command]
pub async fn get_recording_status() -> Result<RecordingStatus, RecordingError> {
    Ok(RECORDING_STATUS.lock().unwrap().clone())
}

/// List all recordings
#[command]
pub async fn list_recordings() -> Result<Vec<RecordingFile>, RecordingError> {
    let videos_dir = dirs::video_dir().unwrap_or_else(|| {
        dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("Videos")
    });
    let app_dir = videos_dir.join("MirroXD");

    if !app_dir.exists() {
        return Ok(vec![]);
    }

    let mut recordings = Vec::new();
    collect_recordings(&app_dir, &mut recordings);

    // Sort by name descending (newest first)
    recordings.sort_by(|a, b| b.name.cmp(&a.name));

    Ok(recordings)
}

fn collect_recordings(dir: &PathBuf, recordings: &mut Vec<RecordingFile>) {
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                collect_recordings(&path, recordings);
            } else if let Some(ext) = path.extension() {
                if ext == "mp4" || ext == "h264" || ext == "mkv" || ext == "webm" {
                    if let Ok(metadata) = fs::metadata(&path) {
                        recordings.push(RecordingFile {
                            name: path
                                .file_name()
                                .unwrap_or_default()
                                .to_string_lossy()
                                .to_string(),
                            path: path.to_string_lossy().to_string(),
                            size_bytes: metadata.len(),
                            created_at: metadata
                                .created()
                                .ok()
                                .and_then(|t| {
                                    let datetime: chrono::DateTime<chrono::Local> = t.into();
                                    Some(datetime.format("%Y-%m-%d %H:%M:%S").to_string())
                                })
                                .unwrap_or_default(),
                            duration_secs: None,
                        });
                    }
                }
            }
        }
    }
}

fn get_ffmpeg_path() -> String {
    if cfg!(debug_assertions) {
        let project_ffmpeg = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("binaries")
            .join("ffmpeg.exe");
        if project_ffmpeg.exists() {
            return project_ffmpeg.to_string_lossy().to_string();
        }
        "ffmpeg".to_string()
    } else {
        let exe_dir = std::env::current_exe()
            .unwrap()
            .parent()
            .unwrap()
            .to_path_buf();
        #[cfg(target_os = "windows")]
        let path = exe_dir.join("binaries").join("ffmpeg.exe");
        #[cfg(not(target_os = "windows"))]
        let path = exe_dir.join("binaries").join("ffmpeg");
        path.to_string_lossy().to_string()
    }
}

fn mux_h264_to_mp4(input: &str, output: &str) -> Result<(), String> {
    let ffmpeg = get_ffmpeg_path();

    let result = std::process::Command::new(&ffmpeg)
        .args([
            "-y", // Overwrite
            "-i", input, "-c:v", "copy", // No re-encode
            output,
        ])
        .output()
        .map_err(|e| format!("FFmpeg not found: {}", e))?;

    if result.status.success() {
        Ok(())
    } else {
        let stderr = String::from_utf8_lossy(&result.stderr).to_string();
        Err(stderr)
    }
}

/// Detect GPU for hardware acceleration
#[command]
pub async fn detect_gpu() -> Result<String, RecordingError> {
    let ffmpeg = get_ffmpeg_path();

    // Try NVIDIA first
    let nvidia_check = std::process::Command::new(&ffmpeg)
        .args(["-hide_banner", "-encoders"])
        .output();

    if let Ok(output) = nvidia_check {
        let stdout = String::from_utf8_lossy(&output.stdout).to_string();
        if stdout.contains("h264_nvenc") {
            return Ok("nvidia".to_string());
        }
        if stdout.contains("h264_amf") {
            return Ok("amd".to_string());
        }
        if stdout.contains("h264_qsv") {
            return Ok("intel".to_string());
        }
    }

    Ok("software".to_string())
}

/// Export recording with encoding options
#[command]
pub async fn export_recording(
    app: AppHandle,
    input_path: String,
    output_path: String,
    encoder: String,
    resolution: Option<String>,
) -> Result<String, RecordingError> {
    let ffmpeg = get_ffmpeg_path();

    let mut args: Vec<String> = vec!["-y".to_string(), "-i".to_string(), input_path.clone()];

    // Video codec
    args.push("-c:v".to_string());
    args.push(encoder.clone());

    // Resolution scaling
    if let Some(res) = resolution {
        args.push("-vf".to_string());
        args.push(format!("scale={}", res));
    }

    args.push(output_path.clone());

    let result = std::process::Command::new(&ffmpeg)
        .args(&args)
        .output()
        .map_err(|e| RecordingError {
            code: "FFMPEG_ERROR".to_string(),
            message: format!("FFmpeg error: {}", e),
        })?;

    if result.status.success() {
        let _ = app.emit("export-done", &output_path);
        Ok(output_path)
    } else {
        let stderr = String::from_utf8_lossy(&result.stderr).to_string();
        Err(RecordingError {
            code: "EXPORT_FAILED".to_string(),
            message: stderr,
        })
    }
}

/// Trim video recording using FFmpeg
#[command]
pub async fn trim_video(
    app: AppHandle,
    input_path: String,
    output_path: String,
    start_time: String,
    end_time: String,
) -> Result<String, RecordingError> {
    let ffmpeg = get_ffmpeg_path();

    let args: Vec<String> = vec![
        "-y".to_string(),
        "-i".to_string(),
        input_path.clone(),
        "-ss".to_string(),
        start_time,
        "-to".to_string(),
        end_time,
        "-c:v".to_string(),
        "copy".to_string(),
        "-c:a".to_string(),
        "copy".to_string(),
        output_path.clone(),
    ];

    let result = std::process::Command::new(&ffmpeg)
        .args(&args)
        .output()
        .map_err(|e| RecordingError {
            code: "FFMPEG_ERROR".to_string(),
            message: format!("FFmpeg error: {}", e),
        })?;

    if result.status.success() {
        let _ = app.emit("trim-done", &output_path);
        Ok(output_path)
    } else {
        let stderr = String::from_utf8_lossy(&result.stderr).to_string();
        Err(RecordingError {
            code: "TRIM_FAILED".to_string(),
            message: stderr,
        })
    }
}
