#!/bin/bash
set -e

# Entrypoint script for Astana Docker container
# Handles user permissions and environment setup

# Set default user/group IDs if not provided
USER_ID=${LOCAL_USER_ID:-1000}
GROUP_ID=${LOCAL_GROUP_ID:-1000}

# Create user with same UID/GID as host user
groupadd -g $GROUP_ID -o appgroup 2>/dev/null || true
useradd -m -u $USER_ID -g $GROUP_ID -o -s /bin/bash appuser 2>/dev/null || true

# Ensure app directory is writable by appuser
chown -R $USER_ID:$GROUP_ID /app

# Setup cargo environment for appuser
if [ ! -d /home/appuser/.cargo ]; then
    cp -r /root/.cargo /home/appuser/
    chown -R $USER_ID:$GROUP_ID /home/appuser/.cargo
fi

# Export PATH for appuser
export PATH="/home/appuser/.cargo/bin:${PATH}"

# Fix X11 permissions if DISPLAY is set
if [ -n "$DISPLAY" ] && [ -S "/tmp/.X11-unix/X0" ]; then
    chmod 777 /tmp/.X11-unix/X0 2>/dev/null || true
fi

# Run command as appuser
exec gosu $USER_ID:$GROUP_ID "$@"
