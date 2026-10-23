# TauHorse — полная документация проекта, локальной разработки и production-сервера

> **Назначение:** этот README — технический паспорт интернет-магазина TauHorse, инструкция по запуску и переносу на другой сервер, а также контекст для нового ИИ-ассистента. Документ можно целиком передать ИИ вместе с доступом к исходному коду репозитория.
>
> **Актуальность зафиксированных параметров:** 22 октября 2026 года. Перед любыми действиями сверяйте описание с текущими `compose.yaml`, `compose.dev.yaml`, `Dockerfile`, `nginx/*.conf`, `package.json` и `prisma/schema.prisma`. Фактическая конфигурация в Git имеет приоритет над примером в README.
>
> **Важно:** README предназначен для публичного GitHub. Здесь намеренно **нет** паролей, приватных SSH-ключей, JWT-секретов, приватных SSL-ключей, значений production `.env` и персональных данных администратора. Сетевые адреса и внешний SSH-порт скрыты за `CURRENT_PUBLIC_IP`, `CURRENT_LAN_IP` и `WAN_SSH_PORT`; на живом сервере их нужно определить заново. Домашний IP может измениться.

## 0. Инструкция для ИИ-ассистента — прочитать в первую очередь

Ты помогаешь с проектом **TauHorse**. Цель: быстро восстанавливать и поддерживать **уже существующую**, минималистичную архитектуру без создания параллельных проектов, лишних сервисов или новых способов деплоя.

1. Сначала осмотри репозиторий: `git status -sb`, `ls -la`, `compose.yaml`, `compose.dev.yaml`, `Dockerfile`, `package.json`, `nginx/`, `prisma/`, `.gitignore`, `.env.example` (если существует). **Не предполагай**, что README актуальнее этих файлов.
2. Не выводи и не копируй в ответы содержимое `.env`, пароли PostgreSQL, JWT, SSH private keys, `privkey.pem`, конфигурации с секретами. Не коммить их в Git.
3. Сохраняй текущую схему **Nginx → Nuxt 4 → PostgreSQL 17**, управление через Docker Compose, GitHub `main`, ручной деплой через `git pull --ff-only` и `docker compose up -d --build`.
4. **Различай локальный Mac и production Debian.** Это независимые Docker Engines, контейнеры, сети, тома и базы. Не выполняй очистку томов production без явного разрешения владельца.
5. Перед изменением Compose выполняй `docker compose ... config --quiet`; перед переключением Nginx — `nginx -t`; после изменений — `/api/health` и внешнюю проверку HTTPS. Сразу прекращай выполнение при ошибке.
6. На новом сервере делай два разных сценария: **свежая установка с пустой БД** или **миграция с переносом PostgreSQL и media**. Для второго сценария одного `git clone` недостаточно.
7. Не вводи снова старые `docker-compose.yml`, GitHub Actions, авторазвёртывание, резервные копии или отдельный системный Nginx без прямой просьбы владельца.
8. Показывай команды блоками, чётко помечая, **Mac / Debian / новый сервер**. Объясняй последствия перед опасными командами. Используй `docker compose -f compose.yaml` для production, а `-f compose.yaml -f compose.dev.yaml` для Mac.
9. При переносе сервера обязательно перенастрой DNS, IP, SSH и сеть; домашние адреса нельзя механически перенести на VPS.
10. Текущая установка уже работала по `https://tauhorse.ru` как из внешнего интернета, так и из домашнего Wi-Fi; повторно создавать сервисы с нуля на живом сервере не нужно.

**Готовый промпт для передачи вместе с этим README:**

> Ты DevOps- и Nuxt-инженер проекта TauHorse. Изучи README.md и реальные файлы репозитория. Сохрани существующую архитектуру и данные. Прежде чем что-либо менять, проверь текущее состояние и предложи минимальный план. Для установки на другой сервер сначала спроси/определи, нужен ли перенос реальных данных или пустая база, а затем выполни соответствующий раздел README. Не печатай секреты, не удаляй тома и не меняй публичный DNS без согласования. После каждого этапа проверяй Docker, БД, HTTP/HTTPS и безопасность. Давай понятные команды с указанием компьютера, на котором их запускать.

---

## 1. Назначение и технология

**TauHorse** — интернет-магазин на **Nuxt 4** с API и административной частью, **Prisma** для работы с БД и **PostgreSQL 17**. Production — один проект Docker Compose на Debian 13; локальная разработка — отдельный Compose-проект на MacBook с HMR.

| Компонент | Что используется | Функция |
|---|---|---|
| Backend/frontend | Nuxt 4 + Nitro, Node.js в Docker | Страницы, API, админка |
| ORM | Prisma | Модели, миграции, доступ к PostgreSQL |
| Database | PostgreSQL 17, image `postgres:17.11-alpine3.24` на исходной установке | Товары, пользователи, заказы и прочие данные |
| Reverse proxy | Docker `nginx:1.30.5-alpine` на исходной установке | HTTP, HTTPS, передача трафика приложению |
| TLS | Let's Encrypt + Certbot в одноразовом Docker-контейнере | Сертификат и его продление |
| Оркестрация | Docker Engine + Docker Compose plugin | 3 постоянно работающих сервиса |
| Код | GitHub, ветка `main` | Версионирование и ручной деплой |
| Локальная IDE | PhpStorm на MacBook | Разработка |

Схема запросов:

```text
Клиент / браузер
    │ https://tauhorse.ru:443
    ▼
DNS: tauhorse.ru → публичный IP
    │
    ▼
[Домашний роутер Eltex: TCP 443 → CURRENT_LAN_IP:443]
    │                           (на VPS этого этапа нет)
    ▼
Debian 13 → Docker → nginx:443
    │ proxy_pass http://app:3000
    ▼
Nuxt 4 (app, внутренний порт 3000)
    │ postgresql://...@db:5432/horse_shop
    ▼
PostgreSQL 17 (db, внутренний порт 5432)
```

**HTTP 80** нужен для выдачи/обновления сертификатов по ACME HTTP-01; остальной HTTP перенаправляется на HTTPS в `nginx/tauhorse-https.conf`. Внешним клиентам не нужны прямые подключения к портам 3000 или 5432.

---

## 2. Где расположен текущий сервер и проект

Параметры **исходной домашней установки**; для нового хостинга их нужно изменить:

