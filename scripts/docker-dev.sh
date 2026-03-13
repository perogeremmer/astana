#!/bin/bash

# docker-dev.sh - Run Astana in development mode with hot reload and GUI
# Usage: ./scripts/docker-dev.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_COMPOSE="docker compose -f $PROJECT_ROOT/docker/docker-compose.yml"

echo -e "${GREEN}🕌 Astana - Development Mode${NC}"
echo "================================"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not available. Please install Docker Compose.${NC}"
    exit 1
fi

# Get current user/group IDs for permission mapping
export LOCAL_USER_ID=$(id -u)
export LOCAL_GROUP_ID=$(id -g)

# Detect OS for X11 setup
OS="$(uname -s)"
case "$OS" in
    Linux*)
        echo -e "${YELLOW}🐧 Linux detected${NC}"
        # Allow X11 access from Docker
        xhost +local:docker 2>/dev/null || true
        ;;
    Darwin*)
        echo -e "${YELLOW}🍎 macOS detected${NC}"
        echo -e "${YELLOW}⚠️  Note: GUI display on macOS requires XQuartz${NC}"
        echo "   Install: brew install --cask xquartz"
        echo "   Then run: open -a XQuartz"
        # macOS X11 forwarding setup
        export DISPLAY=host.docker.internal:0
        ;;
    CYGWIN*|MINGW*|MSYS*)
        echo -e "${YELLOW}🪟 Windows detected${NC}"
        echo -e "${YELLOW}⚠️  Note: Windows requires VcXsrv or similar X server${NC}"
        ;;
esac

echo ""
echo -e "${YELLOW}📋 Configuration:${NC}"
echo "   User ID: $LOCAL_USER_ID"
echo "   Group ID: $LOCAL_GROUP_ID"
echo "   Display: $DISPLAY"
echo ""

# Build image if not exists
echo -e "${YELLOW}🔨 Building Docker image (if needed)...${NC}"
$DOCKER_COMPOSE build dev

echo ""
echo -e "${GREEN}🚀 Starting Astana in development mode...${NC}"
echo -e "${YELLOW}💡 Tip: Edit files in your editor - changes will auto-reload!${NC}"
echo ""

# Run the development container
$DOCKER_COMPOSE run --rm --service-ports dev

# Cleanup
echo ""
echo -e "${GREEN}✅ Development session ended${NC}"
