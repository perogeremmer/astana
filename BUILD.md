# Build Instructions for Windows

## Target: Windows 10 64-bit

### Option 1: GitHub Actions (Recommended)
The easiest way to build for Windows is using GitHub Actions. The workflow is already configured in `.github/workflows/build.yml`.

**Steps:**
1. Push your code to GitHub
2. Go to Actions tab
3. Run the "Build Windows Installer" workflow
4. Download the installer from the artifacts

### Option 2: Build on Windows Machine
If you have access to a Windows 10/11 machine:

**Prerequisites:**
- Install [Node.js 20+](https://nodejs.org/)
- Install [Rust](https://rustup.rs/)
- Install Visual Studio Build Tools with C++ workload

**Build Steps:**
```powershell
# Clone repository
git clone https://github.com/perogeremmer/astana.git
cd astana

# Install dependencies
cd src-tauri
cargo fetch

# Build Windows installer
cargo tauri build --target x86_64-pc-windows-msvc
```

**Output:**
- Installer: `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/*.exe`
- Portable: `src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/*.msi`

### Option 3: Docker Build (Linux Host)
If you're on Linux and have Docker:

```bash
# Build Docker image
docker build -f Dockerfile.windows -t astana-windows-builder .

# Run build
docker run -v $(pwd):/app astana-windows-builder

# Copy output from container
docker cp $(docker ps -lq):/app/src-tauri/target/x86_64-pc-windows-gnu/release/bundle ./windows-build
```

### Option 4: Cross-compile from Linux (Limited)
Cross-compiling Tauri apps from Linux to Windows has limitations because:
- Tauri uses WebView2 (Windows-specific)
- NSIS installer requires Windows
- Some dependencies are platform-specific

**Note:** Option 1 or 2 is highly recommended for production builds.

## Release Checklist

Before releasing:
- [ ] Test installer on Windows 10
- [ ] Test installer on Windows 11
- [ ] Verify database migration works
- [ ] Check all features work offline
- [ ] Test backup/restore functionality
- [ ] Verify icons display correctly

## Troubleshooting

### Build fails with "linker not found"
Install mingw-w64:
```bash
# Ubuntu/Debian
sudo apt-get install mingw-w64

# macOS
brew install mingw-w64
```

### NSIS not found
Install NSIS on Linux:
```bash
sudo apt-get install nsis
```

Or disable NSIS in `tauri.conf.json`:
```json
"bundle": {
  "targets": ["msi"]
}
```

### WebView2 not available on build machine
The WebView2 runtime is required on the target Windows machine, not the build machine. Users will need to install it if not present.