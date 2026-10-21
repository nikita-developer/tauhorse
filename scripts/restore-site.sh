#!/bin/sh
set -eu

[ "$#" -ge 1 ] || { echo "Использование: ./restore.sh /path/to/tauhorse_BACKUP.tar.gz" >&2; exit 1; }
ARCHIVE=$1
[ -f "$ARCHIVE" ] || { echo "Ошибка: backup не найден: $ARCHIVE" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo 'Ошибка: Docker не найден' >&2; exit 1; }

TMP=$(mktemp -d)
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT INT TERM

tar -xzf "$ARCHIVE" -C "$TMP"
ROOT=$(find "$TMP" -mindepth 1 -maxdepth 1 -type d | head -n1)
[ -n "$ROOT" ] || { echo 'Ошибка: неверная структура backup' >&2; exit 1; }
[ -s "$ROOT/database.dump" ] || { echo 'Ошибка: в backup нет database.dump' >&2; exit 1; }
[ -s "$ROOT/media.tar.gz" ] || { echo 'Ошибка: в backup нет media.tar.gz' >&2; exit 1; }
[ -s "$ROOT/production.env" ] || { echo 'Ошибка: в backup нет production.env' >&2; exit 1; }

cat <<'TXT'
ВНИМАНИЕ: восстановление заменит текущую production-базу и media данными из backup.
Для продолжения введите RESTORE заглавными буквами.
TXT
printf '> '
IFS= read -r answer
[ "$answer" = 'RESTORE' ] || { echo 'Отменено.'; exit 1; }

if [ -f .env ]; then
  cp .env ".env.before-restore.$(date +%Y%m%d_%H%M%S)"
fi
cp "$ROOT/production.env" .env
chmod 600 .env

DC='docker compose --env-file .env -f docker-compose.production.yml'
$DC config >/dev/null
$DC stop nginx app backup >/dev/null 2>&1 || true
$DC up -d db

DB_ID=$($DC ps -q db)
i=0
while [ "$i" -lt 30 ]; do
  status=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$DB_ID" 2>/dev/null || true)
  [ "$status" = 'healthy' ] && break
  [ "$status" = 'unhealthy' ] && { echo 'Ошибка: PostgreSQL unhealthy' >&2; exit 1; }
  sleep 2
  i=$((i + 1))
done

status=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$DB_ID" 2>/dev/null || true)
[ "$status" = 'healthy' ] || { echo 'Ошибка: PostgreSQL не стал healthy' >&2; exit 1; }

echo '[1/2] Восстанавливаю PostgreSQL'
cat "$ROOT/database.dump" | $DC exec -T db pg_restore -U horse_shop -d horse_shop --clean --if-exists --no-owner

echo '[2/2] Восстанавливаю media'
docker run --rm \
  -v horse_feed_shop_media:/to \
  -v "$ROOT:/backup:ro" \
  alpine:3.22 sh -ec 'find /to -mindepth 1 -maxdepth 1 -exec rm -rf {} +; cd /to; tar xzf /backup/media.tar.gz'

echo 'Данные восстановлены. Запускаю production stack.'
./scripts/deploy-vps.sh
