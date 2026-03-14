#!/usr/bin/env bash
# Clawman — Set up Mac Mini as execution node
# Run this on the Mac Mini to register it as a worker node
set -euo pipefail

CONTROL_PLANE_URL="${CLAWMAN_CONTROL_URL:?Set CLAWMAN_CONTROL_URL (e.g., wss://clawman.tailnet:18789)}"
NODE_NAME="${CLAWMAN_NODE_NAME:-mac-mini}"

echo "=== Clawman Mac Mini Worker Setup ==="

# 1. Ensure Tailscale is installed and connected
if ! command -v tailscale &>/dev/null; then
  echo "Installing Tailscale..."
  curl -fsSL https://tailscale.com/install.sh | sh
fi

if ! tailscale status &>/dev/null; then
  echo "Starting Tailscale... (you may need to authenticate)"
  sudo tailscale up
fi

echo "Tailscale status: $(tailscale status --self --json | jq -r '.Self.DNSName')"

# 2. Install OpenClaw (Clawman fork) if not present
if ! command -v openclaw &>/dev/null; then
  echo "Installing OpenClaw..."
  npm install -g openclaw@latest
fi

# 3. Configure as node mode
echo "Configuring as execution node..."
openclaw config set nodeHost.enabled true
openclaw config set nodeHost.name "${NODE_NAME}"

# 4. Pair with control plane
echo "Initiating node pairing with control plane..."
echo "Run 'openclaw node pair ${CONTROL_PLANE_URL}' to complete pairing"

# 5. Create launchd service for auto-start
PLIST_PATH="$HOME/Library/LaunchAgents/com.clawman.worker.plist"
OPENCLAW_PATH="$(which openclaw)"

cat > "${PLIST_PATH}" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.clawman.worker</string>
  <key>ProgramArguments</key>
  <array>
    <string>${OPENCLAW_PATH}</string>
    <string>gateway</string>
    <string>run</string>
    <string>--port</string>
    <string>18789</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>/tmp/clawman-worker.log</string>
  <key>StandardErrorPath</key>
  <string>/tmp/clawman-worker.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
  </dict>
</dict>
</plist>
PLIST

echo "Created launchd service at ${PLIST_PATH}"
echo ""
echo "To start the worker:"
echo "  launchctl load ${PLIST_PATH}"
echo ""
echo "To check status:"
echo "  tail -f /tmp/clawman-worker.log"
echo "  openclaw status"
