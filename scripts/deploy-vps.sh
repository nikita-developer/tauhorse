#!/bin/sh
set -eu

COMPOSE_FILE="docker-compose.production.yml"

fail() {
  echo "Ошибка: $*" >&2
  exit 1
}

[ -f .env ] || fail "нет .env. Для первого запуска выполните sudo ./install.sh"
command -v docker >/dev/null 2>&1 || fail "Docker не установлен. Запустите ./scripts/prepare-vps.sh от root."
docker compose version >/dev/null 2>&1 || fail "Docker Compose plugin не установлен."

DC="docker compose --env-file .env -f $COMPOSE_FILE"
BOOTSTRAP_DC="docker compose --env-file .env -f $COMPOSE_FILE --profile bootstrap"

DOMAIN=$(sed -n 's/^DOMAIN=//p' .env | tail -n1 | sed 's/^"//;s/"$//')
[ -n "$DOMAIN" ] || fail "DOMAIN не найден в .env"

cleanup_bootstrap() {
  $BOOTSTRAP_DC rm -sf nginx-bootstrap >/dev/null 2>&1 || true
}
trap cleanup_bootstrap EXIT INT TERM

echo "[1/9] Проверка Docker Compose конфигурации"
$DC config >/dev/null

echo "[2/9] Загрузка базовых образов"
$DC pull db nginx certbot backup

echo "[3/9] Сборка приложения"
$DC build --pull app

echo "[4/9] Проверка production .env до миграций"
$DC run --rm --no-deps --entrypoint node app scripts/production-check.mjs

echo "[5/9] Проверка SMTP"
SMTP_HOST_VALUE=$(sed -n 's/^SMTP_HOST=//p' .env | tail -n1 | sed 's/^"//;s/"$//')
if [ -n "$SMTP_HOST_VALUE" ]; then
  $DC run --rm --no-deps --entrypoint node app scripts/smtp-check.mjs
else
  echo "SMTP пока не настроен — пропускаю проверку. Email-функции будут недоступны до заполнения SMTP_* в .env."
fi

echo "[6/9] Проверка HTTPS-сертификата"
if ! $DC run --rm --no-deps --entrypoint /bin/sh certbot -c \
  'test -s "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" && test -s "/etc/letsencrypt/live/$DOMAIN/privkey.pem"' >/dev/null 2>&1; then
  echo "Сертификат ещё не выпущен. Запрашиваю Let's Encrypt для домена..."
  $DC stop nginx >/dev/null 2>&1 || true
  cleanup_bootstrap
  $BOOTSTRAP_DC up -d nginx-bootstrap

  if ! $DC run --rm --no-deps --entrypoint /bin/sh certbot -c \
    'certbot certonly --webroot --webroot-path /var/www/certbot --email "$LETSENCRYPT_EMAIL" --agree-tos --non-interactive --keep-until-expiring -d "$DOMAIN"'; then
    fail "Let's Encrypt не выдал сертификат. Проверьте DNS домена и доступность TCP-порта 80 с интернета, затем запустите скрипт снова."
  fi
  cleanup_bootstrap
else
  echo "Существующий сертификат найден."
fi

echo "[7/9] Запуск PostgreSQL, Nuxt, Nginx, Certbot и backup"
$DC up -d --remove-orphans

echo "[8/9] Ожидание готовности приложения"
APP_ID=$($DC ps -q app)
[ -n "$APP_ID" ] || fail "контейнер app не создан"
i=0
while [ "$i" -lt 30 ]; do
  status=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$APP_ID" 2>/dev/null || true)
  [ "$status" = "healthy" ] && break
  [ "$status" = "unhealthy" ] && fail "app стал unhealthy. Посмотрите: $DC logs --tail=150 app"
  sleep 2
  i=$((i + 1))
done
status=$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$APP_ID" 2>/dev/null || true)
[ "$status" = "healthy" ] || fail "app не стал healthy за 60 секунд. Посмотрите: $DC logs --tail=150 app"

echo "[9/9] Проверка HTTPS и автоматического продления"
$DC run --rm --no-deps --entrypoint /bin/sh certbot -c \
  'certbot renew --webroot --webroot-path /var/www/certbot --quiet || true'
$DC exec -T nginx nginx -s reload >/dev/null 2>&1 || true

if command -v curl >/dev/null 2>&1; then
  attempt=0
  until curl -fsS --max-time 10 "https://$DOMAIN/api/health" >/dev/null 2>&1; do
    attempt=$((attempt + 1))
    [ "$attempt" -ge 6 ] && fail "контейнеры запущены, но https://$DOMAIN/api/health не отвечает. Проверьте DNS/firewall и логи Nginx."
    sleep 3
  done
fi

$DC ps

echo
echo "Готово: https://$DOMAIN"
echo "Статус: ./status.sh"
echo "Логи:   ./logs.sh"
echo "Backup: ./backup.sh"
