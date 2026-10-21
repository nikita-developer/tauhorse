# TauHorse — Docker / Nginx

Интернет-магазин кормов и лизунцов для лошадей. Один и тот же исходный код запускается локально и разворачивается на Linux-сервере через Docker Compose.

## Состав production

```text
Интернет :80/:443
        ↓
      Nginx
        ↓
    Nuxt app :3000
        ↓
 PostgreSQL :5432

Certbot → HTTPS
backup  → резервные копии PostgreSQL
SMTP    → подключается отдельно, когда будут готовы реквизиты почтового сервиса
```

Порты приложения и PostgreSQL в production наружу не публикуются.

## Локальный запуск

```bash
cp .env.example .env
docker compose up -d --build
```

Сайт: `http://localhost:3000`.

Если используется уже существующий volume PostgreSQL, сохраняйте его текущий `POSTGRES_PASSWORD`. Не выполняйте `docker compose down -v`, если данные нужно сохранить.

## Первый production-запуск

Рекомендуемый каталог:

```bash
/opt/tauhorse
```

На поддерживаемом Linux:

```bash
sudo ./install.sh
```

Мастер спросит production-домен и email Let's Encrypt, создаст сильные DB/JWT-секреты и предложит сразу настроить SMTP. SMTP разрешено пропустить и подключить позже.

Основной домен проекта: `tauhorse.ru`.

### Для домашнего сервера

Нужны публичный IPv4 без CGNAT, проброс TCP 80/443 с роутера на сервер и DNS A-запись `tauhorse.ru` на этот IP. При динамическом IP нужен механизм обновления DNS.

### Email

Код отправляет служебные и маркетинговые письма через SMTP/Nodemailer. После получения SMTP-реквизитов заполните `SMTP_*`, `MAIL_FROM` и `ORDER_NOTIFICATION_EMAIL` в `.env`, затем:

```bash
sudo ./smtp-test.sh
sudo ./update.sh
```

Маркетинговая рассылка включается пользователем отдельно; служебные письма о регистрации, восстановлении доступа и заказах не смешиваются с рекламным согласием.

## Обновление и диагностика

```bash
sudo ./update.sh
sudo ./status.sh
sudo ./logs.sh
```

## Резервное копирование и перенос

```bash
sudo ./backup.sh
```

Создаёт приватный export с PostgreSQL, media и production `.env`. Для восстановления на другом сервере:

```bash
sudo ./restore.sh /path/to/tauhorse_YYYYMMDD_HHMMSS.tar.gz
```

Копии нужно регулярно выносить на другой физический носитель/сервер: Docker volume не защищает от отказа или потери всего домашнего компьютера.

## Зависимости

Версии в `package.json` зафиксированы точно, `package-lock.json` сохранён, Dockerfile устанавливает зависимости через `npm ci`. Автоматического обновления npm-пакетов при deployment нет.

## Production-проверка

Перед реальным запуском прочитайте `PRODUCTION_CHECKLIST.md`.
