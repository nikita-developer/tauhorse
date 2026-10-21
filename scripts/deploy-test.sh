#!/bin/sh
set -eu

fail() {
  echo "Ошибка: $*" >&2
  exit 1
}

[ -f .env ] || fail "нет .env. Для локального проекта создайте его из .env.example и сохраните текущие POSTGRES_PASSWORD/JWT секреты."
command -v docker >/dev/null 2>&1 || fail "Docker не установлен."
docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin не установлен."

DC="docker compose --env-file .env -f docker-compose.yml -f docker-compose.test.yml"
BOOTSTRAP_DC="docker compose --env-file .env -f docker-compose.yml -f docker-compose.test.yml --profile bootstrap"

cleanup_bootstrap() {
  $BOOTSTRAP_DC rm -sf nginx-bootstrap >/dev/null 2>&1 || true
}
trap cleanup_bootstrap EXIT INT TERM

$DC config >/dev/null
$DC pull db nginx certbot
$DC build app

if ! $DC run --rm --no-deps --entrypoint /bin/sh certbot -c \
  'test -n "$DOMAIN" && test -n "$LETSENCRYPT_EMAIL" && test -s "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" && test -s "/etc/letsencrypt/live/$DOMAIN/privkey.pem"' >/dev/null 2>&1; then
  echo "Запрашиваю Let's Encrypt для тестового домена..."
  $DC stop nginx >/dev/null 2>&1 || true
  cleanup_bootstrap
  $BOOTSTRAP_DC up -d nginx-bootstrap

  if ! $DC run --rm --no-deps --entrypoint /bin/sh certbot -c \
    'test -n "$DOMAIN" && test -n "$LETSENCRYPT_EMAIL" && certbot certonly --webroot --webroot-path /var/www/certbot --email "$LETSENCRYPT_EMAIL" --agree-tos --non-interactive --keep-until-expiring -d "$DOMAIN"'; then
    fail "сертификат не получен. Проверьте DOMAIN/LETSENCRYPT_EMAIL, DNS и проброс TCP 80 на этот компьютер."
  fi
  cleanup_bootstrap
fi

$DC up -d --remove-orphans
$DC ps

echo
echo "Тестовый HTTPS-стенд запущен."
echo "Логи Nginx: $DC logs -f --tail=100 nginx"
