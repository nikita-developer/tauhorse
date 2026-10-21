#!/bin/sh
set -eu

[ ! -e .env ] || { echo '.env уже существует; мастер настройки ничего не изменил.' >&2; exit 1; }
command -v openssl >/dev/null 2>&1 || { echo 'Ошибка: нужен openssl.' >&2; exit 1; }

ask_required() {
  prompt="$1"; default="${2:-}"
  while :; do
    if [ -n "$default" ]; then printf '%s [%s]: ' "$prompt" "$default" >&2; else printf '%s: ' "$prompt" >&2; fi
    IFS= read -r answer
    [ -n "$answer" ] || answer="$default"
    if [ -n "$answer" ]; then printf '%s' "$answer"; return 0; fi
    echo 'Значение обязательно.' >&2
  done
}

ask_optional() {
  prompt="$1"; default="${2:-}"
  if [ -n "$default" ]; then printf '%s [%s]: ' "$prompt" "$default" >&2; else printf '%s: ' "$prompt" >&2; fi
  IFS= read -r answer
  [ -n "$answer" ] || answer="$default"
  printf '%s' "$answer"
}

ask_yes_no() {
  prompt="$1"; default="${2:-n}"
  printf '%s [%s]: ' "$prompt" "$default" >&2
  IFS= read -r answer
  [ -n "$answer" ] || answer="$default"
  case "$(printf '%s' "$answer" | tr '[:upper:]' '[:lower:]')" in y|yes|д|да) return 0;; *) return 1;; esac
}

ask_secret() {
  prompt="$1"; printf '%s: ' "$prompt" >&2
  if command -v stty >/dev/null 2>&1 && [ -t 0 ]; then stty -echo; IFS= read -r answer; stty echo; printf '\n' >&2; else IFS= read -r answer; fi
  [ -n "$answer" ] || { echo 'Значение обязательно.' >&2; return 1; }
  printf '%s' "$answer"
}