| Параметр | Текущее значение на 22.10.2026 |
|---|---|
| ОС | Debian GNU/Linux 13 (Trixie), Linux amd64 |
| Hostname | `tauhorse` |
| Пользователь администрирования | `tauadmin`, Docker через `sudo` |
| Папка проекта | **`/srv/tauhorse`** |
| GitHub | **https://github.com/nikita-developer/tauhorse** |
| Основная ветка | `main` |
| Публичный домен | **`tauhorse.ru`** (только этот host в известном сертификате) |
| Публичный IP домашнего подключения | `CURRENT_PUBLIC_IP` (проверить через DNS или интернет с сервера) |
| Локальный IP Debian | `CURRENT_LAN_IP` (узнать в роутере, закрепить через DHCP reservation) |
| Роутер | Eltex, WAN-интерфейс `ppp0` |
| Домен/DNS | Регистрация и DNS через REG.RU, `ns1.reg.ru`, `ns2.reg.ru` |
| Внешний SSH роутера | `CURRENT_PUBLIC_IP:WAN_SSH_PORT` → `CURRENT_LAN_IP:22` (значения не публикуются) |
| HTTP | TCP 80 → Debian:80 |
| HTTPS | TCP 443 → Debian:443 |
| NAT loopback | Включён для правил HTTP и HTTPS, чтобы домен открывался из домашнего Wi-Fi |
| Certbot systemd timer | `tauhorse-certbot.timer` |
| Certbot systemd service | `tauhorse-certbot.service` |

На MacBook локальная копия кода находится здесь:

```text
~/Desktop/dev/tauhorse
```

SSH-конфигурация на **исходном MacBook** (примеры, без секретного ключа):

```sshconfig
Host tauhorse
    HostName CURRENT_PUBLIC_IP    # заменить на актуальный IP
    User tauadmin
    Port WAN_SSH_PORT            # заменить на действительный номер
    IdentityFile ~/.ssh/id_ed25519_tauhorse

Host tauhorse-home
    HostName CURRENT_LAN_IP     # заменить на актуальный LAN IP
    User tauadmin
    Port 22
    IdentityFile ~/.ssh/id_ed25519_tauhorse
```

Подключение на Mac:

```bash
ssh tauhorse        # через интернет и роутер
ssh tauhorse-home   # из домашней локальной сети
```

На Mac есть ярлыки `TauHorse.command` и `TauHorse-Home.command` для SSH. Не путать с устаревшим `TauHorse Update.command`: обновление теперь выполняется обычными командами Git + Compose.

**На новой VPS** исходные адреса `CURRENT_PUBLIC_IP`, `CURRENT_LAN_IP`, внешний SSH-порт `WAN_SSH_PORT`, `ppp0` и NAT loopback **не применяются автоматически**. Новый внешний IP и SSH-порт берутся из настроек новой машины. DNS-запись `A` в REG.RU нужно направить на новый IP.

---

## 3. Файлы проекта и источники истины

```text
/srv/tauhorse/                       # production git checkout
├── compose.yaml                    # базовый / production Compose
├── compose.dev.yaml                # overrides для локальной разработки
├── Dockerfile                      # multi-stage сборка Nuxt
├── .env                            # локальные секреты хоста; НЕТ в Git
├── nginx/
│   ├── tauhorse-http.conf          # HTTP, reverse proxy, ACME challenge
│   └── tauhorse-https.conf         # HTTP redirect + HTTPS reverse proxy
├── prisma/                         # Prisma schema и migrations
├── scripts/
│   └── create-admin.mjs            # проверено наличие внутри app-контейнера
├── server/                          # серверная часть Nuxt (расположение уточнять по Git)
└── ...                              # остальные реальные файлы смотреть в Git
```

Не восстанавливать ранее удалённые старые файлы `docker-compose.yml`, `docker-compose.production.yml`, `docker-compose.test.yml`, старые `backup.sh`, `update.sh`, `deploy-*.sh` и `.github/workflows/docker-build.yml` как «обязательные»: их удалили при упрощении инфраструктуры.

**Важно:** этот README создан по проверенным результатам запуска и истории настройки. Прямой доступ к актуальному дереву GitHub во время составления документа был недоступен. ИИ должен проверять фактические пути (`find`, `git ls-files`, `package.json`) вместо выдумывания новых файлов или npm-скриптов.

Полезный осмотр кода (Mac или Debian):

```bash
cd /srv/tauhorse                  # Debian; на Mac: cd ~/Desktop/dev/tauhorse
git status -sb
git remote -v
git ls-files | head -100
sed -n '1,260p' compose.yaml
sed -n '1,300p' compose.dev.yaml
cat package.json
```

Не печатай `.env`, если собираешься отправить вывод в чат/ИИ.

---

## 4. Docker Compose: production

**Проект**: `tauhorse` (в production `.env` задано `COMPOSE_PROJECT_NAME=tauhorse`; также базовый Compose имел `name: ${COMPOSE_PROJECT_NAME:-tauhorse}`).

**Постоянно работающие сервисы:**

| Compose service | Обычно имя контейнера | Назначение | Доступность |
|---|---|---|---|
| `nginx` | `tauhorse-nginx-1` | Слушает 80/443, HTTPS и проксирование | Публичные TCP 80,443 |
| `app` | `tauhorse-app-1` | Nuxt/Nitro, API, admin, media | Внутренний TCP 3000 |
| `db` | `tauhorse-db-1` | PostgreSQL 17 | Внутренний TCP 5432 |

**Docker-сети:**

- `frontend` — соединяет `nginx` и `app`.
- `backend` с `internal: true` — соединяет `app` и `db`, не публикует базу.
- База не должна иметь `ports: 5432:5432` в production.

**Особенности production `app`:**

- Сборка Dockerfile target `runtime`.
- `NODE_ENV=production`, `NITRO_HOST=0.0.0.0`, `NITRO_PORT=3000`.
- `DATABASE_URL` использует DNS-имя Docker-сервиса **`db`**, не `localhost`.
- `MEDIA_ROOT=/app/uploads`; папка связана с именованным Docker volume.
- `COOKIE_SECURE=true` в production окружении контейнера.
- `read_only: true`, временный `/tmp` через `tmpfs`, `no-new-privileges:true` на исходной установке.
- `depends_on` ждёт healthy PostgreSQL; его healthcheck использует `pg_isready`.
- Секреты читаются из `.env`/Compose environment, не хранятся в Git.

**Особенности Nginx:**

