# Astana - Tauri Desktop App Dockerfile
# Ubuntu 24.04 (Noble) with all dependencies for Tauri v2

FROM ubuntu:24.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive
ENV RUST_VERSION=1.88.0

# Install system dependencies for Tauri
RUN apt-get update && apt-get install -y \
    # Basic build tools
    build-essential \
    pkg-config \
    curl \
    wget \
    git \
    # Tauri dependencies - WebKit2GTK 4.1 (Ubuntu 24.04 default)
    libwebkit2gtk-4.1-dev \
    libgtk-3-dev \
    libjavascriptcoregtk-4.1-dev \
    libsoup-3.0-dev \
    librsvg2-dev \
    # Additional libraries (Ubuntu 24.04 uses Ayatana)
    libayatana-appindicator3-dev \
    libgdk-pixbuf2.0-dev \
    libglib2.0-dev \
    # X11 for GUI display
    libx11-dev \
    libxcb1-dev \
    libxcb-render0-dev \
    libxcb-shape0-dev \
    libxcb-xfixes0-dev \
    # Utilities
    file \
    patchelf \
    fakeroot \
    dpkg \
    rpm \
    gosu \
    # Cleanup
    && rm -rf /var/lib/apt/lists/*

# Install Rust to system-wide location with proper permissions
ENV RUSTUP_HOME=/usr/local/rustup
ENV CARGO_HOME=/usr/local/cargo
ENV PATH="/usr/local/cargo/bin:${PATH}"
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain ${RUST_VERSION} --no-modify-path && \
    chmod -R 777 ${RUSTUP_HOME} ${CARGO_HOME} && \
    mkdir -p ${CARGO_HOME}/registry && \
    chmod -R 777 ${CARGO_HOME}/registry

# Install Tauri CLI (using --locked for compatibility)
RUN cargo install tauri-cli --version "^2.0" --locked

# Create app directory
WORKDIR /app

# Copy entrypoint script
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set environment variables
ENV DISPLAY=:0
ENV RUST_LOG=info
ENV RUST_BACKTRACE=1

ENTRYPOINT ["/entrypoint.sh"]
