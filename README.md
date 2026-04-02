# 📱 MirroXD: Android Mirroring + Samur.AI Hub

![MirroXD Logo](https://img.shields.io/badge/MirroXD-v0.1.0-red?style=for-the-badge)
![Tauri](https://img.shields.io/badge/Tauri-2.0-blue?style=for-the-badge&logo=tauri)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react)
![Rust](https://img.shields.io/badge/Rust-Backend-dea584?style=for-the-badge&logo=rust)

**MirroXD** adalah aplikasi mirroring Android berbasis desktop yang mengusung konsep **Zero UI**. Dirancang untuk kreator konten dan developer, aplikasi ini menggabungkan kontrol perangkat *native*, perekaman video berkualitas tinggi, dan asisten AI pintar dalam satu ekosistem kanvas yang dinamis.

---

## ✨ Fitur Utama

- **🎨 Zero UI Draggable Canvas**: Antarmuka minimalis tanpa sidebar kaku. Geser dan atur panel (Devices, Config, Media, AI Hub) sesuka hati di atas kanvas bermotif dot-grid.
- **🌓 Adaptive Theming**: Dukungan penuh untuk *Light Mode* yang bersih (inspirasi Samur.ai) dan *Dark Mode* elegan.
- **🎥 High-Quality Recording**: Merekam aktivitas layar langsung ke format MKV menggunakan secondary process Scrcpy 3.0 yang stabil.
- **✂️ Basic Video Editing (Trim)**: Potong durasi video rekaman Anda langsung di aplikasi menggunakan integrasi FFmpeg (Lossless).
- **🧠 Samur.AI Hub**: Terhubung langsung ke Google Gemini AI asli. Analisis klip, buat deskripsi otomatis, atau asisten kreatif lainnya melalui panel melayang.
- **⚡ Native Performance**: Dibangun dengan Rust (Tauri) untuk konsumsi resource yang sangat rendah di PC Anda.

---

## 🛠️ Persyaratan Sistem

Agar fitur berjalan maksimal, pastikan folder `binaries/` di root proyek berisi:
1. `adb.exe` (Android Debug Bridge)
2. `scrcpy.exe` & `scrcpy-server` (Versi 3.0+)
3. `ffmpeg.exe` (Untuk fitur Trimming video)

---

## 🚀 Cara Menjalankan

### Mode Pengembangan (Development)
```bash
# Install dependencies
npm install

# Jalankan dalam mode development
npm run tauri dev
```

### Build Production
```bash
npm run tauri build
```

---

## 📂 Struktur Proyek

```text
mirroxd/
├── src/                # Frontend (React + Typescript)
│   ├── components/     # UI Components (Floating Panels, AI Hub, Editor)
│   ├── hooks/          # Scrcpy & ADB Logic
│   └── main.tsx        # Entry point & Window Label Management
├── src-tauri/          # Backend (Rust)
│   ├── src/
│   │   ├── adb.rs      # Manajemen Koneksi ADB
│   │   ├── scrcpy.rs   # Native Process Scrcpy v3.0
│   │   └── recording.rs # FFmpeg & Record Life-cycle
│   └── tauri.conf.json # Multi-window Configuration (Toolbar Overlay)
└── binaries/           # External CLI Tools (ADB, Scrcpy, FFmpeg)
```

---

## 📝 Catatan Penting

- Pastikan **USB Debugging** sudah aktif di perangkat Android Anda.
- Untuk fitur **samur.AI**, masukkan API Key Gemini Anda di panel AI Hub (tersimpan aman di local storage).
- Fitur **Trimming** video memerlukan biner FFmpeg yang valid terdeteksi di dalam sistem atau folder binaries.

---

Developed with ❤️ by **Antigravity AI** for **Teguhash8**