- На сервере Compose монтирует конфиг через параметр `${NGINX_CONFIG:-tauhorse-http.conf}`.
- При активном HTTPS значение `NGINX_CONFIG=tauhorse-https.conf`.
- В продакшен `.env`: `HTTP_BIND_IP=0.0.0.0`, `HTTP_PORT=80`, `HTTPS_BIND_IP=0.0.0.0`, `HTTPS_PORT=443`.
- Сертификаты монтируются внутрь Nginx только для чтения из `tauhorse_tls_certs`.
- ACME challenge берётся из общего тома `tauhorse_acme_webroot`.
- `nginx` проксирует запросы к `http://app:3000`, устанавливает `Host`, `X-Forwarded-*`, поддерживает WebSocket Upgrade.

**Docker volumes на текущем production:**

| Volume | Содержимое | Можно удалить? |
|---|---|---|
| `horse_feed_shop_postgres` | **Основная PostgreSQL: реальные данные магазина** | **НЕТ** без миграции/согласования |
| `horse_feed_shop_media` | **Загруженные фото и другие файлы товаров** | **НЕТ** без миграции/согласования |
| `tauhorse_tls_certs` | Сертификаты Let's Encrypt, ключи, renewal settings | Не удалять без плана перевыпуска |
| `tauhorse_acme_webroot` | Файлы HTTP-01 challenge Certbot | Нужен для продления |

Данные Docker физически находятся в зоне хранения Docker на Linux (часто `/var/lib/docker/volumes/`), но **не нужно вручную править PostgreSQL-файлы**. Источник истины для имён томов — `docker volume ls` и `docker volume inspect`. Перенос базы — через `pg_dump` / `pg_restore`.

**Никогда не выполнять без осознанного решения:**

```text
docker compose down -v         # удаляет тома проекта
docker volume prune            # может удалить нужные неиспользуемые тома
docker system prune --volumes  # риск потери persistent-данных
rm -rf /var/lib/docker        # уничтожение Docker-данных
```

Обычные `docker compose up -d --build`, `restart`, `stop` и `down` **без `-v`** не предназначены для удаления именованных томов; но `down` вызывает остановку сайта, поэтому для продакшена предпочитать `up -d`.

---

## 5. Локальная разработка на MacBook

**Локальная среда независима от production!** Docker Desktop на Mac хранит свои volumes и PostgreSQL отдельно. Изменения кода автоматически видны локально (Nuxt HMR), а в production попадают только после Git push + server pull/build.

| Параметр | Локальная среда |
|---|---|
| Машина | MacBook, macOS, Apple Silicon |
| IDE | PhpStorm |
| Папка | `~/Desktop/dev/tauhorse` |
| Docker | Docker Desktop |
| Docker Compose project | `tauhorse-simple-dev` |
| URL | **http://localhost:3001** |
| Контейнеры | 3/3 (`nginx`, `app`, `db`) |
| Nuxt | `NODE_ENV=development`, HMR, исходники смонтированы в контейнер |
| PostgreSQL | Своя **локальная** БД `horse_shop`, не production |
| HTTPS | Локально не требуется: HTTP localhost |

**Запуск (терминал Mac):**

```bash
cd ~/Desktop/dev/tauhorse

docker compose -p tauhorse-simple-dev \
  -f compose.yaml -f compose.dev.yaml \
  up -d --build

# Проверка:
docker compose -p tauhorse-simple-dev \
  -f compose.yaml -f compose.dev.yaml ps

open http://localhost:3001
```

**Остановить, не удаляя данные:**

```bash
cd ~/Desktop/dev/tauhorse
docker compose -p tauhorse-simple-dev \
  -f compose.yaml -f compose.dev.yaml stop
```

**Повторный запуск:**

```bash
docker compose -p tauhorse-simple-dev \
  -f compose.yaml -f compose.dev.yaml start
```

**Логи приложения, база, проверка:**

```bash
cd ~/Desktop/dev/tauhorse

docker compose -p tauhorse-simple-dev \
  -f compose.yaml -f compose.dev.yaml logs -f app

docker compose -p tauhorse-simple-dev \
  -f compose.yaml -f compose.dev.yaml ps

curl -fsS http://localhost:3001/api/health
```

**Как работает HMR:** `compose.dev.yaml` использует dev-стадию Dockerfile/Node, bind mount исходников и отдельные тома для зависимостей; Nuxt запускается в режиме `npm run dev`. Правки из PhpStorm автоматически видны на `localhost:3001`. Для изменений Dockerfile, зависимостей или Compose может понадобиться `up -d --build`.

**Локальная БД:** реальная публикация порта PostgreSQL может зависеть от актуального `compose.dev.yaml`. **Не угадывай порт**: посмотри `docker compose ... ps` или `docker compose ... port db 5432`. Ранее существовавший остановленный `tauhorse-dev-db` имел `5433:5432`, но это **старый ненужный контейнер**, а не источник настроек действующего проекта.

```bash
# Без зависимости от опубликованного порта — открыть psql внутри локального контейнера:
docker compose -p tauhorse-simple-dev \
  -f compose.yaml -f compose.dev.yaml \
  exec db psql -U horse_shop -d horse_shop

# Просмотр локальных volumes:
docker volume ls --filter label=com.docker.compose.project=tauhorse-simple-dev
```

**Старые локальные контейнеры:** остановленные `tauhorse-dev`, `tauhorse-dev-db` были остатками прежнего варианта. Рабочий локальный проект — `tauhorse-simple-dev`. При уборке сначала убедись, что новый проект работает; не удаляй volumes без проверки их назначения.

**Локальный `.env` и production `.env` — два независимых файла** на разных машинах. Для локального запуска используй примеры из текущего репозитория, не копируй production-секреты на Mac без необходимости.

---

## 6. Production `.env`: какие переменные нужны

Файл на Debian: **`/srv/tauhorse/.env`**, не хранится в Git. Рекомендуемые права `chmod 600` и владелец, способный запускать Compose.

Пример **шаблона без действующих секретов** (сначала сверить с `compose.yaml` и Nuxt runtime config):

