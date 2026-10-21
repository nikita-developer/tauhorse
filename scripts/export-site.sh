#!/bin/sh
set -eu

COMPOSE_FILE='docker-compose.production.yml'
[ -f .env ] || { echo 'Ошибка: нет .env' >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo 'Ошибка: Docker не найден' >&2; exit 1; }

DC="docker compose --env-file .env -f $COMPOSE_FILE"
TS=$(date +%Y%m%d_%H%M%S)
BASE_DIR=${1:-"$PWD/exports"}
WORK="$BASE_DIR/tauhorse_$TS"
ARCHIVE="$BASE_DIR/tauhorse_$TS.tar.gz"
mkdir -p "$WORK"
chmod 700 "$WORK"

cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT INT TERM

echo '[1/3] Экспорт PostgreSQL'
$DC exec -T db pg_dump -U horse_shop -d horse_shop -Fc > "$WORK/database.dump"

echo '[2/3] Экспорт загруженных изображений и видео'
docker run --rm \
  -v horse_feed_shop_media:/from:ro \
  -v "$WORK:/backup" \
  alpine:3.22 sh -ec 'cd /from && tar czf /backup/media.tar.gz .'

echo '[3/3] Добавляю production-конфигурацию'
cp .env "$WORK/production.env"
chmod 600 "$WORK/production.env"
printf '%s\n' \
  'ВНИМАНИЕ: production.env содержит секреты и, если настроен, SMTP-пароль.' \
  'Храните этот архив как пароль и не отправляйте его в публичные хранилища.' \
  > "$WORK/README-PRIVATE.txt"

tar -czf "$ARCHIVE" -C "$BASE_DIR" "tauhorse_$TS"
chmod 600 "$ARCHIVE"
echo "Готово: $ARCHIVE"
echo 'Архив содержит БД, media и .env с секретами. Храните его приватно.'
