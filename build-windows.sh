#!/bin/bash

# Build script for Astana Windows installer

set -e

echo "🕌 Astana - Windows Build Script"
echo "================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on Windows
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
    echo -e "${GREEN}✓ Running on Windows${NC}"
    IS_WINDOWS=true
else
    echo -e "${YELLOW}⚠ Running on Linux/macOS${NC}"
    echo "  Windows cross-compilation requires additional setup."
    IS_WINDOWS=false
fi

# Check prerequisites
echo ""
echo "Checking prerequisites..."

# Check Rust
if ! command -v rustc &> /dev/null; then
    echo -e "${RED}✗ Rust not found${NC}"
    echo "  Install from: https://rustup.rs/"
    exit 1
fi
echo -e "${GREEN}✓ Rust found${NC}: $(rustc --version)"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not found${NC}"
    echo "  Install from: https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓ Node.js found${NC}: $(node --version)"

# Check Tauri CLI
if ! command -v cargo-tauri &> /dev/null; then
    echo -e "${YELLOW}⚠ Tauri CLI not found, installing...${NC}"
    cargo install tauri-cli
fi
echo -e "${GREEN}✓ Tauri CLI found${NC}"

# Check for Windows dependencies on Linux
if [ "$IS_WINDOWS" = false ]; then
    echo ""
    echo "Checking Windows cross-compilation dependencies..."
    
    # Check mingw
    if ! command -v x86_64-w64-mingw32-gcc &> /dev/null; then
        echo -e "${RED}✗ mingw-w64 not found${NC}"
        echo "  Install with: sudo apt-get install mingw-w64"
        echo ""
        echo -e "${YELLOW}Alternative: Use GitHub Actions (see BUILD.md)${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ mingw-w64 found${NC}"
    
    # Check if Windows target is installed
    if ! rustup target list --installed | grep -q "x86_64-pc-windows-gnu"; then
        echo -e "${YELLOW}⚠ Windows target not installed, adding...${NC}"
        rustup target add x86_64-pc-windows-gnu
    fi
    echo -e "${GREEN}✓ Windows target installed${NC}"
fi

# Change to project directory
cd "$(dirname "$0")"

echo ""
echo "Building Astana..."
echo ""

cd src-tauri

if [ "$IS_WINDOWS" = true ]; then
    # Build on Windows
    echo "Building for Windows (MSVC)..."
    cargo tauri build --target x86_64-pc-windows-msvc
    
    echo ""
    echo -e "${GREEN}✓ Build complete!${NC}"
    echo ""
    echo "Installer location:"
    echo "  target/x86_64-pc-windows-msvc/release/bundle/nsis/*.exe"
    echo ""
    echo "Portable version:"
    echo "  target/x86_64-pc-windows-msvc/release/bundle/msi/*.msi"
else
    # Build on Linux (cross-compile)
    echo "Building for Windows (cross-compile)..."
    echo -e "${YELLOW}⚠ Note: Cross-compilation may have limitations${NC}"
    echo ""
    
    cargo tauri build --target x86_64-pc-windows-gnu || {
        echo ""
        echo -e "${RED}✗ Build failed${NC}"
        echo ""
        echo "Common issues:"
        echo "  1. Missing mingw-w64: sudo apt-get install mingw-w64"
        echo "  2. Missing NSIS: sudo apt-get install nsis"
        echo "  3. Missing dependencies: sudo apt-get install libgtk-3-dev libwebkit2gtk-4.0-dev"
        echo ""
        echo "Alternative: Use GitHub Actions (recommended)"
        echo "  See: BUILD.md"
        exit 1
    }
    
    echo ""
    echo -e "${GREEN}✓ Build complete!${NC}"
    echo ""
    echo "Build location:"
    echo "  target/x86_64-pc-windows-gnu/release/bundle/"
fi

echo ""
echo "🎉 Done!"