```dotenv
# Docker project / locations of persistent volumes
COMPOSE_PROJECT_NAME=tauhorse
POSTGRES_VOLUME_NAME=horse_feed_shop_postgres
MEDIA_VOLUME_NAME=horse_feed_shop_media

# Exposed ports and Nginx config
HTTP_BIND_IP=0.0.0.0
HTTP_PORT=80
HTTPS_BIND_IP=0.0.0.0
HTTPS_PORT=443
NGINX_CONFIG=tauhorse-https.conf

# Secrets: generate fresh random values; do NOT commit
POSTGRES_PASSWORD=REPLACE_WITH_STRONG_RANDOM_SECRET
JWT_ACCESS_SECRET=REPLACE_WITH_STRONG_RANDOM_SECRET
JWT_REFRESH_SECRET=REPLACE_WITH_STRONG_RANDOM_SECRET

# Application public values
NUXT_PUBLIC_APP_URL=https://tauhorse.ru
NUXT_PUBLIC_SHOP_NAME=TauHorse
# NUXT_PUBLIC_SHOP_EMAIL=...
# NUXT_PUBLIC_SHOP_PHONE=...
# NUXT_PUBLIC_SHOP_PHONE_DISPLAY=...
# NUXT_PUBLIC_SHOP_ADDRESS=...
# NUXT_PUBLIC_SELLER_NAME=...
# NUXT_PUBLIC_SELLER_ID=...

# May exist in repository/old env — verify precedence in Compose:
COOKIE_SECURE=true
PRODUCTION_DEPLOYMENT=true
```

**Важные оговорки:**

- Значения `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `POSTGRES_PASSWORD` — секреты; создавать только на сервере, длинными случайными значениями (`openssl rand -hex 32` или аналог). Никогда не публиковать в README.
- `NUXT_JWT_ACCESS_SECRET` и `NUXT_JWT_REFRESH_SECRET` в контейнере production ранее задавались из `${JWT_ACCESS_SECRET}` / `${JWT_REFRESH_SECRET}` самим Compose.
- `DATABASE_URL` для production ранее формировался в Compose как `postgresql://horse_shop:${POSTGRES_PASSWORD}@db:5432/horse_shop?schema=public`; **не надо** менять `db` на `localhost`.
- Значения `NUXT_PUBLIC_*` **публичные**: Nuxt может отдавать их браузеру. Не размещать там пароли, ключи или персональные данные, не предназначенные для покупателей.
- Текущее рабочее `.env` может содержать и дополнительные переменные, влияющие на Nuxt. При миграции вначале сравнить список имён переменных со старым сервером **без раскрытия значений**.
- Значение `PRODUCTION_DEPLOYMENT` выше — шаблон для новой установки, **не утверждение**, что именно оно стоит на текущем сервере. Проверить требование в коде, не перетирать без необходимости.
- При переносе **существующей** базы пароль PostgreSQL уже сохранён в инициализированном томе. Если перенести том/данные и сменить только `POSTGRES_PASSWORD` в `.env`, пароль БД автоматически не изменится. Согласовать пароль с реальной ролью `horse_shop`.

---

## 7. GitHub, Git-ветка и процесс обновления

**Репозиторий:** https://github.com/nikita-developer/tauhorse  
**Основная ветка:** `main`  
**Деплой:** вручную через SSH на сервер, GitHub Actions **не используются**.

**На Mac:**

```bash
cd ~/Desktop/dev/tauhorse
git status -sb
git add -A
git diff --cached --check
git commit -m "Describe your change"
git push origin main
```

Перед `git add -A` проверь, что `.env`, `.env.*` с секретами, приватные ключи, данные БД и загруженные медиа исключены через `.gitignore`. **Не делать `git add -f .env`.**

**На Debian после push:**

```bash
ssh tauhorse  # с Mac, если настроен SSH alias
cd /srv/tauhorse
git status -sb
git pull --ff-only
sudo docker compose -f compose.yaml config --quiet
sudo docker compose -f compose.yaml up -d --build
sudo docker compose -f compose.yaml ps
curl -fsS https://tauhorse.ru/api/health
```

Производственные env-файлы не должны перезаписываться при `git pull`. Если `git status` показывает незакоммиченные изменения **в отслеживаемых файлах**, сначала выясни причину — `git pull --ff-only` не предназначен для принудительного уничтожения этих изменений.

**Никакого автоматического продакшен-деплоя:** GitHub хранит код, но Push сам по себе не обновляет сервер и не копирует базу/фотографии.

---

## 8. Основные команды на Debian

Все команды ниже выполняются в SSH-сессии **production Debian**:

```bash
cd /srv/tauhorse

# Состояние:
sudo docker compose -f compose.yaml ps
sudo docker ps

# Проверка конфигурации (без печати секретов):
sudo docker compose -f compose.yaml config --quiet

# Логи:
sudo docker compose -f compose.yaml logs --tail=100 app
sudo docker compose -f compose.yaml logs --tail=100 nginx
sudo docker compose -f compose.yaml logs --tail=100 db

# Перезапуск только приложения:
sudo docker compose -f compose.yaml restart app

# Обновление после Git pull:
sudo docker compose -f compose.yaml up -d --build

# Проверить БД внутри контейнера:
sudo docker compose -f compose.yaml exec -T db \
  pg_isready -U horse_shop -d horse_shop

# Проверить локально через Nginx с настоящим TLS:
curl -fsS --resolve tauhorse.ru:443:127.0.0.1 \
  https://tauhorse.ru/api/health

# Внешняя публичная проверка:
curl -I https://tauhorse.ru

# Проверить порты:
sudo ss -lntp | grep -E ':(22|80|443)\b' || true

# Посмотреть тома:
sudo docker volume ls

# Проверить синтаксис текущего Nginx:
sudo docker compose -f compose.yaml exec -T nginx nginx -t

# Перечитать конфиг Nginx без остановки контейнера:
sudo docker compose -f compose.yaml exec -T nginx nginx -s reload
```

Health endpoint: **`/api/health`**. Ранее здоровый ответ имел вид:

```json
{"status":"ok","database":"ok","timestamp":"..."}
```

Не интерпретировать успешный `docker ps` как доказательство, что БД/магазин работает — проверяй также `/api/health` и основные сценарии в браузере.

---

## 9. HTTPS, Certbot, автопродление

**Схема:** Let's Encrypt HTTP-01 webroot, одноразовый образ `certbot/certbot:latest`, два Docker volumes, конфигурация Nginx на диске в Git. Для сертификатов **не используется** API REG.RU.

Известный успешный выпуск `tauhorse.ru` осуществлён 22.10.2026, сертификат первоначально действителен **до 20.01.2027**. Успешно прошёл `certbot renew --dry-run`. Ежедневный таймер systemd был включён на исходном сервере. Этот срок — историческое состояние, а не вечная гарантия: проверяйте текущий сертификат.

