#!/bin/sh
set -eu
ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$ROOT_DIR"
[ -f .env ] || { echo 'Ошибка: нет .env' >&2; exit 1; }
exec docker compose --env-file .env -f docker-compose.production.yml run --rm --no-deps --entrypoint node app scripts/smtp-check.mjs
