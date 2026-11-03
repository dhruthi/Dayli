#!/bin/bash
# Persistent SSH reverse tunnel for MedGemma (port 11434)
# Forwards Oracle Cloud VPS 0.0.0.0:11434 -> Local Mac 127.0.0.1:11434

KEY="/tmp/oracle.key"
REMOTE="opc@129.159.19.84"

while true; do
  echo "[$(date -u)] Starting SSH reverse tunnel to ${REMOTE}..."
  # Clean up any stale remote listeners first
  ssh -i "${KEY}" -o StrictHostKeyChecking=no "${REMOTE}" "sudo kill -9 \$(sudo ss -tulpn | grep 11434 | awk '{print \$7}' | sed -E 's/.*pid=([0-9]+).*/\1/') 2>/dev/null || true" 2>/dev/null
  
  ssh -i "${KEY}" -N \
    -o StrictHostKeyChecking=no \
    -o ServerAliveInterval=10 \
    -o ServerAliveCountMax=3 \
    -o ExitOnForwardFailure=yes \
    -o TCPKeepAlive=yes \
    -R 0.0.0.0:11434:127.0.0.1:11434 \
    "${REMOTE}"
  
  EXIT_CODE=$?
  echo "[$(date -u)] SSH reverse tunnel disconnected with code ${EXIT_CODE}. Reconnecting in 3s..."
  sleep 3
done