**Пути в контейнерах:**

```text
Nginx:
  /etc/nginx/conf.d/default.conf
  /etc/letsencrypt/live/tauhorse.ru/fullchain.pem
  /etc/letsencrypt/live/tauhorse.ru/privkey.pem
  /var/www/certbot/.well-known/acme-challenge/

Host systemd:
  /etc/systemd/system/tauhorse-certbot.service
  /etc/systemd/system/tauhorse-certbot.timer
```

**Проверка timer/renewal:**

```bash
sudo systemctl is-enabled tauhorse-certbot.timer
sudo systemctl is-active tauhorse-certbot.timer
systemctl list-timers --all tauhorse-certbot.timer
sudo systemctl status tauhorse-certbot.service --no-pager

# Проверить тестовое обновление через staging ACME:
sudo docker run --rm \
  -v tauhorse_tls_certs:/etc/letsencrypt \
  -v tauhorse_acme_webroot:/var/www/certbot \
  certbot/certbot:latest renew --dry-run --non-interactive

# Текущие сертификаты:
sudo docker run --rm \
  -v tauhorse_tls_certs:/etc/letsencrypt:ro \
  certbot/certbot:latest certificates
```

**Конфигурация systemd на исходном сервере** (при переносе создаётся заново; путь к Docker проверить `command -v docker`):

`/etc/systemd/system/tauhorse-certbot.service`:

```ini
[Unit]
Description=Renew TauHorse SSL certificate
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
ExecStart=/usr/bin/docker run --rm -v tauhorse_tls_certs:/etc/letsencrypt -v tauhorse_acme_webroot:/var/www/certbot certbot/certbot:latest renew --non-interactive --quiet
ExecStartPost=/usr/bin/docker exec tauhorse-nginx-1 nginx -s reload
```

`/etc/systemd/system/tauhorse-certbot.timer`:

```ini
[Unit]
Description=Automatic TauHorse SSL renewal

[Timer]
OnCalendar=daily
RandomizedDelaySec=1h
Persistent=true

[Install]
WantedBy=timers.target
```

Активировать на **новом** Debian после успешного выпуска сертификата:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now tauhorse-certbot.timer
sudo systemctl start tauhorse-certbot.service
systemctl list-timers --all tauhorse-certbot.timer
```

Таймер вызывает `renew` ежедневно; реальный выпуск происходит только когда Certbot сочтёт это необходимым. `ExecStartPost` перечитывает Nginx после успешного запуска команды Certbot, включая проверки без фактического обновления. Для HTTP-01 внешний **TCP 80 должен оставаться доступным**; ACME location нельзя перекрывать редиректом HTTPS.

**Проверка публичного HTTPS:**

```bash
curl -I https://tauhorse.ru
openssl s_client -connect tauhorse.ru:443 -servername tauhorse.ru </dev/null 2>/dev/null \
  | openssl x509 -noout -dates -subject
```

---

## 10. Создание или обновление администратора

На production был проверен скрипт `/app/scripts/create-admin.mjs` **внутри контейнера `app`**. Он сообщал «Администратор ... создан или обновлён». Повтор с тем же email может обновлять пароль; другой email может создать нового администратора. Не указывать логин или пароль администратора в публичном README.

```bash
cd /srv/tauhorse

read -r -p "Email администратора: " ADMIN_EMAIL
read -r -s -p "Новый пароль (не менее 16 символов): " ADMIN_PASSWORD
echo

if [ "${#ADMIN_PASSWORD}" -lt 16 ]; then
  echo "Пароль слишком короткий"
else
  printf '%s\n%s\n' "$ADMIN_EMAIL" "$ADMIN_PASSWORD" |
    sudo docker compose -f compose.yaml exec -T app sh -c '
      IFS= read -r ADMIN_EMAIL
      IFS= read -r ADMIN_PASSWORD
      export ADMIN_EMAIL ADMIN_PASSWORD
      exec node /app/scripts/create-admin.mjs
    '
fi
unset ADMIN_EMAIL ADMIN_PASSWORD
```

При новом развёртывании сначала проверь, что скрипт всё ещё существует и не изменилась его семантика. Никогда не передавай пароль через публичный чат или аргументы команды командной строки.

---

## 11. Установка на **НОВЫЙ СЕРВЕР** с чистой базой

Ниже — воспроизводимый сценарий для **Debian 13 amd64**, например купленной VPS. Для другого дистрибутива адаптировать Docker/SSH/firewall. Перед началом реши: нужна новая пустая БД или перенос реальных данных? **Для переноса используй раздел 12.**

### 11.1. Подготовка Linux и SSH

1. Получить новый публичный IP, доступ root/sudo от провайдера, настроить DNS только после готовности приложения и переноса данных.
2. Создать пользователя `tauadmin` с `sudo` (при необходимости):

```bash
# Выполнять на НОВОМ Debian под root, если пользователь ещё не создан:
adduser tauadmin
usermod -aG sudo tauadmin
```

3. Перенести **только публичный** SSH-ключ из Mac `~/.ssh/id_ed25519_tauhorse.pub` в `/home/tauadmin/.ssh/authorized_keys`, выставить владельца/права (`.ssh` 700, `authorized_keys` 600). Использовать новый IP и реальный SSH-порт. Сначала проверить вход по ключу, только затем менять настройки SSH/firewall.
4. Разрешить SSH, TCP 80 и TCP 443 в firewall Debian **и в cloud firewall/security group VPS**. На VPS не нужен домашний проброс портов. Не публиковать 3000, 5432, 8080, 8443.
5. Если домен переезжает на новый сервер, изменить `A` для `tauhorse.ru` на новый внешний IP, проверить и удалить/обновить устаревшие `AAAA`, если они есть. DNS NS могут остаться у REG.RU — их менять для Certbot не требуется.

### 11.2. Установка Docker из официального APT-репозитория

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git openssl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF_DOCKER
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF_DOCKER

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker version
sudo docker compose version
```

Официальная инструкция: https://docs.docker.com/engine/install/debian/ . Системный Nginx/Apache на 80 и 443 не нужен: их займёт Docker Nginx. Проверить, что нет конфликта портов через `sudo ss -lntp`.

### 11.3. Клонирование **в точную папку**

