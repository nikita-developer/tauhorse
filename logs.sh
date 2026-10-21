#!/bin/sh
set -eu
ROOT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$ROOT_DIR"
docker compose --env-file .env -f docker-compose.production.yml logs -f --tail=150 app nginx db certbot backup
