import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {fileURLToPath} from 'node:url'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')
const read=rel=>readFileSync(resolve(root,rel),'utf8')

test('docker context keeps Prisma migration SQL while excluding database backups',()=>{
  const ignore=read('.dockerignore')
  assert.doesNotMatch(ignore,/^\*\.sql$/m)
  assert.match(ignore,/\/horse_shop_backup\.sql/)
  assert.match(ignore,/\*\.dump/)
})

test('production images and Node engine are pinned or constrained to reviewed lines',()=>{
  const dockerfile=read('Dockerfile')
  const compose=read('docker-compose.production.yml')
  const pkg=JSON.parse(read('package.json'))
  assert.match(dockerfile,/node:22\.23\.3-bookworm-slim/)
  assert.match(compose,/postgres:17\.11-alpine3\.24/)
  assert.match(compose,/nginx:1\.30\.5-alpine/)
  assert.match(compose,/certbot\/certbot:v5\.7\.0/)
  assert.equal(pkg.engines.node,'>=22.19.0 <23')
})

test('manager assignment and one-time auth tokens use atomic database guards',()=>{
  const orders=read('server/services/order.service.js')
  const auth=read('server/services/auth.service.js')
  assert.match(orders,/assigned_manager_id:null.*assigned_manager_id:request\.user\.id/)
  assert.match(auth,/passwordResetToken\.updateMany/)
  assert.match(auth,/emailVerificationToken\.updateMany/)
})

test('campaign sending is claimed once and paginates recipients',()=>{
  const campaign=read('server/services/campaign.service.js')
  assert.match(campaign,/status:'draft'.*status:'sending'/s)
  assert.match(campaign,/cursor:\{id:cursor\}/)
  assert.match(campaign,/take:500/)
})

test('production nginx serves media read-only and skips secret shared-cart URLs in access log',()=>{
  const compose=read('docker-compose.production.yml')
  const nginx=read('nginx/default.conf.template')
  assert.match(compose,/product_media:\/srv\/media:ro/)
  assert.match(nginx,/location \/media\//)
  assert.match(nginx,/~\^\/shared-cart\//)
  assert.match(nginx,/~\^\/api\/shared-carts\//)
  assert.match(nginx,/access_log .*if=\$access_log_enabled/)
})

test('production nginx terminates TLS with letsencrypt volumes and only publishes 80 and 443',()=>{
  const compose=read('docker-compose.production.yml')
  const nginx=read('nginx/default.conf.template')
  assert.match(compose,/"80:80"/)
  assert.match(compose,/"443:443"/)
  assert.doesNotMatch(compose,/"3000:3000"/)
  assert.doesNotMatch(compose,/"5432:5432"/)
  assert.match(nginx,/ssl_certificate \/etc\/letsencrypt\/live\/\$\{DOMAIN\}\/fullchain\.pem/)
  assert.match(nginx,/return 301 https:\/\/\$host\$request_uri/)
  assert.match(compose,/certbot\/certbot:v5\.7\.0/)
})

test('first VPS deploy can bootstrap ACME before application migrations',()=>{
  const compose=read('docker-compose.production.yml')
  const deploy=read('scripts/deploy-vps.sh')
  const bootstrap=read('nginx/bootstrap.conf.template')
  assert.match(compose,/profiles: \["bootstrap"\]/)
  assert.match(bootstrap,/\.well-known\/acme-challenge/)
  assert.match(deploy,/production-check\.mjs/)
  assert.match(deploy,/certbot certonly/)
  assert.ok(deploy.indexOf('production-check.mjs') < deploy.indexOf('certbot certonly'))
  assert.ok(deploy.indexOf('certbot certonly') < deploy.indexOf('$DC up -d --remove-orphans'))
})

test('Nuxt JWT secrets are supplied with runtime-safe NUXT names',()=>{
  const nuxt=read('nuxt.config.ts')
  const compose=read('docker-compose.production.yml')
  assert.doesNotMatch(nuxt,/dev-access-secret-change-me|dev-refresh-secret-change-me/)
  assert.match(compose,/NUXT_JWT_ACCESS_SECRET:/)
  assert.match(compose,/NUXT_JWT_REFRESH_SECRET:/)
  assert.match(compose,/PRODUCTION_DEPLOYMENT: "true"/)
})

test('production entrypoint validates environment before running migrations',()=>{
  const entrypoint=read('docker-entrypoint.sh')
  assert.ok(entrypoint.indexOf('production-check.mjs') < entrypoint.indexOf('migrate deploy'))
})

test('manager order edits use atomic ownership guard',()=>{
  const orders=read('server/services/order.service.js')
  assert.match(orders,/updateMany\(\{[\s\S]*?OR:\[\{assigned_manager_id:null\},\{assigned_manager_id:request\.user\.id\}\]/)
})

test('mail transport blocks file and URL content access',()=>{
  const mail=read('server/services/mail.service.js')
  assert.match(mail,/disableFileAccess: true/)
  assert.match(mail,/disableUrlAccess: true/)
})

test('portable VPS package has one-command install, SMTP preflight and full export helper',()=>{
  const install=read('install.sh')
  const deploy=read('scripts/deploy-vps.sh')
  const setup=read('scripts/setup-production.sh')
  const smtp=read('scripts/smtp-check.mjs')
  const backup=read('scripts/export-site.sh')
  const restore=read('scripts/restore-site.sh')
  assert.match(install,/scripts\/prepare-vps\.sh/)
  assert.match(install,/scripts\/setup-production\.sh/)
  assert.match(install,/scripts\/deploy-vps\.sh/)
  assert.match(setup,/openssl rand -hex 24/)
  assert.match(setup,/SMTP password/)
  assert.match(deploy,/smtp-check\.mjs/)
  assert.match(smtp,/transporter\.verify\(\)/)
  assert.match(backup,/pg_dump/)
  assert.match(backup,/horse_feed_shop_media/)
  assert.match(backup,/production\.env/)
  assert.match(restore,/pg_restore/)
  assert.match(restore,/media\.tar\.gz/)
  assert.match(restore,/RESTORE/)
})
