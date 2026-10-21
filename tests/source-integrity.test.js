import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync,existsSync,readdirSync,statSync} from 'node:fs'
import {resolve,dirname,extname,relative} from 'node:path'
import {fileURLToPath} from 'node:url'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..')

const walk=(dir,ext='.js')=>readdirSync(dir).flatMap(name=>{
  const file=resolve(dir,name)
  return statSync(file).isDirectory()?walk(file,ext):(file.endsWith(ext)?[file]:[])
})

const assertRelativeImportsResolve=file=>{
  const source=readFileSync(file,'utf8')
  const imports=[...source.matchAll(/(?:from\s+|import\s*\()\s*['"](\.\.?\/[^'"]+)['"]/g)].map(m=>m[1])
  for(const rel of imports){
    const base=resolve(dirname(file),rel)
    const candidates=[base,`${base}.js`,`${base}.mjs`,`${base}.ts`,resolve(base,'index.js'),resolve(base,'index.mjs')]
    assert.ok(candidates.some(existsSync),`${relative(root,file)}: missing import ${rel}`)
  }
}

test('all server relative imports resolve',()=>{
  for(const file of walk(resolve(root,'server'))) assertRelativeImportsResolve(file)
})

test('admin product save payload contains promotion and catalog position fields',()=>{
  const source=readFileSync(resolve(root,'app/pages/admin/products.vue'),'utf8')
  for(const field of ['sale_percent','promo_label','sale_starts_at','sale_ends_at','is_featured','catalog_position']) assert.match(source,new RegExp(`${field}:`))
  assert.match(source,/localDatetimeToIso/)
})

test('product catalog position migration exists',()=>{
  const schema=readFileSync(resolve(root,'prisma/schema.prisma'),'utf8')
  const migration=readFileSync(resolve(root,'prisma/migrations/20260905170000_product_catalog_position/migration.sql'),'utf8')
  assert.match(schema,/catalog_position Int @default\(1000\)/)
  assert.match(migration,/ADD COLUMN "catalog_position"/)
})

test('local docker explicitly disables secure cookies and production enables them',()=>{
  const local=readFileSync(resolve(root,'docker-compose.yml'),'utf8')
  const prod=readFileSync(resolve(root,'docker-compose.production.yml'),'utf8')
  assert.match(local,/COOKIE_SECURE: \$\{COOKIE_SECURE:-false\}/)
  assert.match(prod,/COOKIE_SECURE: \$\{COOKIE_SECURE:-true\}/)
})

test('cart page refreshes current pricing and has explicit share-link UX',()=>{
  const source=readFileSync(resolve(root,'app/pages/cart.vue'),'utf8')
  assert.match(source,/cart_store\.fetchCart\(\)/)
  assert.match(source,/Копировать/)
  assert.match(source,/Поделиться через приложение/)
  assert.match(source,/По обычным ценам/)
})

test('product detail shows promotion badges, effective price and subtotal discount tiers',()=>{
  const source=readFileSync(resolve(root,'app/pages/products/[id].vue'),'utf8')
  assert.match(source,/product-page__badge--sale/)
  assert.match(source,/effective_price/)
  assert.match(source,/DiscountTiers/)
})

test('catalog filter UI does not use native details disclosure',()=>{
  const source=readFileSync(resolve(root,'app/components/catalog/CatalogFilters/CatalogFilters.vue'),'utf8')
  assert.doesNotMatch(source,/<details/)
  assert.match(source,/catalog-filters__collapse/)
})

test('catalog filters use a sticky desktop sidebar, fixed mobile sheet and client-side range validation',()=>{
  const scss=readFileSync(resolve(root,'app/components/catalog/CatalogFilters/catalog-filters.scss'),'utf8')
  const component=readFileSync(resolve(root,'app/components/catalog/CatalogFilters/useCatalogFilters.js'),'utf8')
  const home=readFileSync(resolve(root,'app/pages/index.vue'),'utf8')
  const filterView=readFileSync(resolve(root,'app/components/catalog/CatalogFilters/CatalogFilters.vue'),'utf8')
  assert.match(home,/catalog-sidebar\{position:sticky/)
  assert.match(scss,/catalog-filters__mobile-head/)
  assert.match(scss,/catalog-filters__collapse \{ position: fixed/)
  assert.match(scss,/height: 100dvh/)
  assert.match(filterView,/body\.style\.position = 'fixed'/)
  assert.match(filterView,/body\.style\.overflow = 'hidden'/)
  assert.match(filterView,/catalog-filters__order/)
  assert.match(filterView,/AppSelect/)
  assert.match(component,/if \(price_error\.value\) return/)
})

test('all site selects use the shared AppSelect component instead of native select UI',()=>{
  const appDir=resolve(root,'app')
  const vueFiles=walk(appDir,'.vue')
  for(const file of vueFiles){
    const source=readFileSync(file,'utf8')
    assert.doesNotMatch(source,/<select(?:\s|>)/,`${relative(root,file)} still contains native select`)
  }
  const shared=readFileSync(resolve(root,'app/components/ui/AppSelect.vue'),'utf8')
  assert.match(shared,/role="combobox"/)
  assert.match(shared,/role="listbox"/)
  assert.match(shared,/useId/)
  assert.doesNotMatch(shared,/Math\.random/)
})


test('storefront opens with the catalog and keeps categories inside the filter sidebar',()=>{
  const home=readFileSync(resolve(root,'app/pages/index.vue'),'utf8')
  const about=readFileSync(resolve(root,'app/pages/about.vue'),'utf8')
  const filters=readFileSync(resolve(root,'app/components/catalog/CatalogFilters/CatalogFilters.vue'),'utf8')
  assert.match(home,/Товары для лошадей/)
  assert.match(home,/catalog-sidebar/)
  assert.doesNotMatch(home,/home-hero/)
  assert.doesNotMatch(home,/catalog-category-card/)
  assert.match(filters,/:options="category_options"/)
  assert.doesNotMatch(filters,/class="catalog-filters__category"/)
  assert.match(home,/:categories="categories_store\.items"/)
  assert.doesNotMatch(home,/\/images\/voron\.webp/)
  assert.match(about,/\/images\/voron\.webp/)
  assert.match(filters,/toggleSortOrder/)
  assert.doesNotMatch(filters,/v-model="local_filters\.sort_order"[^>]*AppSelect/)
})

test('product detail keeps media contained, stacks earlier on narrow screens and moves documents below purchase',()=>{
  const source=readFileSync(resolve(root,'app/pages/products/[id].vue'),'utf8')
  assert.match(source,/object-fit:contain/)
  assert.match(source,/@media\(max-width:1120px\)\{\.product-page__top,\.product-page__skeleton\{grid-template-columns:1fr\}/)
  assert.match(source,/\.product-page__media\{aspect-ratio:4\/3/)
  assert.match(source,/product-page__buybox/)
  assert.match(source,/product-page__documents/)
  assert.match(source,/Производитель и идентификация/)
})

test('admin create and update return promotion-aware product data immediately',()=>{
  const source=readFileSync(resolve(root,'server/services/product.service.js'),'utf8')
  assert.match(source,/return withPromotionPricing\(product\)/)
  assert.match(source,/return withPromotionPricing\(updated\)/)
})

test('primary button hover does not use translateY motion',()=>{
  const main=readFileSync(resolve(root,'app/assets/styles/main.scss'),'utf8')
  const productCard=readFileSync(resolve(root,'app/components/catalog/ProductCard/product-card.scss'),'utf8')
  assert.doesNotMatch(main,/btn[^}]*hover[^}]*translateY/s)
  assert.doesNotMatch(productCard,/product-card__button[^}]*transition:[^;]*transform/s)
  for (const rel of ['app/pages/index.vue','app/pages/cart.vue','app/pages/products/[id].vue','app/pages/orders/index.vue','app/pages/account/orders.vue']) {
    const source=readFileSync(resolve(root,rel),'utf8')
    assert.doesNotMatch(source,/:deep\(\.btn\)\s*\{[^}]*transition:[^;]*transform/s,`${rel}: button transition must not move geometry`)
  }
})


test('team save feedback keeps button geometry stable for fast requests',()=>{
  const source=readFileSync(resolve(root,'app/pages/admin/team.vue'),'utf8')
  assert.match(source,/team-card__save/)
  assert.match(source,/savingVisible/)
  assert.match(source,/setTimeout\(\(\)=>\{if\(saving\.value===id\)/)
  assert.match(source,/\.team-card__save\{width:174px/)
  assert.match(source,/\.team-card__save:disabled\{opacity:1/)
  assert.doesNotMatch(source,/saving===user\.id\?'Сохраняем…':'Сохранить права'/)
})

test('customer order polling stops for terminal orders and uses a lower list frequency',()=>{
  const list=readFileSync(resolve(root,'app/pages/account/orders.vue'),'utf8')
  const detail=readFileSync(resolve(root,'app/pages/orders/[id].vue'),'utf8')
  assert.match(list,/account-orders-filter/)
  assert.match(list,/filteredOrders/)
  assert.match(list,/statusFilter/)
  assert.match(list,/terminalStatuses = new Set\(\['completed','cancelled'\]\)/)
  assert.match(list,/hasLiveOrders/)
  assert.match(list,/setInterval\([^\n]*30000/)
  assert.match(list,/visibilitychange/)
  assert.match(detail,/refreshOrderStatus/)
  assert.match(detail,/isTerminal/)
  assert.match(detail,/setInterval\([^\n]*15000/)
  assert.match(detail,/автообновление остановлено/)
})

test('primary hover keeps its painted background and animates filter instead of swapping fills',()=>{
  const main=readFileSync(resolve(root,'app/assets/styles/main.scss'),'utf8')
  const hover=main.match(/\.btn--primary:hover:not\(:disabled\)[\s\S]*?\{([\s\S]*?)\}/)?.[1] || ''
  assert.match(hover,/filter:\s*brightness/)
  assert.doesNotMatch(hover,/background\s*:/)
  assert.match(main,/transition:[^;]*filter/)
})

test('Russian legal pages and seller placeholders are wired into public site',()=>{
  const nuxt=readFileSync(resolve(root,'nuxt.config.ts'),'utf8')
  const env=readFileSync(resolve(root,'.env.production.example'),'utf8')
  const footer=readFileSync(resolve(root,'app/components/layout/TheFooter/TheFooter.vue'),'utf8')
  for (const page of ['terms','privacy','delivery','returns','requisites','cookies','personal-data-consent','marketing-consent']) {
    assert.ok(existsSync(resolve(root,`app/pages/legal/${page}.vue`)),`missing legal page: ${page}`)
  }
  for (const key of ['sellerInn','sellerOgrnip','sellerLegalAddress','claimsEmail']) assert.match(nuxt,new RegExp(key))
  for (const key of ['NUXT_PUBLIC_SELLER_INN','NUXT_PUBLIC_SELLER_OGRNIP','NUXT_PUBLIC_SELLER_LEGAL_ADDRESS','NUXT_PUBLIC_CLAIMS_EMAIL']) assert.match(env,new RegExp(key))
  assert.match(footer,/\/legal\/terms/)
  assert.match(footer,/\/legal\/privacy/)
  assert.match(footer,/\/legal\/requisites/)
})

test('product model is ready for conformity, marking classification and feed-additive registration data',()=>{
  const schema=readFileSync(resolve(root,'prisma/schema.prisma'),'utf8')
  const migration=readFileSync(resolve(root,'prisma/migrations/20260906090000_legal_compliance_fields/migration.sql'),'utf8')
  const admin=readFileSync(resolve(root,'app/pages/admin/products.vue'),'utf8')
  const publicPage=readFileSync(resolve(root,'app/pages/products/[id].vue'),'utf8')
  for (const field of ['manufacturer_name','storage_conditions','conformity_number','conformity_url','tnved_code','okpd2_code','feed_additive_registration_number','feed_additive_registry_url']) {
    assert.match(schema,new RegExp(field))
    assert.match(migration,new RegExp(field))
    assert.match(admin,new RegExp(field))
  }
  assert.match(publicPage,/Документы о соответствии/)
  assert.match(publicPage,/Государственная регистрация кормовой добавки/)
})

test('mobile catalog supports one or two columns and mobile admin has a sheet menu',()=>{
  const home=readFileSync(resolve(root,'app/pages/index.vue'),'utf8')
  const sidebar=readFileSync(resolve(root,'app/components/admin/AdminSidebar/AdminSidebar.vue'),'utf8')
  const sidebarScss=readFileSync(resolve(root,'app/components/admin/AdminSidebar/admin-sidebar.scss'),'utf8')
  const adminOrders=readFileSync(resolve(root,'app/pages/admin/orders.vue'),'utf8')
  assert.match(home,/tauhorse:catalog-view/)
  assert.match(home,/catalog-grid\.is-two/)
  assert.match(home,/catalog-grid\.is-one/)
  assert.match(sidebar,/admin-sidebar__toggle/)
  assert.match(sidebarScss,/bottom:0/)
  assert.match(sidebarScss,/max-height:min\(72dvh,620px\)/)
  assert.match(adminOrders,/quickFilterOptions/)
  assert.match(adminOrders,/admin-order-filters__period/)
})



test('catalog cards expose an inline media gallery and mobile filters stay reachable',()=>{
  const card=readFileSync(resolve(root,'app/components/catalog/ProductCard/ProductCard.vue'),'utf8')
  const cardLogic=readFileSync(resolve(root,'app/components/catalog/ProductCard/useProductCard.js'),'utf8')
  const filters=readFileSync(resolve(root,'app/components/catalog/CatalogFilters/CatalogFilters.vue'),'utf8')
  assert.match(card,/product-card__media-arrow/)
  assert.match(card,/handleTouchStart/)
  assert.match(cardLogic,/has_multiple_media/)
  assert.match(cardLogic,/nextMedia/)
  assert.match(filters,/catalog-filters__floating-trigger/)
  assert.match(filters,/show_floating_trigger/)
})

test('number fields use the shared AppNumberInput instead of native number spinners',()=>{
  const vueFiles=walk(resolve(root,'app'),'.vue')
  for(const file of vueFiles){
    const source=readFileSync(file,'utf8')
    assert.doesNotMatch(source,/type=["']number["']/,`${relative(root,file)} still contains native number input`)
  }
  const shared=readFileSync(resolve(root,'app/components/ui/AppNumberInput.vue'),'utf8')
  assert.match(shared,/app-number__button--minus/)
  assert.match(shared,/app-number__button--plus/)
  assert.match(shared,/inputmode/)
})

test('customer order history uses compact rows and select based filters',()=>{
  const source=readFileSync(resolve(root,'app/pages/account/orders.vue'),'utf8')
  assert.match(source,/account-orders-list/)
  assert.match(source,/account-order-row/)
  assert.match(source,/:options="statusFilters"/)
  assert.doesNotMatch(source,/account-order-card__media/)
})

test('public pages do not expose launch-time implementation notes or demo seller placeholders',()=>{
  const publicFiles=[
    'app/pages/contacts.vue',
    'app/pages/legal/requisites.vue',
    'app/pages/legal/terms.vue',
    'app/pages/legal/privacy.vue',
    'app/pages/legal/delivery.vue',
    'app/pages/legal/returns.vue',
    'app/pages/legal/cookies.vue',
    'app/pages/legal/personal-data-consent.vue',
    'app/pages/legal/marketing-consent.vue'
  ]
  for(const rel of publicFiles){
    const source=readFileSync(resolve(root,rel),'utf8')
    assert.doesNotMatch(source,/Перед запуском|Перед публикацией|укажите фактических|замените все демонстрационные/i,rel)
  }
  const nuxt=readFileSync(resolve(root,'nuxt.config.ts'),'utf8')
  assert.doesNotMatch(nuxt,/Укажите ФИО|Укажите ОГРНИП|Укажите ИНН|Укажите адрес/)
})

test('FAQ disclosure has smooth open and close animation',()=>{
  const component=readFileSync(resolve(root,'app/pages/faq.vue'),'utf8')
  const main=readFileSync(resolve(root,'app/assets/styles/main.scss'),'utf8')
  assert.match(component,/faq-item__answer/)
  assert.match(component,/aria-expanded/)
  assert.match(main,/\.faq-item__answer\s*\{[^}]*grid-template-rows:\s*0fr[^}]*transition:/s)
  assert.match(main,/\.faq-item\.is-open \.faq-item__answer\s*\{\s*grid-template-rows:\s*1fr;/)
})

test('TauHorse branding is consistent while the horse origin story stays on the About page',()=>{
  const home=readFileSync(resolve(root,'app/pages/index.vue'),'utf8')
  const about=readFileSync(resolve(root,'app/pages/about.vue'),'utf8')
  const header=readFileSync(resolve(root,'app/components/layout/TheHeader/TheHeader.vue'),'utf8')
  const footer=readFileSync(resolve(root,'app/components/layout/TheFooter/TheFooter.vue'),'utf8')
  const config=readFileSync(resolve(root,'nuxt.config.ts'),'utf8')
  const env=readFileSync(resolve(root,'.env.production.example'),'utf8')
  assert.match(home,/>Каталог</)
  assert.doesNotMatch(home,/Каталог «/)
  assert.doesNotMatch(home,/начальник по кормушке/)
  assert.match(about,/начальник по кормушке/)
  assert.match(about,/\/images\/voron\.webp/)
  assert.ok(existsSync(resolve(root,'public/images/voron.webp')))
  assert.ok(existsSync(resolve(root,'public/images/voron-720.webp')))
  assert.match(header,/tauhorse-logo\.webp/)
  assert.match(header,/TauHorse/)
  assert.match(footer,/tauhorse-logo\.webp/)
  assert.match(footer,/TauHorse/)
  assert.match(config,/shopName:\s*process\.env\.NUXT_PUBLIC_SHOP_NAME\s*\|\|\s*'TauHorse'/)
  assert.match(config,/brandName:\s*process\.env\.NUXT_PUBLIC_BRAND_NAME\s*\|\|\s*'TauHorse'/)
  assert.match(env,/DOMAIN=tauhorse\.ru/)
  assert.match(env,/NUXT_PUBLIC_APP_URL=https:\/\/tauhorse\.ru/)
})

test('runtime dependencies are pinned exactly and Docker uses npm ci',()=>{
  const pkg=JSON.parse(readFileSync(resolve(root,'package.json'),'utf8'))
  const lock=JSON.parse(readFileSync(resolve(root,'package-lock.json'),'utf8'))
  for(const group of ['dependencies','devDependencies']){
    for(const [name,version] of Object.entries(pkg[group]||{})){
      assert.match(version,/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/,`${name} must use an exact version`)
      assert.equal(lock.packages[''][group]?.[name],version,`${name} must match package-lock root`)
    }
  }
  const dockerfile=readFileSync(resolve(root,'Dockerfile'),'utf8')
  assert.match(dockerfile,/npm ci --legacy-peer-deps/)
  assert.doesNotMatch(dockerfile,/npm install(?:\s|$)/)
})

test('public source does not contain retired storefront branding or demo contacts',()=>{
  const roots=['app','server']
  for(const base of roots){
    for(const file of walk(resolve(root,base),'.vue').concat(walk(resolve(root,base),'.js'))){
      const source=readFileSync(file,'utf8')
      assert.doesNotMatch(source,/Конный рацион|Воронита|local@horse-shop\.test|\+7 \(999\) 000-00-00/i,relative(root,file))
    }
  }
})


test('catalog UX keeps discount first, pagination anchored and filter updates stable',()=>{
  const home=readFileSync(resolve(root,'app/pages/index.vue'),'utf8')
  const filters=readFileSync(resolve(root,'app/components/catalog/CatalogFilters/CatalogFilters.vue'),'utf8')
  assert.ok(home.indexOf('<DiscountTiers') < home.indexOf('<section id="catalog"'))
  assert.match(home,/catalog-pagination-slot\{margin-top:auto/)
  assert.match(home,/catalog-results__loading/)
  assert.doesNotMatch(home,/<TransitionGroup/)
  assert.match(filters,/catalog-filters__sheet-close/)
  assert.match(filters,/catalog-filters__hide-results/)
  assert.match(filters,/type="range"/)
})

test('catalog API returns slider bounds and uses deterministic product ordering',()=>{
  const service=readFileSync(resolve(root,'server/services/product.service.js'),'utf8')
  const endpoint=readFileSync(resolve(root,'server/api/products/index.get.js'),'utf8')
  assert.match(service,/prisma\.product\.aggregate\(\{where: base_where, _min: \{price: true\}, _max: \{price: true\}\}\)/)
  assert.match(service,/price_range:/)
  assert.match(service,/\{catalog_position: 'asc'\}, \{id: 'asc'\}/)
  assert.match(endpoint,/query\.in_stock === '1'/)
  assert.match(endpoint,/query\.on_sale === '1'/)
})

test('product gallery supports arrows, touch swipes and hidden-scrollbar thumbnails',()=>{
  const source=readFileSync(resolve(root,'app/pages/products/[id].vue'),'utf8')
  assert.match(source,/product-page__media-nav--prev/)
  assert.match(source,/product-page__media-nav--next/)
  assert.match(source,/@touchstart\.passive="handleMediaTouchStart"/)
  assert.match(source,/handleMediaTouchEnd/)
  assert.match(source,/scrollThumbs/)
  assert.match(source,/scrollbar-width:none/)
  assert.match(source,/::-webkit-scrollbar\{display:none/)
  assert.match(source,/:key="selected_media_key"/)
})

test('price slider remains operable when typed price is outside the available catalog bounds',()=>{
  const filters=readFileSync(resolve(root,'app/components/catalog/CatalogFilters/CatalogFilters.vue'),'utf8')
  const scss=readFileSync(resolve(root,'app/components/catalog/CatalogFilters/catalog-filters.scss'),'utf8')
  assert.match(filters,/price_min_on_top/)
  assert.match(filters,/price_max_on_top/)
  assert.match(filters,/:class="\{'is-top': price_max_on_top\}"/)
  assert.match(scss,/catalog-filters__range-input\.is-top/)
})

test('TauHorse production SEO exposes canonical Open Graph, sitemap and robots controls',()=>{
  const seo=readFileSync(resolve(root,'app/composables/useSiteSeo.js'),'utf8')
  const sitemap=readFileSync(resolve(root,'server/routes/sitemap.xml.get.js'),'utf8')
  const robots=readFileSync(resolve(root,'server/routes/robots.txt.get.js'),'utf8')
  const product=readFileSync(resolve(root,'app/pages/products/[id].vue'),'utf8')
  assert.match(seo,/rel:\s*'canonical'/)
  assert.match(seo,/ogImage/)
  assert.match(seo,/twitterCard:\s*'summary_large_image'/)
  assert.match(sitemap,/\/products\/\$\{item\.id\}/)
  assert.match(sitemap,/\/legal\/delivery/)
  assert.match(robots,/Disallow: \/admin/)
  assert.match(robots,/Sitemap:/)
  assert.match(product,/'@type': 'Product'/)
  assert.ok(existsSync(resolve(root,'public/brand/tauhorse-og.jpg')))
  assert.ok(existsSync(resolve(root,'public/brand/tauhorse-logo.webp')))
  assert.ok(existsSync(resolve(root,'public/brand/tauhorse-icon.png')))
})

test('production public seller data and domain are real TauHorse values',()=>{
  const config=readFileSync(resolve(root,'nuxt.config.ts'),'utf8')
  const env=readFileSync(resolve(root,'.env.production.example'),'utf8')
  for(const text of ['zoloto666@inbox.ru','+79013520534','321508100345153','507803101860','ИП Туманова Елена Владимировна','Юлия Котова']){
    assert.match(config,new RegExp(text.replace(/[+]/g,'\\+')))
    assert.match(env,new RegExp(text.replace(/[+]/g,'\\+')))
  }
  assert.match(env,/DOMAIN=tauhorse\.ru/)
  assert.match(env,/NUXT_PUBLIC_APP_URL=https:\/\/tauhorse\.ru/)
})

test('production SMTP can be deferred without weakening partial-config validation',()=>{
  const check=readFileSync(resolve(root,'scripts/production-check.mjs'),'utf8')
  const setup=readFileSync(resolve(root,'scripts/setup-production.sh'),'utf8')
  const requiredBlock=check.match(/const required = \[[\s\S]*?\n\]/)?.[0] || ''
  assert.doesNotMatch(requiredBlock,/SMTP_HOST/)
  assert.match(check,/SMTP настроен частично/)
  assert.match(setup,/Настроить SMTP прямо сейчас\? Можно сделать позже/)
})


test('catalog product card keeps animated gallery transitions',()=>{
  const source=readFileSync(resolve(process.cwd(),'app/components/catalog/ProductCard/ProductCard.vue'),'utf8')
  const styles=readFileSync(resolve(process.cwd(),'app/components/catalog/ProductCard/product-card.scss'),'utf8')
  assert.match(source,/media_transition_name/)
  assert.match(styles,/catalog-media-next-enter-from/)
  assert.match(styles,/catalog-media-prev-enter-from/)
})

test('discount editor uses whole percent and one-ruble steps',()=>{
  const source=readFileSync(resolve(process.cwd(),'app/pages/admin/discounts.vue'),'utf8')
  assert.doesNotMatch(source,/:step="100"/)
  assert.doesNotMatch(source,/:step="0\.01" suffix="%"/)
  assert.match(source,/:step="1" suffix="%"/)
})

test('admin order filters use compact reset and responsive wrap breakpoint',()=>{
  const source=readFileSync(resolve(process.cwd(),'app/pages/admin/orders.vue'),'utf8')
  assert.match(source,/title="Сбросить фильтры"/)
  assert.match(source,/@media\(max-width:1180px\)/)
})


test('discount APIs and shared number input enforce integer percent steps',()=>{
  const numberInput=readFileSync(resolve(process.cwd(),'app/components/ui/AppNumberInput.vue'),'utf8')
  const discountService=readFileSync(resolve(process.cwd(),'server/services/discount.service.js'),'utf8')
  const productService=readFileSync(resolve(process.cwd(),'server/services/product.service.js'),'utf8')
  assert.match(numberInput,/alignToStep/)
  assert.match(numberInput,/stepNumber\.value % 1 === 0/)
  assert.match(discountService,/Number\.isInteger\(percent\)/)
  assert.match(productService,/Number\.isInteger\(percent\)/)
})
