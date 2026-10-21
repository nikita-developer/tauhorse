# TauHorse — production audit

Дата актуализации: 18.10.2026.

Проект подготовлен для одного Linux production-сервера через Docker Compose.

## Архитектура

- Nginx принимает HTTP/HTTPS на 80/443;
- Nuxt доступен только внутри Docker-сети на 3000;
- PostgreSQL доступен только внутри Docker-сети на 5432;
- Certbot выпускает и продлевает Let's Encrypt;
- отдельный backup-контейнер создаёт резервные копии PostgreSQL;
- media, БД и сертификаты хранятся в именованных volumes;
- SMTP подключается отдельно и не блокирует первый запуск production.

## Безопасность

- production-секреты не хранятся в архиве и создаются в `.env`;
- production validator проверяет домен, HTTPS, реальные реквизиты продавца и силу секретов до миграций;
- административные route rules используют `no-store` и `X-Robots-Tag: noindex`;
- app-контейнер работает не от root и с read-only filesystem;
- PostgreSQL и Nuxt не публикуют production-порты наружу;
- Nginx скрывает shared-cart URL из access log;
- загрузки проверяются на стороне приложения;
- административные действия журналируются.

## Воспроизводимость

- npm-зависимости зафиксированы точными версиями;
- `package-lock.json` входит в проект;
- Dockerfile использует `npm ci`;
- Node runtime закреплён в Dockerfile;
- автоматического npm update во время deploy нет.

## SEO и производительность

- единый SEO composable задаёт title/description/canonical/Open Graph/Twitter metadata;
- карточки товаров формируют Product JSON-LD;
- FAQ формирует FAQPage JSON-LD;
- sitemap формируется из публичных страниц и товаров;
- служебные маршруты закрыты от индексации;
- изображения каталога lazy-load, первая картинка товара загружается приоритетно;
- catalog video не autoplay;
- Nginx включает gzip и долгий cache для fingerprinted Nuxt assets.

## Что нельзя считать закрытым только кодом

Перед фактическими продажами необходимо выполнить `PRODUCTION_CHECKLIST.md`: проверить ККТ/кассовые чеки для реальной схемы расчётов, организационные обязанности по персональным данным, DNS/публичный IP домашнего сервера, SMTP и внешние резервные копии.
