#!/usr/bin/env bash
# Prvi put na svežem Ubuntu/Debian VPS-u (Hetzner, DigitalOcean, …)
set -euo pipefail

echo "=== Omni Group VPS bootstrap ==="

if ! command -v docker >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y ca-certificates curl git rsync ufw
  curl -fsSL https://get.docker.com | sh
  usermod -aG docker "${SUDO_USER:-root}" 2>/dev/null || true
fi

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable || true

mkdir -p /opt/omni-group
echo "Docker: $(docker --version)"
echo "Bootstrap OK. Sledeće sa Windows mašine:"
echo "  .\\scripts\\deploy-to-vps.ps1 -VpsHost <IP> -SiteDomain <domen>"
