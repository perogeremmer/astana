# 🕌 Astana - Manajemen Iuran Makam

Aplikasi desktop untuk manajemen data makam dan iuran makam. Dirancang khusus untuk memudahkan petugas makam dalam mengelola data almarhum, ahli waris, pembayaran iuran, dan pelaporan secara efisien.

![Tauri](https://img.shields.io/badge/Tauri-2.0-blue?logo=tauri)
![Rust](https://img.shields.io/badge/Rust-1.88.0-000000?logo=rust)
![SQLite](https://img.shields.io/badge/SQLite-3.x-003B57?logo=sqlite)
![Docker](https://img.shields.io/badge/Docker-Supported-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Fitur Unggulan

### 📊 Dashboard Ringkasan
Pantau kondisi makam dalam satu tampilan:
- **Statistik real-time**: Total makam, blok tersedia, dan status pembayaran
- **Peringatan penting**: Makam yang belum bayar iuran tahun ini
- **Aktivitas terbaru**: Pembayaran yang baru masuk

### 🗂️ Manajemen Blok Makam
Atur blok makam dengan fleksibel:
- Tambah, edit, dan hapus blok sesuai kebutuhan (A, B, C, dst)
- Atur kapasitas tiap blok
- Tentukan tarif iuran per blok (bisa berbeda-beda)
- Pantau ketersediaan slot makam

### 📋 Data Makam Lengkap
Kelola informasi makam secara terstruktur:
- **Data Almarhum**: Nama, tanggal lahir, tanggal meninggal, dan lokasi makam
- **Data Ahli Waris**: Sampai 3 orang ahli waris dengan kontak lengkap
- **Pencarian & Filter**: Cari makam berdasarkan nama, blok, atau status pembayaran

### 💳 Pembayaran Iuran Terintegrasi
Catat pembayaran dengan mudah:
- **Historis multi-tahun**: Lihat riwayat pembayaran per makam
- **Status otomatis**: Tahu langsung makam yang sudah/belum bayar tahun ini
- **Tahun aktif otomatis**: Mengikuti tahun dari sistem komputer
- **Detail pembayaran**: Nominal, tanggal, dan metode pembayaran

### 📈 Laporan Keuangan Komprehensif
Dapatkan insight keuangan makam:
- **Laporan tahunan**: Statistik lengkap per tahun
- **Detail per blok**: Total makam, sudah bayar, belum bayar, dan pendapatan
- **Tunggakan**: Daftar makam yang menunggak iuran
- **Export-friendly**: Data siap untuk dipresentasikan

### ⚙️ Pengaturan Yayasan
Personalisasi aplikasi sesuai identitas yayasan:
- **Profil yayasan**: Nama, alamat, dan kontak
- **Logo yayasan**: Upload logo untuk tampilan profesional
- **Backup database**: Simpan data ke file untuk keamanan
- **Restore data**: Kembalikan data dari backup

---

## 🖥️ Tampilan Aplikasi

| Halaman | Deskripsi |
|---------|-----------|
| **Dashboard** | Ringkasan statistik, peringatan penting, pembayaran terbaru |
| **Data Blok** | Manajemen blok makam, kapasitas, dan tarif iuran |
| **Data Makam** | Daftar almarhum, data ahli waris, filter dan pencarian |
| **Pembayaran** | Input pembayaran iuran, status lunas/belum per tahun |
| **Laporan** | Statistik pembayaran, tunggakan, dan makam baru per tahun |
| **Pengaturan** | Profil yayasan dengan logo, backup/restore database |

---

## 🚀 Cara Install & Menjalankan

### Prerequisites

Pastikan telah terinstall **salah satu** dari:
- **Docker** (untuk development dengan container)
- [Rust](https://rustup.rs/) (versi 1.88.0 atau lebih baru)
- System dependencies (sesuai OS - lihat detail di bawah)
- Sistem operasi: Windows, macOS, atau Linux

> ⚠️ **Catatan:** Project ini menggunakan **Tailwind CSS** yang perlu dicompile terlebih dahulu. Ikuti langkah build CSS di bawah sebelum menjalankan aplikasi.

### Pre-build: Compile Tailwind CSS (WAJIB)

Sebelum menjalankan aplikasi, build Tailwind CSS terlebih dahulu:

**Cara Mudah (gunakan script):**

```bash
# Linux/macOS
./scripts/build-css.sh

# Windows (PowerShell)
.\scripts\build-css.ps1
```

**Cara Manual:**

```bash
# Download Tailwind Standalone CLI (satu kali)
curl -L -o /tmp/tailwindcss "https://github.com/tailwindlabs/tailwindcss/releases/download/v3.4.1/tailwindcss-linux-x64"
chmod +x /tmp/tailwindcss

# Build CSS
/tmp/tailwindcss -i src/input.css -o src/assets/css/tailwind.min.css --minify
```

**Untuk Windows:**
```powershell
# Download Tailwind Standalone CLI
Invoke-WebRequest -Uri "https://github.com/tailwindlabs/tailwindcss/releases/download/v3.4.1/tailwindcss-windows-x64.exe" -OutFile "$env:TEMP\tailwindcss.exe"

# Build CSS
& "$env:TEMP\tailwindcss.exe" -i src/input.css -o src/assets/css/tailwind.min.css --minify
```

**Untuk macOS:**
```bash
# Download Tailwind Standalone CLI
curl -L -o /tmp/tailwindcss "https://github.com/tailwindlabs/tailwindcss/releases/download/v3.4.1/tailwindcss-macos-x64"
chmod +x /tmp/tailwindcss

# Build CSS
/tmp/tailwindcss -i src/input.css -o src/assets/css/tailwind.min.css --minify
```

### Option 1: Development dengan Docker (Recommended)

```bash
# 1. Clone repository
git clone <repository-url>
cd astana

# 2. Build dan jalankan dengan Docker
./scripts/docker-dev.sh
```

Atau manual dengan Docker Compose:

```bash
# Build image
docker compose -f docker/docker-compose.yml build dev

# Jalankan development server
docker compose -f docker/docker-compose.yml run --rm dev
```

### Option 2: Development Native (Dengan Rust)

Untuk panduan setup lengkap di mesin baru, lihat **[DEVELOPMENT.md](./DEVELOPMENT.md)**

### Quick Start (jika semua prerequisites sudah terinstall)

```bash
# 1. Clone repository
git clone <repository-url>
cd astana

# 2. Install Tauri CLI (satu kali saja)
cargo install tauri-cli

# 3. Build Tailwind CSS (WAJIB sebelum running)
./scripts/build-css.sh

# Windows (PowerShell):
# .\scripts\build-css.ps1

# 4. Jalankan aplikasi (development mode)
cd src-tauri
cargo tauri dev
```

### Build Aplikasi (Production)

```bash
# Dengan Docker
./scripts/docker-build.sh

# Atau native
cd src-tauri
cargo tauri build
```

> Hasil build akan ada di `src-tauri/target/release/bundle/`

---

## 🛠️ Struktur Project

```
astana/
├── src/                          # Frontend (HTML, CSS, JS)
│   ├── index.html               # Dashboard
│   ├── blok.html                # Data Blok
│   ├── data-makam.html          # Data Makam
│   ├── pembayaran.html          # Pembayaran
│   ├── laporan.html             # Laporan
│   ├── pengaturan.html          # Pengaturan
│   ├── *.js                     # JavaScript untuk tiap halaman
│   └── styles.css               # Styles global
│
├── src-tauri/                   # Backend (Rust)
│   ├── src/
│   │   ├── main.rs              # Entry point
│   │   ├── lib.rs               # Library & commands
│   │   └── db.rs                # Database module
│   ├── migrations/              # Database migrations
│   ├── Cargo.toml               # Dependencies Rust
│   └── tauri.conf.json          # Konfigurasi Tauri
│
├── docker/                      # Docker configuration
├── scripts/                     # Helper scripts
├── sample-data/                 # Database sample (500 data)
│   ├── astana.db               # File database sample
│   ├── generate-sample.py      # Script generate data
│   └── README.md               # Dokumentasi sample
├── DATABASE_SCHEMA.md           # Dokumentasi skema database
├── DEVELOPMENT.md               # Panduan development lengkap
└── README.md                    # File ini
```

---

## 💾 Database

Aplikasi menggunakan **SQLite** sebagai database lokal yang tersimpan di komputer Anda.

### Lokasi Database

| Platform | Lokasi |
|----------|--------|
| Windows | `%LOCALAPPDATA%\astana\astana.db` |
| macOS | `~/Library/Application Support/astana/astana.db` |
| Linux | `~/.local/share/astana/astana.db` |

Lihat detail lengkap di **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)**

### 📦 Database Sample

Tersedia database sample dengan **500 data makam** lengkap untuk testing dan demo:

| File | Deskripsi | Ukuran |
|------|-----------|--------|
| [`sample-data/astana.db`](./sample-data/astana.db) | Database SQLite dengan 500 data | ~500 KB |
| [`sample-data/README.md`](./sample-data/README.md) | Dokumentasi sample data | - |

**Isi Sample Data:**
- 5 Blok Makam (A: Premium, B-C: Standar, D-E: Ekonomis)
- 500 Data Makam dengan periode 1980-2024
- 967 Ahli Waris (1-3 orang per makam)
- 2,421 Historis Pembayaran (2020-2026)

Lihat [`sample-data/README.md`](./sample-data/README.md) untuk instruksi import.

---

## 📖 Cara Penggunaan

### 🚀 Setup Awal (Pilih Salah Satu)

Saat pertama kali menjalankan aplikasi, Anda memiliki **2 opsi** untuk setup database:

#### Opsi 1: Import Database Sample (⭐ Rekomendasi untuk Testing)
Gunakan database sample dengan **500 data makam** lengkap untuk langsung mencoba fitur aplikasi.

**Cara Import:**
1. Download file sample: [`sample-data/astana.db`](./sample-data/astana.db)
2. Copy ke lokasi aplikasi sesuai OS Anda:
   - **Windows:** `%LOCALAPPDATA%\astana\astana.db`
   - **macOS:** `~/Library/Application Support/astana/astana.db`
   - **Linux:** `~/.local/share/astana/astana.db`
3. Jalankan aplikasi
4. Data sample siap digunakan! 🎉

**Isi Database Sample:**
- 5 Blok Makam (A, B, C, D, E)
- 500 Data Makam lengkap
- 967 Ahli Waris
- 2,421 Historis Pembayaran (2020-2026)

> 💡 **Tips:** Opsi ini cocok untuk testing, demo, atau melihat fitur aplikasi sebelum input data asli.

#### Opsi 2: Mulai dari Awal (Untuk Data Produksi)
Mulai dengan database kosong dan input data Anda sendiri dari nol.

**Langkah-langkah:**
1. Jalankan aplikasi (database kosong otomatis dibuat)
2. Buka menu **Pengaturan**
3. Isi nama yayasan/makam dan informasi kontak
4. Upload logo yayasan (opsional)
5. Simpan perubahan
6. Lanjut ke langkah selanjutnya ⬇️

---

### 2. Buat Blok Makam
- Masuk ke menu **Data Blok**
- Klik "Tambah Blok"
- Isi nama blok, kapasitas, dan tarif iuran
- Blok siap digunakan

### 3. Input Data Makam
- Buka menu **Data Makam**
- Klik "Tambah Data"
- Isi data almarhum (nama, tanggal, blok, nomor makam)
- Tambahkan data ahli waris (minimal 1 orang)
- Simpan data

### 4. Catat Pembayaran Iuran
- Buka menu **Pembayaran**
- Pilih makam dari daftar
- Input jumlah pembayaran dan metode
- Simpan pembayaran
- Status makam otomatis terupdate

### 5. Lihat Laporan
- Buka menu **Laporan**
- Pilih tahun yang ingin dilihat
- Lihat statistik pembayaran per blok
- Cek daftar tunggakan jika ada

### 6. Backup Data Berkala
- Masuk ke menu **Pengaturan**
- Klik "Backup Sekarang" atau "Export ke File"
- Simpan file backup di lokasi aman

---

## 🔧 Troubleshooting

| Masalah | Solusi |
|---------|--------|
| Build gagal / linker error | Install system dependencies (lihat DEVELOPMENT.md) |
| Database tidak terbaca | Cek permission folder aplikasi |
| Error saat build | Pastikan semua prerequisites terinstall |
| `cargo tauri` command not found | Install Tauri CLI: `cargo install tauri-cli` |
| Docker build gagal | Pastikan Docker daemon running dan permission user |

Lihat **[DEVELOPMENT.md](./DEVELOPMENT.md)** untuk panduan troubleshooting lengkap.

---

## 📦 Dependencies & Libraries

### External Libraries (Bundled Locally)

| Library | Version | Usage | Location |
|---------|---------|-------|----------|
| SheetJS (XLSX) | 0.20.1 | Excel export functionality | `src/assets/js/xlsx.full.min.js` |

**Note:** All external libraries are bundled locally in `src/assets/js/` to ensure offline functionality. No CDN dependencies required.

---

## 🤝 Kontribusi

Kontribusi sangat diterima! Silakan:
1. Fork repository
2. Buat branch fitur (`git checkout -b fitur-keren`)
3. Commit perubahan (`git commit -m 'feat: tambah fitur keren'`)
4. Push ke branch (`git push origin fitur-keren`)
5. Buat Pull Request

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
- [SQLite](https://sqlite.org/) - Database
- [Docker](https://www.docker.com/) - Containerization

---

## 📞 Dukungan

Jika mengalami masalah atau butuh bantuan:
1. Cek dokumentasi Tauri: https://tauri.app/v1/guides/
2. Lihat DATABASE_SCHEMA.md untuk detail database
3. Lihat DEVELOPMENT.md untuk setup development
4. Buat issue di repository

---

*Terima kasih telah menggunakan Astana - Sistem Wakaf Makam!* 🕌✨