escape_env() {
  value=$1
  escaped=$(printf '%s' "$value" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\$/$$/g')
  printf '"%s"' "$escaped"
}
set_line() { printf '%s=%s\n' "$1" "$(escape_env "$2")" >> .env.tmp; }

cat >&2 <<'TXT'

=== Первичная production-настройка TauHorse ===
Секреты PostgreSQL и JWT будут сгенерированы автоматически.
Публичные данные TauHorse уже заполнены реальными значениями.
Перед выпуском HTTPS A-запись домена должна указывать на публичный IP сервера,
а TCP-порты 80 и 443 должны быть доступны из интернета.
TXT

DOMAIN=$(ask_required 'Домен без https://' 'tauhorse.ru')
LE_EMAIL=$(ask_required "Email для Let's Encrypt" 'zoloto666@inbox.ru')

SMTP_HOST=''; SMTP_PORT='465'; SMTP_SECURE='true'; SMTP_USER=''; SMTP_PASS=''; MAIL_FROM=''; ORDER_EMAIL=''
if ask_yes_no 'Настроить SMTP прямо сейчас? Можно сделать позже' 'n'; then
  echo >&2; echo '=== SMTP ===' >&2
  SMTP_HOST=$(ask_required 'SMTP host')
  SMTP_PORT=$(ask_required 'SMTP port' '465')
  SMTP_SECURE=$(ask_required 'SMTP secure: true или false' 'true')
  SMTP_USER=$(ask_required 'SMTP login')
  while ! SMTP_PASS=$(ask_secret 'SMTP password'); do :; done
  MAIL_FROM=$(ask_required 'Адрес отправителя' "$SMTP_USER")
  ORDER_EMAIL=$(ask_required 'Куда присылать новые заказы' 'zoloto666@inbox.ru')
else
  echo 'SMTP пропущен. Сайт запустится, но email-функции заработают только после заполнения SMTP_* в .env.' >&2
fi

DB_SECRET=$(openssl rand -hex 24)
ACCESS_SECRET=$(openssl rand -hex 32)
REFRESH_SECRET=$(openssl rand -hex 32)

umask 077
: > .env.tmp
set_line DOMAIN "$DOMAIN"
set_line LETSENCRYPT_EMAIL "$LE_EMAIL"
set_line NUXT_PUBLIC_APP_URL "https://$DOMAIN"
set_line COOKIE_SECURE 'true'
set_line POSTGRES_PASSWORD "$DB_SECRET"
set_line JWT_ACCESS_SECRET "$ACCESS_SECRET"
set_line JWT_REFRESH_SECRET "$REFRESH_SECRET"
set_line JWT_ACCESS_EXPIRES_IN '15m'
set_line JWT_REFRESH_EXPIRES_IN '7d'
set_line NUXT_PUBLIC_SHOP_NAME 'TauHorse'
set_line NUXT_PUBLIC_BRAND_NAME 'TauHorse'
set_line NUXT_PUBLIC_SHOP_EMAIL 'zoloto666@inbox.ru'
set_line NUXT_PUBLIC_SHOP_PHONE '+79013520534'
set_line NUXT_PUBLIC_SHOP_PHONE_DISPLAY '+7 901 352-05-34'
set_line NUXT_PUBLIC_SHOP_ADDRESS 'г. Долгопрудный, Хлебниково, ул. Ленинградская, д. 24'
set_line NUXT_PUBLIC_CONTACT_PERSON 'Юлия Котова'
set_line NUXT_PUBLIC_SELLER_NAME 'ИП Туманова Елена Владимировна'
set_line NUXT_PUBLIC_SELLER_ID '321508100345153'
set_line NUXT_PUBLIC_SELLER_INN '507803101860'
set_line NUXT_PUBLIC_SELLER_OGRNIP '321508100345153'
set_line NUXT_PUBLIC_SELLER_LEGAL_ADDRESS 'г. Долгопрудный, Хлебниково, ул. Ленинградская, д. 24'
set_line NUXT_PUBLIC_SELLER_REGISTRATION_AUTHORITY ''
set_line NUXT_PUBLIC_CLAIMS_EMAIL 'zoloto666@inbox.ru'
set_line NUXT_PUBLIC_SOCIAL_MAX 'https://max.ru/u/f9LHodD0cOIOGWFsEvii_RphX3uoWncwmI6Cmhe8CIJ6NIbYsUrdgfSyWLM'
set_line NUXT_PUBLIC_SOCIAL_WHATSAPP 'https://wa.me/79013520534'
set_line NUXT_PUBLIC_SOCIAL_AVITO 'https://www.avito.ru/dolgoprudnyy/tovary_dlya_zhivotnyh/lizunets_konfeta_dlya_loshadey_8222244356'
set_line NUXT_PUBLIC_RELATED_PROJECT_URL 'https://ledenkon.ru/'
set_line SMTP_HOST "$SMTP_HOST"
set_line SMTP_PORT "$SMTP_PORT"
set_line SMTP_SECURE "$SMTP_SECURE"
set_line SMTP_USER "$SMTP_USER"
set_line SMTP_PASS "$SMTP_PASS"
set_line MAIL_FROM "$MAIL_FROM"
set_line ORDER_NOTIFICATION_EMAIL "$ORDER_EMAIL"
set_line MEDIA_MAX_BYTES '26214400'
set_line MEDIA_MAX_REQUEST_BYTES '62914560'
set_line BACKUP_RETENTION_DAYS '14'
set_line BACKUP_INTERVAL_SECONDS '86400'
set_line CERTBOT_RENEW_INTERVAL_SECONDS '43200'
set_line NGINX_RELOAD_SECONDS '21600'

mv .env.tmp .env
chmod 600 .env

echo >&2
echo '.env TauHorse создан. Секреты сгенерированы автоматически; права файла: 600.' >&2
