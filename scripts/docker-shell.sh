#!/bin/bash

# docker-shell.sh - Get shell access to Astana Docker container
# Usage: ./scripts/docker-shell.sh

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

echo -e "${GREEN}🐚 Astana - Docker Shell Access${NC}"
echo "================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Get current user/group IDs
export LOCAL_USER_ID=$(id -u)
export LOCAL_GROUP_ID=$(id -g)

# Detect OS for X11 setup
OS="$(uname -s)"
case "$OS" in
    Linux*)
        xhost +local:docker 2>/dev/null || true
        ;;
esac

echo ""
echo -e "${YELLOW}📋 Configuration:${NC}"
echo "   User ID: $LOCAL_USER_ID"
echo "   Group ID: $LOCAL_GROUP_ID"
echo ""
echo -e "${BLUE}💡 Available commands inside container:${NC}"
echo "   cargo tauri dev      - Run development mode"
echo "   cargo tauri build    - Build production"
echo "   cargo check          - Check code"
echo "   cargo test           - Run tests"
echo "   sqlite3 ~/.local/share/com.perogeremmer.astana/astana.db - Access database"
echo ""

# Build image if not exists
echo -e "${YELLOW}🔨 Building Docker image (if needed)...${NC}"
$DOCKER_COMPOSE build shell

echo ""
echo -e "${GREEN}🚀 Starting shell...${NC}"
echo ""

# Run shell
$DOCKER_COMPOSE run --rm --service-ports shell
