#!/bin/sh
set -eu

if [ -e .env ]; then
  echo '.env уже существует; файл не изменён.' >&2
  exit 1
fi
command -v openssl >/dev/null 2>&1 || { echo 'Нужен openssl для генерации секретов.' >&2; exit 1; }

cp .env.production.example .env
DB_SECRET="$(openssl rand -hex 24)"
ACCESS_SECRET="$(openssl rand -hex 32)"
REFRESH_SECRET="$(openssl rand -hex 32)"

sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$DB_SECRET/" .env
sed -i "s/^JWT_ACCESS_SECRET=.*/JWT_ACCESS_SECRET=$ACCESS_SECRET/" .env
sed -i "s/^JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$REFRESH_SECRET/" .env
chmod 600 .env

echo '.env создан; случайные DB/JWT секреты уже сгенерированы.'
echo 'Теперь заполните DOMAIN и LETSENCRYPT_EMAIL. SMTP можно подключить позже.'
