#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$ROOT_DIR"

fail() {
  echo "Ошибка: $*" >&2
  exit 1
}

if [ "$(id -u)" -ne 0 ]; then
  fail "Первый production-запуск выполняйте от root: sudo ./install.sh"
fi

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo "[1/3] Docker не найден — устанавливаю Docker Engine и Compose"
  ./scripts/prepare-vps.sh
else
  echo "[1/3] Docker и Docker Compose уже установлены"
fi

if [ ! -f .env ]; then
  echo "[2/3] Создаю production-конфигурацию"
  ./scripts/setup-production.sh
else
  echo "[2/3] Использую существующий .env"
fi

chmod 600 .env

echo "[3/3] Разворачиваю магазин"
./scripts/deploy-vps.sh
