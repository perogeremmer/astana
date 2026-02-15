# 🕌 Astana - Manajemen Iuran Makam

Aplikasi desktop untuk manajemen data makam dan iuran makam berbasis [Tauri](https://tauri.app/) (Rust + HTML/CSS/JS). Dirancang khusus untuk memudahkan petugas makam dalam mengelola data almarhum, ahli waris, pembayaran iuran, dan pelaporan.

![Tauri](https://img.shields.io/badge/Tauri-2.0-blue?logo=tauri)
![Rust](https://img.shields.io/badge/Rust-000000?logo=rust)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📋 Fitur Utama

- ✅ **Manajemen Data Blok** - Kelola blok makam dan harga iuran per tahun
- ✅ **Data Makam** - Pencatatan data almarhum dan ahli waris (hingga 3 orang)
- ✅ **Pembayaran Iuran** - Pencatatan pembayaran dengan historis multi-tahun
- ✅ **Laporan Keuangan** - Rekap pembayaran dan tunggakan per blok
- ✅ **Pengaturan** - Backup/restore database dan konfigurasi aplikasi
- ✅ **UI Modern** - Tampilan bersih dengan Tailwind CSS

---

## 🖥️ Halaman Aplikasi

| Halaman | Deskripsi |
|---------|-----------|
| **Dashboard** | Ringkasan statistik, peringatan penting, pembayaran terbaru |
| **Data Blok** | Manajemen blok makam (A, B, C, D, E), kapasitas, dan tarif iuran |
| **Data Makam** | Daftar almarhum, data ahli waris, filter dan pencarian |
| **Pembayaran** | Input pembayaran iuran, lihat status lunas/belum per tahun |
| **Laporan** | Statistik pembayaran, tunggakan, dan makam baru per tahun |
| **Pengaturan** | Backup database, restore, profil yayasan |

---

## 🚀 Cara Install & Menjalankan

### Prerequisites

Pastikan telah terinstall:
- [Rust](https://rustup.rs/) (versi terbaru)
- [Node.js](https://nodejs.org/) (opsional, untuk development tools)
- Sistem operasi: Windows, macOS, atau Linux

### 1. Clone Repository

```bash
cd astana
```

### 2. Build Aplikasi

```bash
cd src-tauri
cargo build --release
```

### 3. Jalankan Aplikasi

```bash
./target/release/astana
```

Atau untuk mode development (hot reload):

```bash
cargo run
```

---

## 🛠️ Struktur Project

```
astana/
├── src/                    # Frontend (HTML, CSS, JS)
│   ├── index.html         # Dashboard
│   ├── blok.html          # Data Blok
│   ├── data-makam.html    # Data Makam
│   ├── pembayaran.html    # Pembayaran
│   ├── laporan.html       # Laporan
│   ├── pengaturan.html    # Pengaturan
│   ├── main.js            # Main JavaScript
│   └── styles.css         # Styles (optional)
├── src-tauri/             # Backend (Rust)
│   ├── src/
│   │   └── main.rs        # Entry point Rust
│   ├── Cargo.toml         # Dependencies Rust
│   └── tauri.conf.json    # Konfigurasi Tauri
└── README.md              # File ini
```

---

## 💾 Database

Aplikasi menggunakan **SQLite** sebagai database lokal:
- Lokasi: Sesuai dengan OS (Windows: `%LOCALAPPDATA%/com.perogeremmer.astana/`)
- Backup otomatis tersedia via Google Drive (opsional)
- Export/import database manual tersedia di menu Pengaturan

---

## 📝 Penggunaan Dasar

1. **Dashboard** - Lihat ringkasan data makam, tunggakan, dan aksi cepat
2. **Tambah Data** - Gunakan menu Data Makam untuk input data almarhum baru
3. **Input Pembayaran** - Buka menu Pembayaran untuk mencatat iuran tahunan
4. **Cek Laporan** - Lihat statistik di menu Laporan
5. **Backup** - Jangan lupa backup database secara berkala di menu Pengaturan

---

## 🔧 Troubleshooting

### Masalah Build

```bash
# Update Rust ke versi terbaru
rustup update

# Bersihkan cache build
cargo clean
cargo build --release
```

### Masalah Runtime

- Pastikan tidak ada aplikasi lain yang menggunakan port yang sama
- Cek permission file database di folder aplikasi

---

## 🤝 Kontribusi

Kontribusi sangat diterima! Silakan buat pull request atau laporkan issue.

---

## 📄 Lisensi

MIT License - Bebas digunakan untuk personal maupun komersial.

---

## 👨‍💻 Developer

Dibuat dengan ❤️ untuk memudahkan pengelolaan makam wakaf.

**Teknologi:**
- [Tauri](https://tauri.app/) - Desktop framework
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Rust](https://www.rust-lang.org/) - Backend
- SQLite - Database

---

## 📞 Dukungan

Jika mengalami masalah atau butuh bantuan:
1. Cek dokumentasi Tauri: https://tauri.app/v1/guides/
2. Buat issue di repository
3. Hubungi tim pengembang

---

*Terima kasih telah menggunakan Astana - Sistem Wakaf Makam!* 🕌✨
