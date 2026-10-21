#!/bin/sh
set -eu
ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$ROOT_DIR"
[ -f .env ] || { echo 'Ошибка: нет .env. Для первого запуска используйте sudo ./install.sh' >&2; exit 1; }
./scripts/deploy-vps.sh
