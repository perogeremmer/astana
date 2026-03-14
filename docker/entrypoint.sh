#!/bin/bash
set -e

# Export paths
export PATH="/usr/local/cargo/bin:$PATH"
export RUSTUP_HOME="/usr/local/rustup"
export CARGO_HOME="/usr/local/cargo"

# Create appuser for file ownership (but run cargo as root)
USER_ID=${LOCAL_USER_ID:-1000}
GROUP_ID=${LOCAL_GROUP_ID:-1000}

groupadd -g $GROUP_ID -o appgroup 2>/dev/null || true
useradd -m -u $USER_ID -g $GROUP_ID -o -s /bin/bash appuser 2>/dev/null || true

# Fix ownership of app directory
chown -R $USER_ID:$GROUP_ID /app 2>/dev/null || true

# Run command as root (cargo needs to write to /usr/local/cargo)
exec "$@"