```bash
sudo mkdir -p /srv
sudo chown tauadmin:tauadmin /srv
cd /srv
git clone https://github.com/nikita-developer/tauhorse.git tauhorse
cd /srv/tauhorse
git switch main
git status -sb
```

Если `/srv/tauhorse` уже существует, **не удаляй его**. Сначала проверь `git status`, `.env`, volumes, есть ли работающий сервер.

### 11.4. Подготовка `.env`, HTTP и контейнеров

Создай `/srv/tauhorse/.env` на новом сервере, взяв шаблон из раздела 6 (либо актуальный `.env.example` из Git, если он существует). На стадии первичного выпуска сертификата обязательно:

```dotenv
COMPOSE_PROJECT_NAME=tauhorse
HTTP_BIND_IP=0.0.0.0
HTTP_PORT=80
HTTPS_BIND_IP=0.0.0.0
HTTPS_PORT=443
NGINX_CONFIG=tauhorse-http.conf
POSTGRES_VOLUME_NAME=horse_feed_shop_postgres
MEDIA_VOLUME_NAME=horse_feed_shop_media
NUXT_PUBLIC_APP_URL=https://tauhorse.ru
```

Также добавь **сгенерированные уникальные** `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, остальные поля, которые требует текущий Nuxt/Compose. Для нового сервера не копируй пароли из README. При создании нового `.env`:

```bash
cd /srv/tauhorse
umask 077
# nano .env  # вписать необходимые значения вручную
chmod 600 .env

sudo docker compose -f compose.yaml config --quiet
sudo docker compose -f compose.yaml up -d --build
sudo docker compose -f compose.yaml ps
curl -fsS http://127.0.0.1/api/health
```

Для **пустой базы** применить миграции командой из **фактического** `package.json`/Dockerfile. В исходной установке Prisma migrations были применены при подготовке БД (10 миграций на 22.10.2026). Не запускать `prisma migrate dev` в production; `prisma migrate deploy` безопаснее для штатных подготовленных миграций, но путь к Prisma CLI надо сверить с текущим образом.

### 11.5. Проверка ACME и выпуск нового TLS на новом IP

Сначала DNS `tauhorse.ru` должен указывать на **новый сервер**, TCP 80 быть доступен из внешнего интернета, HTTP Nginx — работать. Создай challenge-файл:

```bash
sudo docker run --rm \
  -v tauhorse_acme_webroot:/data \
  --entrypoint sh alpine:3.21 -c '
    mkdir -p /data/.well-known/acme-challenge
    echo tauhorse-ok > /data/.well-known/acme-challenge/test
  '

curl -fsS http://127.0.0.1/.well-known/acme-challenge/test
# Затем проверить извне:
# http://tauhorse.ru/.well-known/acme-challenge/test
```

После внешнего `tauhorse-ok`:

```bash
read -r -p "Email для Let's Encrypt: " LE_EMAIL
sudo docker run --rm \
  -v tauhorse_tls_certs:/etc/letsencrypt \
  -v tauhorse_acme_webroot:/var/www/certbot \
  certbot/certbot:latest certonly \
  --webroot -w /var/www/certbot \
  -d tauhorse.ru \
  --email "$LE_EMAIL" --agree-tos --non-interactive
unset LE_EMAIL
```

После **успешного** выпуска:

```bash
cd /srv/tauhorse
sudo env NGINX_CONFIG=tauhorse-https.conf \
  docker compose -f compose.yaml run --rm --no-deps nginx nginx -t

# Изменить одну переменную в .env с HTTP на HTTPS:
sudo sed -i \
  's/^NGINX_CONFIG=.*/NGINX_CONFIG=tauhorse-https.conf/' .env
sudo docker compose -f compose.yaml up -d --no-deps nginx

curl -fsS --resolve tauhorse.ru:443:127.0.0.1 \
  https://tauhorse.ru/api/health
```

Затем создать systemd timer/service по разделу 9, активировать, выполнить `renew --dry-run`, проверить публичный HTTPS. При первом запуске SSL-конфигурация не должна активироваться до появления файлов сертификата, иначе Nginx может не стартовать.

### 11.6. Конечная проверка новой установки

```bash
cd /srv/tauhorse
sudo docker compose -f compose.yaml ps
sudo docker compose -f compose.yaml exec -T db \
  pg_isready -U horse_shop -d horse_shop
curl -fsS https://tauhorse.ru/api/health
systemctl is-active tauhorse-certbot.timer
```

После пустой установки создать администратора по разделу 10, проверить админку, каталог, загрузку изображения, корзину и заказ. Не подключать оплату/реальные заказы без проверки бизнес-логики и секретов.

---

## 12. **ПЕРЕНОС** со старого сервера на новый **с сохранением данных**

**Критично:** `git clone` перенесёт только код. Чтобы на новом сервере появились уже существующие товары, клиенты, заказы и изображения, нужен **экспорт PostgreSQL и volume медиа**. Ниже — явный сценарий **ручной миграции**, а не настройка автоматических бэкапов.

> Перед миграцией остановить оформление новых заказов/запись данных (maintenance window), чтобы состояние DB и media совпадало. Обязательно хранить временные копии в безопасном месте, проверить, что они получены, и не удалять старый сервер до успешной проверки нового.

### 12.1. На СТАРОМ Debian: создать экспорт

```bash
cd /srv/tauhorse
mkdir -p "$HOME/tauhorse-migration"
chmod 700 "$HOME/tauhorse-migration"

# Экспорт логической PostgreSQL 17 (не копировать сырые файлы data-dir):
sudo docker compose -f compose.yaml exec -T db \
  pg_dump -U horse_shop -d horse_shop -Fc \
  > "$HOME/tauhorse-migration/postgres.dump"

# Экспорт файлов медиа в tar.gz:
sudo docker run --rm \
  -v horse_feed_shop_media:/data:ro \
  -v "$HOME/tauhorse-migration:/backup" \
  alpine:3.21 \
  tar -czf /backup/media.tar.gz -C /data .

ls -lh "$HOME/tauhorse-migration/"
sha256sum "$HOME/tauhorse-migration/"*
```

Лучше на время экспорта остановить приём новых запросов/записей. **Обычный `pg_dump` создаёт согласованный снимок БД, но не делает автоматически снимок медиа.**

### 12.2. Перенос файлов между серверами

Используй `scp` или `rsync` через SSH; пример через Mac как промежуточную машину (выполнять **на Mac**, предварительно `mkdir -p ~/Desktop/tauhorse-migration`):

```bash
scp tauhorse:~/tauhorse-migration/postgres.dump \
  ~/Desktop/tauhorse-migration/
