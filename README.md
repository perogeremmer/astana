# 🕌 Astana - Manajemen Iuran Makam

Aplikasi desktop untuk manajemen data makam dan iuran makam berbasis [Tauri](https://tauri.app/) (Rust + HTML/CSS/JS). Dirancang khusus untuk memudahkan petugas makam dalam mengelola data almarhum, ahli waris, pembayaran iuran, dan pelaporan.

![Tauri](https://img.shields.io/badge/Tauri-2.0-blue?logo=tauri)
![Rust](https://img.shields.io/badge/Rust-000000?logo=rust)
![SQLite](https://img.shields.io/badge/SQLite-003B57?logo=sqlite)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📋 Fitur Utama

| Fitur | Status | Keterangan |
|-------|--------|------------|
| Manajemen Data Blok | ✅ | CRUD blok makam dengan kapasitas & tarif iuran |
| Data Makam | ✅ | Pencatatan data almarhum dan ahli waris (1-3 orang) |
| Pembayaran Iuran | 🚧 | Pencatatan pembayaran dengan historis multi-tahun |
| Laporan Keuangan | 🚧 | Rekap pembayaran dan tunggakan per blok |
| Pengaturan | ✅ | Konfigurasi yayasan |
| Backup/Restore | 🚧 | Backup otomatis & restore database |
| UI Modern | ✅ | Tampilan bersih dengan Tailwind CSS |

> **Keterangan:** ✅ = Ready | 🚧 = In Progress | ❌ = Not Started

---

## 🖥️ Halaman Aplikasi

| Halaman | Deskripsi | Status |
|---------|-----------|--------|
| **Dashboard** | Ringkasan statistik, peringatan penting, pembayaran terbaru | 🚧 |
| **Data Blok** | Manajemen blok makam (CRUD), kapasitas, dan tarif iuran | ✅ |
| **Data Makam** | Daftar almarhum, data ahli waris, filter dan pencarian | ✅ |
| **Pembayaran** | Input pembayaran iuran, status lunas/belum per tahun | 🚧 |
| **Laporan** | Statistik pembayaran, tunggakan, dan makam baru per tahun | 🚧 |
| **Pengaturan** | Profil yayasan, backup/restore database | ✅ |

---

## 🚀 Cara Install & Menjalankan

### Prerequisites

Pastikan telah terinstall:
- [Rust](https://rustup.rs/) (versi terbaru)
- [Node.js](https://nodejs.org/) (versi 18+)
- Sistem operasi: Windows, macOS, atau Linux

### 1. Clone Repository

```bash
git clone <repository-url>
cd astana
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Jalankan Aplikasi (Development)

```bash
npm run tauri dev
```

### 4. Build Aplikasi (Production)

```bash
npm run tauri build
```

> Hasil build akan ada di `src-tauri/target/release/`

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
│   ├── laporan.html             # Laporan
│   ├── pengaturan.html          # Pengaturan
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
├── DATABASE_SCHEMA.md           # Dokumentasi skema database
└── README.md                    # File ini
```

---

## 💾 Database

Aplikasi menggunakan **SQLite** sebagai database lokal.

### Lokasi Database

| Platform | Lokasi |
|----------|--------|
| Windows | `%LOCALAPPDATA%\com.perogeremmer.astana\astana.db` |
| macOS | `~/Library/Application Support/com.perogeremmer.astana/astana.db` |
| Linux | `~/.local/share/com.perogeremmer.astana/astana.db` |

### Skema Database

Lihat detail lengkap di **[DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)**

### Tabel Utama

- **blocks** - Data blok makam & tarif iuran
- **graves** - Data almarhum
- **heirs** - Data ahli waris (1-3 per makam)
- **payments** - Historis pembayaran iuran
- **settings** - Konfigurasi aplikasi

---

## 📝 Penggunaan Dasar

### 1. Setup Awal
- Buka menu **Data Blok**
- Tambahkan blok makam sesuai kebutuhan (A, B, C, dst)
- Atur kapasitas dan tarif iuran per blok

### 2. Input Data Makam
- Buka menu **Data Makam**
- Klik "Tambah Data"
- Isi data almarhum, pilih blok & nomor makam
- Tambahkan data ahli waris (minimal 1, maksimal 3)

### 3. Pembayaran Iuran
- Buka menu **Pembayaran**
- Pilih makam & tahun pembayaran
- Input jumlah dan metode pembayaran

### 4. Backup Database
- Buka menu **Pengaturan**
- Klik "Backup Database" untuk menyimpan ke file

---

## 🔧 Troubleshooting

### Masalah Build

```bash
# Update Rust ke versi terbaru
rustup update

# Bersihkan cache build
cargo clean
npm run tauri build
```

### Masalah Runtime

| Masalah | Solusi |
|---------|--------|
| Database tidak terbaca | Cek permission folder aplikasi |
| Port sudah digunakan | Tutup aplikasi lain atau restart PC |
| Error saat build | Pastikan semua prerequisites terinstall |

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

---

## 📞 Dukungan

Jika mengalami masalah atau butuh bantuan:
1. Cek dokumentasi Tauri: https://tauri.app/v1/guides/
2. Lihat DATABASE_SCHEMA.md untuk detail database
3. Buat issue di repository

---

*Terima kasih telah menggunakan Astana - Sistem Wakaf Makam!* 🕌✨
