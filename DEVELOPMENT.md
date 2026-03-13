# 🛠️ Development Guide - Astana

Panduan lengkap untuk setup dan development proyek Astana di mesin baru.

## 📋 Prerequisites (Wajib)

### 1. Install Rust

```bash
# Install Rust via rustup
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Atau untuk Windows, download dari: https://rustup.rs/

# Verifikasi instalasi
rustc --version
cargo --version
```

### 2. Install System Dependencies

#### Linux (Ubuntu/Debian)

```bash
sudo apt update
sudo apt install -y \
    libwebkit2gtk-4.1-dev \
    libgtk-3-dev \
    libjavascriptcoregtk-4.1-dev \
    libsoup-3.0-dev \
    libappindicator3-dev \
    librsvg2-dev \
    patchelf \
    pkg-config \
    build-essential
```

#### Linux (Fedora/RHEL)

```bash
sudo dnf install -y \
    webkit2gtk4.1-devel \
    gtk3-devel \
    javascriptcoregtk4.1-devel \
    libsoup3-devel \
    libappindicator-gtk3-devel \
    librsvg2-devel \
    patchelf \
    pkgconfig \
    gcc
```

#### macOS

```bash
# Install Xcode Command Line Tools
xcode-select --install

# Install Homebrew (jika belum)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install pkg-config
```

#### Windows

1. Install **Microsoft Visual Studio C++ Build Tools**:
   - Download dari: https://visualstudio.microsoft.com/visual-cpp-build-tools/
   - Install "Desktop development with C++" workload
   - Atau minimal install: MSVC v143, Windows 10/11 SDK, C++ CMake tools

2. Install **WebView2 Runtime** (biasanya sudah ada di Windows 10/11)

### 3. Install Tauri CLI

```bash
cargo install tauri-cli

# Verifikasi
cargo tauri --version
```

---

## 🚀 Setup Project

### 1. Clone Repository

```bash
git clone <repository-url>
cd astana
```

### 2. Build Project (Pertama Kali)

```bash
# Build untuk development
cargo tauri dev

# Atau masuk ke src-tauri dan build
cd src-tauri
cargo build
```

**Catatan Penting:**
- Build pertama akan mengunduh dan mengkompilasi semua dependencies Rust (bisa memakan waktu 5-15 menit)
- Database SQLite akan dibuat otomatis saat pertama kali aplikasi berjalan
- Lokasi database akan muncul di console log

---

## 📝 Development Workflow

### Mode Development (Hot Reload)

```bash
# Jalankan dengan hot reload (frontend auto-reload saat file berubah)
cargo tauri dev
```

Fitur:
- Frontend auto-reload saat file HTML/JS/CSS diubah
- Rust backend ter-rebuild otomatis
- Console log muncul di terminal

### Build Production

```bash
# Build untuk production
cargo tauri build

# Build hanya untuk platform tertentu (Linux)
cargo tauri build --target x86_64-unknown-linux-gnu
```

Hasil build akan ada di:
- **Linux**: `src-tauri/target/release/bundle/`
- **macOS**: `src-tauri/target/release/bundle/`
- **Windows**: `src-tauri/target/release/bundle/`

---

## 🐳 Docker Setup (Recommended)

**Keuntungan menggunakan Docker:**
- ✅ Tidak perlu install Rust/system dependencies di host
- ✅ Sama persis di semua OS (Ubuntu 20/22/24, Windows, macOS)
- ✅ Isolated environment - no "works on my machine" issues
- ✅ Hot reload tetap berfungsi
- ✅ GUI ditampilkan di desktop host

### Prerequisites Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Atau untuk Ubuntu:
sudo apt update
sudo apt install -y docker.io docker-compose-plugin

# Verifikasi
docker --version
docker compose version
```

### Quick Start dengan Docker

#### 1. Development Mode (dengan GUI)

```bash
# Jalankan development dengan hot reload dan GUI
./scripts/docker-dev.sh

# Atau manual:
docker compose -f docker/docker-compose.yml run --rm dev
```

**Fitur:**
- ✅ GUI muncul di desktop host via X11 forwarding
- ✅ Edit file di host → Auto-reload di container
- ✅ Database persist di Docker volume
- ✅ User permissions otomatis mapped

#### 2. Build Production

```bash
# Build semua format (AppImage, DEB, etc.)
./scripts/docker-build.sh

