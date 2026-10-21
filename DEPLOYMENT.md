# Развёртывание TauHorse

## 1. Что требуется от Linux-сервера

- x86_64/amd64 или совместимая архитектура Docker-образов проекта;
- не менее 2 vCPU, 4 ГБ RAM и 40+ ГБ SSD/NVMe рекомендуется для production и сборок;
- доступ в интернет;
- входящие TCP 80/443;
- для домашнего сервера — публичный IPv4 без CGNAT и проброс 80/443 на локальный IP сервера;
- DNS A-запись `tauhorse.ru` на публичный IPv4.

## 2. Первый запуск

```bash
sudo mkdir -p /opt/tauhorse
cd /opt/tauhorse
# распакуйте сюда проект
sudo ./install.sh
```

Если Docker отсутствует, install-скрипт установит Docker Engine и Compose plugin. Далее мастер создаст `.env`, а deploy-скрипт проверит конфигурацию до миграций, соберёт Nuxt, выпустит HTTPS и запустит весь стек.

SMTP можно не настраивать при первом запуске. В этом случае магазин работает, но функции, зависящие от email, временно недоступны.

## 3. SMTP позже

После регистрации у почтового провайдера заполните в `.env`:

```env
SMTP_HOST=
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=
SMTP_PASS=
MAIL_FROM="TauHorse <...>"
ORDER_NOTIFICATION_EMAIL=zoloto666@inbox.ru
```

Проверка:

```bash
sudo ./smtp-test.sh
sudo ./update.sh
```

## 4. Обновление приложения

Замените исходники, не перезаписывая production `.env`, затем:

```bash
sudo ./update.sh
```

Миграции Prisma выполняются при старте приложения через production entrypoint. База и media находятся в именованных Docker volumes и не удаляются обычным `docker compose down`/пересборкой.

Не используйте `docker compose down -v`, если не хотите удалить volumes.

## 5. Backup и перенос

```bash
sudo ./backup.sh
```

Архив создаётся в `exports/tauhorse_YYYYMMDD_HHMMSS.tar.gz` и содержит:

- дамп PostgreSQL;
- загруженные изображения/видео;
- production `.env`.

Это секретный архив. Копируйте его во внешнее приватное хранилище.

Восстановление:

```bash
sudo ./restore.sh /path/to/tauhorse_YYYYMMDD_HHMMSS.tar.gz
```

Перед восстановлением скрипт требует явного подтверждения.

## 6. Домашний production

Для домашнего сервера особенно важны:

- постоянный локальный IP Linux-компьютера в LAN;
- проброс TCP 80 → server:80 и TCP 443 → server:443;
- проверка публичного IPv4/CGNAT у провайдера;
- динамический DNS или обновление A-записи при меняющемся внешнем IP;
- проводной интернет, автозапуск после сбоя питания и желательно ИБП;
- внешние backup-копии, не лежащие на том же диске.

## 7. Полезные команды

```bash
sudo ./status.sh
sudo ./logs.sh
sudo ./update.sh
sudo ./backup.sh
```