scp tauhorse:~/tauhorse-migration/media.tar.gz \
  ~/Desktop/tauhorse-migration/

# На новый сервер (заменить NEW_HOST на реальный SSH-host/alias):
scp ~/Desktop/tauhorse-migration/postgres.dump \
  ~/Desktop/tauhorse-migration/media.tar.gz \
  tauadmin@NEW_HOST:~/tauhorse-migration/
```

**Примечание:** целевая папка `~/tauhorse-migration` на новом сервере должна быть заранее создана (`mkdir -p ~/tauhorse-migration`). Если новый SSH-порт не 22, передай `-P <port>` для `scp`. Использование SSH alias `tauhorse` на старой машине предполагает заранее настроенный `~/.ssh/config`.

Production `.env` переноси **только защищённо**, либо создавай заново. При сохранении БД необходимо сохранить/согласовать **действительный PostgreSQL-пароль**, а также нужные JWT-настройки. Сертификаты можно перевыпустить на новом сервере через Certbot — это часто проще, чем перенос TLS-ключей.

### 12.3. На НОВОМ Debian: подготовить проект и volumes

1. Установить Debian/Docker и клонировать Git в **`/srv/tauhorse`** по разделу 11.
2. Создать production `.env`, указать volume names из раздела 4 и корректные переменные, включая пароль существующей DB при необходимости.
3. **Не запускай публичный app до восстановления данных.** Поднять только БД:

```bash
cd /srv/tauhorse
sudo docker compose -f compose.yaml up -d db
sudo docker compose -f compose.yaml exec -T db \
  pg_isready -U horse_shop -d horse_shop
```

4. **Восстановление БД на пустом целевом сервере** (перезапись существующих объектов в целевой базе; не выполнять на текущем production):

```bash
cd /srv/tauhorse
sudo docker compose -f compose.yaml exec -T db \
  pg_restore -U horse_shop -d horse_shop \
  --clean --if-exists --no-owner --no-acl \
  < "$HOME/tauhorse-migration/postgres.dump"
```

5. Восстановление медиа в volume на **новом сервере**:

```bash
sudo docker volume create horse_feed_shop_media
sudo docker run --rm \
  -v horse_feed_shop_media:/data \
  -v "$HOME/tauhorse-migration:/backup:ro" \
  alpine:3.21 \
  tar -xzf /backup/media.tar.gz -C /data
```

6. Проверить восстановленные данные (например, число товаров/заказов через админку или согласованные SQL-запросы), а затем запускать `app` и `nginx`:

```bash
cd /srv/tauhorse
sudo docker compose -f compose.yaml up -d --build
sudo docker compose -f compose.yaml ps
```

7. Переключить DNS домена на новый публичный IP, выполнить процедуру HTTPS по разделу 11.5, включить таймер по разделу 9.
8. Проверить `https://tauhorse.ru`, API, медиа, вход администратора, основные функции. Только после этого отключать старый сервер.

**Предупреждения:**

- Восстановление `pg_restore --clean` меняет целевую БД. **Только на новом сервере с разрешением владельца.**
- Не копировать каталог PostgreSQL из `volume` обычным `cp` в работающем контейнере — можно получить несогласованные данные.
- При несовместимости версии PostgreSQL/Prisma сначала проверить версию серверного образа и формат дампа. На исходной системе PostgreSQL 17.
- `pg_restore` может вернуть предупреждения, если целевая база не пуста или схема отличается; не игнорировать коды завершения.
- Проверить права на распакованные media, если контейнер `app` запущен под непривилегированным пользователем.
- Не очищать старые volumes и не удалять старый сервер, пока перенос не подтверждён.

---

## 13. Сеть и безопасность

**Исходный домашний сервер:**

- Входящий SSH: TCP 22 на Debian, из интернета роутер переводит **WAN_SSH_PORT → 22**.
- HTTP/HTTPS: входящие TCP **80**, **443**. На роутере переводятся на `CURRENT_LAN_IP` с теми же номерами портов.
- Docker Nginx слушает публичные порты в production (`0.0.0.0:80/443`).
- Приложение и PostgreSQL доступны по **внутренним Docker-сетям**, не публиковать их порты наружу.
- NAT loopback на роутере включён для HTTP/HTTPS, чтобы домен работал из домашней сети.
- UPnP, DMZ для TauHorse не нужны.
- Хост использует firewall/nftables; Docker также создаёт свои правила через iptables-nft. **Учесть, что Docker-published ports могут обходить некоторые правила `ufw`/nftables**, проверять доступность снаружи и Docker `DOCKER-USER` при настройке фильтрации.
- HTTPS Nginx использует сертификат домена **`tauhorse.ru`**; `www.tauhorse.ru` не следует считать автоматически настроенным — для него нужны DNS, server_name и сертификат на дополнительное имя.
- На первоначальной настройке имелись раскрытые в переписке JWT-секреты: **их рекомендуется ротировать перед интенсивным использованием**; это инвалидирует активные токены/сессии.
- Хост-сервис `nginx` (если установлен пакетом Debian) ранее был выключен/не использовался: production proxy — контейнер `nginx`.
- Автоматические бэкапы старого `tauhorse-backup.timer` **отключены**. Защита от потери данных отдельно не автоматизирована.

**Ротация секретов:** не менять случайным образом пароль PostgreSQL на существующей БД простым редактированием `.env`: сначала синхронизировать пароль самой DB-роли и конфигурацию. JWT-секреты обновлять согласованно, затем пересоздать `app` без удаления базы. Не публиковать значения в логах/коммитах.

---

## 14. Типовые проблемы и порядок диагностики

