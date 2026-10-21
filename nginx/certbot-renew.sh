#!/bin/sh
set -eu

INTERVAL="${CERTBOT_RENEW_INTERVAL_SECONDS:-43200}"

while true; do
  certbot renew --webroot --webroot-path /var/www/certbot --quiet || \
    echo "Предупреждение: автоматическое продление сертификата завершилось ошибкой" >&2
  sleep "$INTERVAL"
done