# Build AppImage only
./scripts/docker-build.sh --appimage

# Build DEB only
./scripts/docker-build.sh --deb
```

**Output:** Binary ada di folder `dist/`

#### 3. Shell Access (untuk debugging)

```bash
# Masuk ke container untuk debugging manual
./scripts/docker-shell.sh

# Commands yang tersedia di dalam container:
# - cargo tauri dev
# - cargo tauri build
# - cargo check
# - cargo test
# - sqlite3 ~/.local/share/com.perogeremmer.astana/astana.db
```

### Docker Services

#### Service: `dev`
- **Purpose:** Development dengan hot reload
- **GUI:** Yes (X11 forwarding)
- **Volumes:** Source code, database, cargo cache
- **Command:** `cargo tauri dev`

#### Service: `build`
- **Purpose:** Build all production formats
- **Output:** `dist/` folder
- **Command:** `cargo tauri build`

#### Service: `build-appimage`
- **Purpose:** Build AppImage only
- **Output:** `dist/*.AppImage`

#### Service: `build-deb`
- **Purpose:** Build DEB package only
- **Output:** `dist/*.deb`

#### Service: `shell`
- **Purpose:** Interactive shell untuk debugging
- **Access:** Manual commands

### Docker Configuration

#### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `LOCAL_USER_ID` | 1000 | User ID host (untuk permission) |
| `LOCAL_GROUP_ID` | 1000 | Group ID host (untuk permission) |
| `DISPLAY` | :0 | X11 display port |
| `RUST_LOG` | debug | Logging level |

#### Volumes

| Volume | Purpose |
|--------|---------|
| `./src` | Frontend source (hot reload) |
| `./src-tauri/src` | Backend source (hot reload) |
| `astana-data` | Database persistence |
| `/tmp/.X11-unix` | X11 socket (GUI) |
| `cargo-cache` | Cargo registry cache |
| `target-cache` | Build cache |

### Troubleshooting Docker

#### Issue: GUI tidak muncul (Linux)

```bash
# Allow Docker access to X11
xhost +local:docker

# Atau
xhost +
```

#### Issue: Permission denied di folder project

```bash
# Fix permission
sudo chown -R $(id -u):$(id -g) .

# Atau rebuild dengan user ID yang benar
LOCAL_USER_ID=$(id -u) LOCAL_GROUP_ID=$(id -g) ./scripts/docker-dev.sh
```

#### Issue: Container tidak bisa start

```bash
# Rebuild image
docker compose -f docker/docker-compose.yml build --no-cache

# Clean volumes (⚠️ akan hapus database!)
docker compose -f docker/docker-compose.yml down -v
```

#### Issue: Port冲突/Address already in use

```bash
# Kill existing containers
docker compose -f docker/docker-compose.yml down

# Force remove
docker rm -f astana-dev astana-build 2>/dev/null || true
```

---

## 🧪 Testing

### Run Tests

```bash
cd src-tauri
cargo test
```

### Check Code

```bash
cd src-tauri
cargo check
```

### Linting

```bash
cd src-tauri
cargo clippy
```

---

## 🐛 Troubleshooting

### Masalah: `linker 'cc' not found` (Linux)

**Solusi:**
```bash
sudo apt install build-essential
# atau
sudo dnf install gcc
```

### Masalah: `pkg-config not found`

**Solusi:**
```bash
# Ubuntu/Debian
sudo apt install pkg-config

# Fedora
sudo dnf install pkgconfig

# macOS
brew install pkg-config
```

### Masalah: `libwebkit2gtk-4.1-dev not found`

**Solusi:** Pastikan menggunakan versi yang benar:
```bash
# Ubuntu 22.04+
sudo apt install libwebkit2gtk-4.1-dev

# Ubuntu 20.04 (gunakan versi 4.0)
sudo apt install libwebkit2gtk-4.0-dev
```

### Masalah: Build sangat lambat

**Solusi:**
1. Gunakan release mode untuk build lebih cepat:
   ```bash
   cargo build --release
   ```
2. Atau gunakan sccache untuk caching:
   ```bash
   cargo install sccache
   export RUSTC_WRAPPER=sccache
   ```

### Masalah: Error WebView2 di Windows

**Solusi:**
1. Install WebView2 Runtime: https://developer.microsoft.com/en-us/microsoft-edge/webview2/
2. Atau install Edge Chromium

### Masalah: Permission denied saat build

**Solusi:**
```bash
# Linux/macOS
chmod +x src-tauri/target/release/

# Atau hapus folder target dan rebuild
rm -rf src-tauri/target
cargo tauri dev
```

### Masalah: Database error / sqlite error

**Solusi:**
1. Hapus database lama (jika korup):
   ```bash
   # Linux
   rm ~/.local/share/com.perogeremmer.astana/astana.db
   
   # macOS
   rm ~/Library/Application\ Support/com.perogeremmer.astana/astana.db
   
   # Windows
   # Hapus di %LOCALAPPDATA%\com.perogeremmer.astana\astana.db
   ```
2. Jalankan ulang aplikasi, database baru akan dibuat otomatis

---

## 📁 Struktur Project (Development)

```
astana/
├── src/                          # Frontend (HTML/CSS/JS - No build step)
│   ├── index.html               # Dashboard
│   ├── blok.html/js             # Data Blok
│   ├── data-makam.html/js       # Data Makam
│   ├── pembayaran.html/js       # Pembayaran
│   ├── main.js                  # Utility functions
│   └── styles.css               # Global styles
│
├── src-tauri/                   # Backend (Rust)
│   ├── src/
│   │   ├── main.rs              # Entry point
│   │   ├── lib.rs               # Tauri commands
│   │   └── db.rs                # Database module
│   ├── migrations/              # SQL migrations
│   ├── Cargo.toml               # Rust dependencies
│   └── tauri.conf.json          # Tauri config
│
├── DEVELOPMENT.md               # File ini
└── README.md                    # User documentation
```

**Catatan:** Project ini menggunakan **Tauri v2** dengan frontend vanilla HTML/CSS/JS (tanpa framework seperti React/Vue). Tidak ada `package.json` karena tidak menggunakan Node.js build tools.

---

## 🔧 Development Tips

### 1. Mengakses Database saat Development

Database SQLite dapat diakses dengan tool seperti:
- **DB Browser for SQLite**: https://sqlitebrowser.org/
- **SQLite CLI**:
  ```bash
  sqlite3 ~/.local/share/com.perogeremmer.astana/astana.db
  ```

### 2. Environment Variables

Tidak perlu environment variables khusus untuk development.

### 3. Logging

Aplikasi menggunakan `env_logger` untuk logging. Set level log dengan:

```bash
# Linux/macOS
RUST_LOG=debug cargo tauri dev

# Windows (PowerShell)
$env:RUST_LOG="debug"; cargo tauri dev

# Windows (CMD)
set RUST_LOG=debug && cargo tauri dev
```

### 4. Hot Reload Limitations

- Perubahan pada file **Rust** memerlukan rebuild (otomatis)
- Perubahan pada file **HTML/CSS/JS** langsung terlihat di browser window

---

## 📦 Dependencies Utama

### Rust (Cargo.toml)
- `tauri` - Desktop framework
- `rusqlite` - SQLite database dengan bundled feature
- `serde` - Serialization
- `log` + `env_logger` - Logging
- `tauri-plugin-*` - Plugins untuk dialog, OS info, dll

### Frontend
- **Tailwind CSS** - via CDN (tidak perlu build)
- **Vanilla JavaScript** - No framework

---

## ✅ Checklist Setup Mesin Baru

- [ ] Install Rust (via rustup)
- [ ] Install system dependencies (sesuai OS)
- [ ] Install Tauri CLI (`cargo install tauri-cli`)
- [ ] Clone repository
- [ ] Run `cargo tauri dev`
- [ ] Tunggu build pertama selesai (5-15 menit)
- [ ] Verifikasi aplikasi berjalan

---

## 🆘 Butuh Bantuan?

1. Cek dokumentasi Tauri: https://tauri.app/v2/guides/
2. Lihat README.md untuk panduan penggunaan aplikasi
3. Cek DATABASE_SCHEMA.md untuk struktur database
4. Buat issue di repository jika menemukan bug

---

**Happy Coding!** 🚀
