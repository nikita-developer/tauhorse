#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Запустите от root: sudo ./scripts/prepare-vps.sh" >&2
  exit 1
fi

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo "Docker и Docker Compose уже установлены."
  exit 0
fi

if command -v apt-get >/dev/null 2>&1; then
  . /etc/os-release
  apt-get update
  apt-get install -y ca-certificates curl openssl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL "https://download.docker.com/linux/${ID}/gpg" -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  ARCH="$(dpkg --print-architecture)"
  CODENAME="${VERSION_CODENAME:-${UBUNTU_CODENAME:-}}"
  [ -n "$CODENAME" ] || { echo "Не удалось определить codename Linux." >&2; exit 1; }
  echo "deb [arch=$ARCH signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/${ID} $CODENAME stable" > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
elif command -v dnf >/dev/null 2>&1; then
  dnf -y install dnf-plugins-core ca-certificates curl openssl
  dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
  dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  echo "Автоустановка поддерживает Ubuntu/Debian и AlmaLinux/Rocky/CentOS Stream. Установите Docker вручную." >&2
  exit 1
fi

systemctl enable --now docker

docker version >/dev/null
docker compose version

echo
echo "Docker установлен. Убедитесь, что firewall/VPS security group разрешает TCP 22, 80 и 443."
