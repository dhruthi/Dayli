#!/usr/bin/env bash
# ==============================================================================
# dayli.ai — VPS Server Provisioning Script (Ubuntu / Debian / Oracle Linux)
# Sets up Docker, Docker Compose, Git, Swap (for micro instances), and Firewall
# ==============================================================================

set -euo pipefail

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root or with sudo:"
  echo "  sudo ./scripts/setup-vps.sh"
  exit 1
fi

# Detect package manager (apt-get vs dnf/yum)
if command -v apt-get >/dev/null 2>&1; then
  OS_FAMILY="debian"
elif command -v dnf >/dev/null 2>&1; then
  OS_FAMILY="rhel"
elif command -v yum >/dev/null 2>&1; then
  OS_FAMILY="rhel"
else
  echo "❌ Unsupported OS package manager. Please use Ubuntu or Oracle Linux."
  exit 1
fi

echo "📦 Detected OS family: ${OS_FAMILY}"

# 1. Automatic 2GB Swap configuration for micro / 1GB RAM instances
TOTAL_MEM_MB=$(free -m | awk '/^Mem:/{print $2}')
if [ "$TOTAL_MEM_MB" -lt 1800 ] && [ ! -f /swapfile ]; then
  echo "🧠 Memory is ${TOTAL_MEM_MB}MB — creating 2GB swapfile for reliable Docker operation..."
  fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
  echo "✅ 2GB swap space active."
fi

# 2. Package installation & Docker setup
if [ "$OS_FAMILY" = "debian" ]; then
  echo "📦 Updating system packages (apt)..."
  apt-get update && apt-get upgrade -y
  apt-get install -y ca-certificates curl gnupg lsb-release git ufw

  echo "🐳 Installing Docker Engine & Compose..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null

  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  systemctl enable --now docker

  # Add user to docker group
  TARGET_USER="${SUDO_USER:-ubuntu}"
  if id "$TARGET_USER" >/dev/null 2>&1; then
    usermod -aG docker "$TARGET_USER"
    echo "Added $TARGET_USER to docker group."
  fi

  echo "🔒 Configuring Firewall (allowing SSH, HTTP, HTTPS)..."
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable

  if [ -f /etc/oracle-cloud-agent/agent.yml ] || [ -d /etc/oracle-cloud-agent ] || grep -qi oracle /sys/class/dmi/id/chassis_asset_tag 2>/dev/null || grep -qi oracle /sys/devices/virtual/dmi/id/sys_vendor 2>/dev/null; then
    echo "🛡️ Detected Oracle Cloud environment — applying OCI-specific iptables rules..."
    iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
    iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT
    iptables -I INPUT 1 -p tcp --dport 22 -j ACCEPT
    DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent netfilter-persistent
    netfilter-persistent save
    echo "✅ OCI iptables rules saved and persisted."
  fi

elif [ "$OS_FAMILY" = "rhel" ]; then
  echo "📦 Updating system packages (dnf)..."
  dnf install -y dnf-plugins-core curl git tar iptables-services

  echo "🐳 Installing Docker Engine & Compose..."
  dnf config-manager --add-repo=https://download.docker.com/linux/centos/docker-ce.repo || true
  dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  systemctl enable --now docker

  # Add user to docker group (opc is standard Oracle Linux user)
  TARGET_USER="${SUDO_USER:-opc}"
  if id "$TARGET_USER" >/dev/null 2>&1; then
    usermod -aG docker "$TARGET_USER"
    echo "Added $TARGET_USER to docker group."
  fi

  echo "🔒 Configuring Firewall (allowing SSH, HTTP, HTTPS)..."
  if systemctl is-active --quiet firewalld; then
    firewall-cmd --permanent --add-port=22/tcp
    firewall-cmd --permanent --add-port=80/tcp
    firewall-cmd --permanent --add-port=443/tcp
    firewall-cmd --reload
  else
    iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
    iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT
    iptables -I INPUT 1 -p tcp --dport 22 -j ACCEPT
    systemctl enable --now iptables || true
    service iptables save || true
  fi
fi

echo "✅ VPS Server Provisioning Complete!"
echo "Next steps:"
echo "  1. Exit and re-login SSH (to refresh docker group permissions)."
echo "  2. Clone your repository: git clone https://github.com/YashwanthRathod/dayli-ai-whatsapp.git"
echo "  3. Configure .env with your credentials and DOMAIN_NAME."
echo "  4. Run: ./scripts/deploy.sh"
