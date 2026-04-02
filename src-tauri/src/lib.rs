// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/

mod adb;
mod scrcpy;
mod recording;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // ADB commands
            adb::list_devices,
            adb::get_device_info,
            adb::start_adb_server,
            adb::kill_adb_server,
            adb::wait_for_device,
            // Scrcpy commands
            scrcpy::start_scrcpy,
            scrcpy::stop_scrcpy,
            scrcpy::get_stream_status,
            scrcpy::set_scrcpy_config,
            scrcpy::send_touch_event,
            scrcpy::send_swipe_event,
            scrcpy::send_key_event,
            // Recording commands
            recording::start_recording,
            recording::stop_recording,
            recording::get_recording_status,
            recording::list_recordings,
            recording::detect_gpu,
            recording::export_recording,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