| Симптом | Проверить | Частая причина |
|---|---|---|
| `localhost:3001` на Mac недоступен | Docker Desktop, `tauhorse-simple-dev`, `docker compose ... ps/logs` | Локальный проект остановлен; путаница со старым `tauhorse-dev` |
| `https://tauhorse.ru` не работает, `/api/health` работает локально | DNS, public IP, маршрутизация, 80/443, Nginx logs | NAT, firewall, сертификат, Docker ports |
| Домен работает с мобильного интернета, но не из домашнего Wi-Fi | NAT loopback Eltex, локальный DNS | Выключен NAT loopback для 80/443 |
| HTTP challenge отвечает 404 | URL точно `/.well-known/acme-challenge/test`, наличие файла в volume, Nginx ACME location | Ошибка в пути или неверный Nginx config |
| Nginx не стартует после включения HTTPS | `nginx -t`, сертификаты в `tauhorse_tls_certs` | Файлы сертификата ещё не выпущены или смонтированы неверно |
| `database: ...` не ok | `docker compose ps`, `db logs`, `pg_isready`, `DATABASE_URL` | DB не healthy, неправильные секреты, миграции |
| Certbot renew fail | порт 80, A/AAAA, DNS, challenge, таймер | HTTP-01 недоступен извне |
| SSH снаружи не работает | роутер TCP WAN_SSH_PORT → 22, ключ, firewall | Port forwarding, новый IP, неверный ключ |
| После деплоя нет товаров | volumes `horse_feed_shop_postgres` и `horse_feed_shop_media`, `COMPOSE_PROJECT_NAME` | Запущен новый пустой volume/другой Compose project |
| Браузер показывает предупреждение TLS | сертификат домена, `openssl s_client`, время, конфиг Nginx | Неверный домен/цепочка или просроченный сертификат |

**Порядок проверки без разрушительных действий (Debian):**

```bash
cd /srv/tauhorse
sudo docker compose -f compose.yaml ps
sudo docker compose -f compose.yaml logs --tail=50 nginx app db
sudo docker compose -f compose.yaml config --quiet
sudo docker compose -f compose.yaml exec -T nginx nginx -t
curl -fsS --resolve tauhorse.ru:443:127.0.0.1 \
  https://tauhorse.ru/api/health
systemctl list-timers --all tauhorse-certbot.timer
```

---

## 15. Сводка: как всё устроено и что переносить

| Категория | Старый домашний production | Новый сервер |
|---|---|---|
| Код | `/srv/tauhorse` из GitHub `main` | `git clone` в `/srv/tauhorse` |
| Runtime | Debian 13 + Docker Engine/Compose | Установить на Debian 13/VPS |
| Compose | `compose.yaml` | Тот же файл |
| Секреты | `/srv/tauhorse/.env` | Создать/защищённо перенести вне Git |
| Домен | `tauhorse.ru` → `CURRENT_PUBLIC_IP` | Изменить A на новый публичный IP |
| Сеть | Роутер Eltex 80/443 → `CURRENT_LAN_IP` | На VPS открыть 80/443 напрямую, без роутера |
| Основная БД | `horse_feed_shop_postgres` | Перенести `pg_dump`/`pg_restore` или создать пустую |
| Изображения | `horse_feed_shop_media` | Перенести tar/volume или создать пустую |
| Сертификаты | `tauhorse_tls_certs` | Проще выпустить новые через Certbot после DNS |
| Продление SSL | `tauhorse-certbot.timer` | Создать и включить systemd timer |
| Администратор | Есть в текущей PostgreSQL | При миграции сохраняется из БД; при пустой БД создать скриптом |
| Локальная разработка | Mac `~/Desktop/dev/tauhorse`, `tauhorse-simple-dev`, порт 3001 | Продолжает работать независимо |

### Что обязательно сообщить новому ИИ при переезде

1. **Новый внешний IP, ОС, доступ по SSH и какой у пользователя sudo.** Секретный ключ/пароли не пересылать.
2. **Пустая установка или перенос существующих товаров и заказов?** Для переноса нужен доступ к старому серверу и экспортам DB/media.
3. **Где будут жить DNS и TLS**: домен `tauhorse.ru`, HTTP-01 через открытый порт 80, HTTPS через Nginx Docker.
4. **Есть ли доступ к GitHub и текущему `main`**. ИИ должен читать настоящий репозиторий, а не писать новый Nuxt-проект.
5. **Что является успешным результатом**: 3 healthy/running контейнера, `/api/health` возвращает `status=ok` и `database=ok`, `https://tauhorse.ru` открывается, фотографии и админка работают, `renew --dry-run` успешен, systemd timer активен.

---

## 16. Краткая памятка команд

**Mac — локально:**

```bash
cd ~/Desktop/dev/tauhorse
# запуск
docker compose -p tauhorse-simple-dev -f compose.yaml -f compose.dev.yaml up -d --build
# логи
docker compose -p tauhorse-simple-dev -f compose.yaml -f compose.dev.yaml logs -f app
# остановка
docker compose -p tauhorse-simple-dev -f compose.yaml -f compose.dev.yaml stop
# проверить сайт
curl http://localhost:3001/api/health
```

**Mac — отправка кода:**

```bash
cd ~/Desktop/dev/tauhorse
git status -sb
git add -A && git diff --cached --check
git commit -m "Your message" && git push origin main
```

**Debian — обновление production:**

```bash
ssh tauhorse
cd /srv/tauhorse
git pull --ff-only
sudo docker compose -f compose.yaml up -d --build
sudo docker compose -f compose.yaml ps
curl -fsS https://tauhorse.ru/api/health
```

**Debian — SSL:**

```bash
systemctl is-active tauhorse-certbot.timer
sudo docker compose -f compose.yaml exec -T nginx nginx -t
sudo docker run --rm -v tauhorse_tls_certs:/etc/letsencrypt \
  -v tauhorse_acme_webroot:/var/www/certbot \
  certbot/certbot:latest renew --dry-run --non-interactive
```

---

## 17. Открытые организационные вопросы

- **Бэкапы:** намеренно не включены. Потеря диска может означать потерю заказов и фотографий. Для настоящего магазина желательно хотя бы ручное периодическое сохранение PostgreSQL и media вне домашнего сервера. Это предложение, а не установленная автоматизация.
- **Статический IP:** публичный домашний IP может измениться; при смене нужно обновить DNS. На VPS обычно назначают отдельный статический публичный IP.
- **Мониторинг, алерты, внешняя доступность:** специальный мониторинг не устанавливался. `docker compose ps`, API health и таймер Certbot — базовые проверки.
- **Секреты:** ротировать ранее раскрытые JWT-значения и проверить, что `.env` никогда не попадёт в Git.
- **Функциональные тесты:** отдельно проверить регистрацию/вход, админку, каталог, фото, корзину, оформление заказов и ошибки 4xx/5xx.

---

**Правило номер один при любом восстановлении TauHorse: сначала сохранить БД, media и секреты, затем менять код и инфраструктуру. GitHub — это код; Docker volumes — реальные данные магазина.**
