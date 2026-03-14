# 🕌 Astana - Manajemen Iuran Makam

Aplikasi desktop untuk manajemen data makam dan iuran makam berbasis [Tauri](https://tauri.app/) (Rust + HTML/CSS/JS). Dirancang khusus untuk memudahkan petugas makam dalam mengelola data almarhum, ahli waris, pembayaran iuran, dan pelaporan.

![Tauri](https://img.shields.io/badge/Tauri-2.0-blue?logo=tauri)
![Rust](https://img.shields.io/badge/Rust-1.88.0-000000?logo=rust)
![SQLite](https://img.shields.io/badge/SQLite-3.x-003B57?logo=sqlite)
![Docker](https://img.shields.io/badge/Docker-Supported-2496ED?logo=docker)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📋 Fitur Utama

| Fitur | Status | Keterangan |
|-------|--------|------------|
| Manajemen Data Blok | ✅ | CRUD blok makam dengan kapasitas & tarif iuran |
| Data Makam | ✅ | Pencatatan data almarhum dan ahli waris (1-3 orang) |
| Pembayaran Iuran | ✅ | Pencatatan pembayaran dengan historis multi-tahun |
| Laporan Keuangan | ✅ | Laporan tahunan lengkap dengan statistik per blok |
| Pengaturan Yayasan | ✅ | Konfigurasi nama yayasan, logo, dan kontak |
| Backup/Restore | ✅ | Backup manual/export database SQLite |
| Tahun Aktif Otomatis | ✅ | Mengikuti tahun dari sistem komputer |
| UI Modern | ✅ | Tampilan bersih dengan Tailwind CSS |
| Docker Support | ✅ | Development dengan Docker tanpa install Rust |

> **Developer?** Lihat **[DEVELOPMENT.md](./DEVELOPMENT.md)** untuk panduan setup dan development.

> **Keterangan:** ✅ = Ready | 🚧 = In Progress | ❌ = Not Started

---

## 🖥️ Halaman Aplikasi

| Halaman | Deskripsi | Status |
|---------|-----------|--------|
| **Dashboard** | Ringkasan statistik, peringatan penting, pembayaran terbaru | ✅ |
| **Data Blok** | Manajemen blok makam (CRUD), kapasitas, dan tarif iuran | ✅ |
| **Data Makam** | Daftar almarhum, data ahli waris, filter dan pencarian | ✅ |
| **Pembayaran** | Input pembayaran iuran, status lunas/belum per tahun | ✅ |
| **Laporan** | Statistik pembayaran, tunggakan, dan makam baru per tahun | ✅ |
| **Pengaturan** | Profil yayasan dengan logo, backup/restore database | ✅ |

---

## 🚀 Cara Install & Menjalankan

### Prerequisites

Pastikan telah terinstall **salah satu** dari:
- **Docker** (untuk development dengan container)
- [Rust](https://rustup.rs/) (versi 1.88.0 atau lebih baru)
- System dependencies (sesuai OS - lihat detail di bawah)
- Sistem operasi: Windows, macOS, atau Linux

> ⚠️ **Catatan:** Project ini **tidak menggunakan Node.js/npm**. Aplikasi ini pure Tauri (Rust) dengan frontend vanilla HTML/CSS/JS.

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

**Keuntungan Docker:**
- Tidak perlu install Rust di komputer
- Environment konsisten antar developer
- Auto hot-reload saat development

### Option 2: Development Native (Dengan Rust)

Untuk panduan setup lengkap di mesin baru, lihat **[DEVELOPMENT.md](./DEVELOPMENT.md)**

### Quick Start (jika semua prerequisites sudah terinstall)

```bash
# 1. Clone repository
git clone <repository-url>
cd astana

# 2. Install Tauri CLI (satu kali saja)
cargo install tauri-cli

# 3. Jalankan aplikasi (development mode)
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
│   ├── blok.js                  # JS untuk Data Blok
│   ├── data-makam.html          # Data Makam
│   ├── data-makam.js            # JS untuk Data Makam
│   ├── pembayaran.html          # Pembayaran
│   ├── pembayaran.js            # JS untuk Pembayaran
│   ├── laporan.html             # Laporan
│   ├── laporan.js               # JS untuk Laporan
│   ├── pengaturan.html          # Pengaturan
│   ├── pengaturan.js            # JS untuk Pengaturan
│   ├── main.js                  # Main JavaScript utilities
│   └── styles.css               # Styles global
│
├── src-tauri/                   # Backend (Rust)
│   ├── src/
│   │   ├── main.rs              # Entry point Rust
│   │   ├── lib.rs               # Library & Tauri commands
│   │   └── db.rs                # Database module (SQLite)
│   ├── migrations/
│   │   └── 001_initial.sql      # Database schema
│   ├── Cargo.toml               # Dependencies Rust
│   └── tauri.conf.json          # Konfigurasi Tauri
│
├── docker/                      # Docker configuration
│   ├── Dockerfile               # Docker image definition
│   ├── docker-compose.yml       # Docker compose services
│   └── entrypoint.sh            # Container entrypoint
│
├── scripts/                     # Helper scripts
│   ├── docker-dev.sh            # Script untuk dev dengan Docker
│   ├── docker-build.sh          # Script untuk build dengan Docker
│   └── docker-shell.sh          # Script untuk shell access
│
├── DATABASE_SCHEMA.md           # Dokumentasi skema database
├── DEVELOPMENT.md               # Panduan development lengkap
└── README.md                    # File ini
```

> **Catatan:** Project ini tidak memiliki `package.json` karena menggunakan **Tauri v2** dengan frontend vanilla HTML/CSS/JS. Tailwind CSS di-load via CDN, jadi tidak perlu build step untuk frontend.

---

## 💾 Database

Aplikasi menggunakan **SQLite** sebagai database lokal.

### Lokasi Database

| Platform | Lokasi |
|----------|--------|
| Windows | `%LOCALAPPDATA%\com.perogeremmer.astana\astana.db` |
| macOS | `~/Library/Application Support/com.perogeremmer.astana/astana.db` |
| Linux | `~/.local/share/com.perogeremmer.astana/astana.db` |
| Docker | `/home/appuser/.local/share/com.perogeremmer.astana/astana.db` |

### Skema Database

Lihat detail lengkap di **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)**

### Tabel Utama

- **blocks** - Data blok makam & tarif iuran
- **graves** - Data almarhum
- **heirs** - Data ahli waris (1-3 per makam)
- **payments** - Historis pembayaran iuran
- **settings** - Konfigurasi aplikasi (nama yayasan, logo, tahun aktif)

---

## 📝 Penggunaan Dasar

### 1. Setup Awal
- Buka menu **Pengaturan**
- Isi nama yayasan/makam
- Upload logo yayasan (opsional)
- Klik "Simpan Perubahan"

### 2. Manajemen Blok
- Buka menu **Data Blok**
- Tambahkan blok makam sesuai kebutuhan (A, B, C, dst)
- Atur kapasitas dan tarif iuran per blok

### 3. Input Data Makam
- Buka menu **Data Makam**
- Klik "Tambah Data"
- Isi data almarhum, pilih blok & nomor makam
- Tambahkan data ahli waris (minimal 1, maksimal 3)

### 4. Pembayaran Iuran
- Buka menu **Pembayaran**
- Pilih makam & tahun pembayaran (tahun aktif otomatis dari komputer)
- Input jumlah dan metode pembayaran

### 5. Laporan
- Buka menu **Laporan**
- Pilih tahun untuk melihat statistik
- Lihat detail per blok: total makam, sudah/belum bayar, pendapatan

### 6. Backup Database
- Buka menu **Pengaturan**
- Klik "Backup Sekarang" untuk menyimpan ke file
- Atau klik "Export ke File" untuk menyimpan di lokasi pilihan

---

## 🔧 Commands Tauri (Backend)

Aplikasi ini menyediakan berbagai command Tauri untuk komunikasi antara frontend dan backend:

### Database Commands
- `get_database_path` - Mendapatkan path file database
- `get_database_stats` - Statistik database (ukuran, jumlah record)
- `backup_database` - Backup database ke file

### Block Commands
- `get_blocks` - Mendapatkan semua blok
- `get_block_by_id` - Mendapatkan blok berdasarkan ID
- `create_block` - Membuat blok baru
- `update_block` - Update data blok
- `delete_block` - Hapus blok
- `get_block_stats` - Statistik blok (kapasitas, terisi, tersedia)

### Grave Commands
- `get_graves` - Mendapatkan daftar makam
- `get_grave_by_id` - Detail makam berdasarkan ID
- `create_grave_with_heirs` - Buat makam baru dengan ahli waris
- `update_grave` - Update data makam
- `delete_grave` - Hapus makam
- `get_grave_detail` - Detail lengkap makam

### Payment Commands
- `get_payments_by_grave` - Historis pembayaran per makam
- `create_payment` - Catat pembayaran baru
- `update_payment` - Update data pembayaran
- `delete_payment` - Hapus pembayaran

### Report Commands
- `get_yearly_report` - Laporan tahunan lengkap
- `get_available_years` - Daftar tahun yang tersedia

### Settings Commands
- `get_settings` - Ambil pengaturan aplikasi
- `update_settings` - Update pengaturan
- `upload_logo` - Upload logo yayasan
- `get_logo_data` - Ambil data logo sebagai base64

---

## 🔧 Troubleshooting

Lihat **[DEVELOPMENT.md](./DEVELOPMENT.md)** untuk panduan troubleshooting lengkap.

### Masalah Umum

| Masalah | Solusi |
|---------|--------|
| Build gagal / linker error | Install system dependencies (lihat DEVELOPMENT.md) |
| Database tidak terbaca | Cek permission folder aplikasi |
| Error saat build | Pastikan semua prerequisites terinstall |
| `cargo tauri` command not found | Install Tauri CLI: `cargo install tauri-cli` |
| Docker build gagal | Pastikan Docker daemon running dan permission user |

### Update Rust

```bash
rustup update
```

### Bersihkan Cache Build

```bash
cd src-tauri
cargo clean
cargo tauri build
```

### Docker Permission Issue

```bash
# Tambahkan user ke group docker (Linux)
sudo usermod -aG docker $USER

# Logout dan login ulang
```

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

## 🔄 Changelog

### v0.1.0
- ✅ Initial release
- ✅ Manajemen blok, makam, dan pembayaran
- ✅ Laporan tahunan dengan statistik per blok
- ✅ Pengaturan yayasan dengan logo upload
- ✅ Backup dan restore database
- ✅ Docker support untuk development
- ✅ Tahun aktif otomatis dari sistem komputer

---

*Terima kasih telah menggunakan Astana - Sistem Wakaf Makam!* 🕌✨
