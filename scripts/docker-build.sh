#!/bin/bash

# docker-build.sh - Build Astana production binaries using Docker
# Usage: 
#   ./scripts/docker-build.sh              # Build all formats
#   ./scripts/docker-build.sh --appimage   # Build AppImage only
#   ./scripts/docker-build.sh --deb        # Build DEB only
#   ./scripts/docker-build.sh --all        # Build all formats explicitly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCKER_COMPOSE="docker compose -f $PROJECT_ROOT/docker/docker-compose.yml"

# Parse arguments
BUILD_TYPE="${1:---all}"

echo -e "${GREEN}🔨 Astana - Production Build${NC}"
echo "=============================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Get current user/group IDs
export LOCAL_USER_ID=$(id -u)
export LOCAL_GROUP_ID=$(id -g)

# Create dist directory
mkdir -p "$PROJECT_ROOT/dist"

echo ""
echo -e "${YELLOW}📋 Build Configuration:${NC}"
echo "   User ID: $LOCAL_USER_ID"
echo "   Group ID: $LOCAL_GROUP_ID"
echo "   Output: $PROJECT_ROOT/dist/"
echo ""

# Build function
build_service() {
    local service=$1
    local name=$2
    
    echo -e "${BLUE}🔨 Building $name...${NC}"
    $DOCKER_COMPOSE run --rm "$service"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $name built successfully!${NC}"
    else
        echo -e "${RED}❌ Failed to build $name${NC}"
        return 1
    fi
}

# Build based on argument
case "$BUILD_TYPE" in
    --appimage)
        build_service "build-appimage" "AppImage"
        ;;
    --deb)
        build_service "build-deb" "DEB Package"
        ;;
    --all|*)
        echo -e "${YELLOW}🔨 Building all formats...${NC}"
        echo ""
        
        # Build all formats
        build_service "build" "All Formats"
        ;;
esac

echo ""
echo -e "${GREEN}✅ Build process completed!${NC}"
echo ""
echo -e "${YELLOW}📦 Built artifacts:${NC}"

# List built files
if [ -d "$PROJECT_ROOT/dist" ] && [ "$(ls -A "$PROJECT_ROOT/dist")" ]; then
    ls -lh "$PROJECT_ROOT/dist/"
    echo ""
    echo -e "${GREEN}🎉 Binaries are ready in: $PROJECT_ROOT/dist/${NC}"
else
    echo -e "${YELLOW}⚠️  No output files found in dist/${NC}"
fi

echo ""
echo -e "${BLUE}💡 Installation:${NC}"
echo "   AppImage: chmod +x dist/*.AppImage && ./dist/astana_*.AppImage"
echo "   DEB:      sudo dpkg -i dist/*.deb"
