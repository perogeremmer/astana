#!/bin/bash

# Build Tailwind CSS for Astana
# Works on Linux and macOS
# For Windows, use build-css.ps1

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}🔨 Building Tailwind CSS...${NC}"

# Detect OS
OS="$(uname -s)"
TAILWIND_VERSION="3.4.1"

# Set download URL based on OS
case "$OS" in
    Linux*)
        if [[ "$(uname -m)" == "aarch64" ]]; then
            TAILWIND_URL="https://github.com/tailwindlabs/tailwindcss/releases/download/v${TAILWIND_VERSION}/tailwindcss-linux-arm64"
        else
            TAILWIND_URL="https://github.com/tailwindlabs/tailwindcss/releases/download/v${TAILWIND_VERSION}/tailwindcss-linux-x64"
        fi
        ;;
    Darwin*)
        if [[ "$(uname -m)" == "arm64" ]]; then
            TAILWIND_URL="https://github.com/tailwindlabs/tailwindcss/releases/download/v${TAILWIND_VERSION}/tailwindcss-macos-arm64"
        else
            TAILWIND_URL="https://github.com/tailwindlabs/tailwindcss/releases/download/v${TAILWIND_VERSION}/tailwindcss-macos-x64"
        fi
        ;;
    *)
        echo -e "${RED}❌ Unsupported OS: $OS${NC}"
        echo "For Windows, use build-css.ps1"
        exit 1
        ;;
esac

# Set paths
TAILWIND_BIN="/tmp/tailwindcss-astana"
INPUT_CSS="src/input.css"
OUTPUT_CSS="src/assets/css/tailwind.min.css"

# Check if input.css exists
if [ ! -f "$INPUT_CSS" ]; then
    echo -e "${RED}❌ Error: $INPUT_CSS not found${NC}"
    exit 1
fi

# Download Tailwind CLI if not exists or outdated
if [ ! -f "$TAILWIND_BIN" ]; then
    echo -e "${YELLOW}📥 Downloading Tailwind CSS CLI...${NC}"
    curl -L -o "$TAILWIND_BIN" "$TAILWIND_URL"
    chmod +x "$TAILWIND_BIN"
    echo -e "${GREEN}✅ Tailwind CSS CLI downloaded${NC}"
else
    echo -e "${GREEN}✅ Using existing Tailwind CSS CLI${NC}"
fi

# Create output directory if not exists
mkdir -p "$(dirname "$OUTPUT_CSS")"

# Build CSS
echo -e "${YELLOW}⚙️  Building CSS...${NC}"
"$TAILWIND_BIN" -i "$INPUT_CSS" -o "$OUTPUT_CSS" --minify

# Check if build succeeded
if [ $? -eq 0 ]; then
    FILE_SIZE=$(du -h "$OUTPUT_CSS" | cut -f1)
    echo -e "${GREEN}✅ Tailwind CSS built successfully!${NC}"
    echo -e "${GREEN}📄 Output: $OUTPUT_CSS ($FILE_SIZE)${NC}"
else
    echo -e "${RED}❌ Failed to build Tailwind CSS${NC}"
    exit 1
fi
