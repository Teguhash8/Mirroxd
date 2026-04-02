# ⚔️ MIRROXD
### The Zero-UI Workspace for Android & Samur.AI

<p align="left">
  <img src="https://img.shields.io/badge/VERSION-0.1.0-EB5757?style=for-the-badge&logo=appveyor" />
  <img src="https://img.shields.io/badge/ENGINE-TAURI_2.0-2F80ED?style=for-the-badge&logo=tauri" />
  <img src="https://img.shields.io/badge/AI-GEMINI_READY-6FCF97?style=for-the-badge&logo=google-gemini" />
</p>

---

**MirroXD** mendefinisikan ulang cara Anda berinteraksi dengan perangkat Android. Mengadopsi prinsip **Zero-UI**, aplikasi ini membuang layout tradisional dan menggantinya dengan kanvas kreatif yang dinamis, ringan, dan ditenagai oleh kecerdasan buatan.

---

## 🔘 FILOSOFI DESAIN
Aplikasi ini dirancang dengan estetika **Minimalist Samurai**:
*   **Canvas Grid**: Latar belakang pola titik (Dot-Grid) yang memberikan ruang fokus maksimal.
*   **Floating State**: Semua modul adalah panel melayang yang bisa diatur posisinya *(fully draggable)*.
*   **Glassmorphism**: Lapisan antarmuka transparan dengan efek *frosted-glass* yang premium.
*   **Bimodal**: Transisi mulus antara *Paper White* (Light) dan *Midnight* (Dark) mode.

---

## 🛠️ MODUL & FITUR

#### 📱 Native Mirroring 3.0
Koneksi latensi rendah menggunakan Scrcpy v3.0. Kendali penuh sentuhan dan navigasi langsung dari kursor Anda.

#### 🎥 Cinematic Recording
Alur kerja perekaman video murni ke format MKV yang stabil. Siap untuk kebutuhan konten gaming atau tutorial.

#### ✂️ Precision Trimming
Edit dasar tanpa meninggalkan workspace. Potong bagian video yang tidak perlu dengan perintah FFmpeg yang cepat dan akurat.

#### ✨ Samur.AI Hub
Integrasi langsung dengan Google Gemini. Jadikan AI sebagai asisten editing, pencatat otomatis, atau pemberi saran konten secara real-time.

---

## 🏗️ INFRASTRUKTUR TEKNIS

| Komponen | Teknologi |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite |
| **Backend** | Rust, Tauri API |
| **Animation** | Framer Motion |
| **Styling** | Tailwind CSS & CSS Variables |
| **CLI Engine** | ADB, Scrcpy, FFmpeg |

---

## 🏁 MULAI CEPAT

1.  **Persiapan Biner**: Letakkan `adb.exe`, `scrcpy.exe`, dan `ffmpeg.exe` di dalam direktori `binaries/`.
2.  **Instalasi**:
    ```bash
    npm install
    ```
3.  **Jalankan Workspace**:
    ```bash
    npm run tauri dev
    ```

---

## 🏮 KONFIGURASI AI
Buka panel **AI Hub** di dalam MirroXD, masukkan *Gemini API Key* Anda. Data kunci API disimpan secara aman di penyimpanan lokal peramban *(local storage)* dan tidak pernah dikirim ke server pihak ketiga manapun.

---

<p align="center">
  <i>"Simplicity is the ultimate sophistication."</i> — <b>MirroXD v0.1.0</b>
</p>

<p align="center">
  Dokumentasi diperbarui oleh <b>Antigravity AI</b> • 2026
</p>
