import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('cart and order APIs include product image media', () => {
  const cart = read('server/services/cart.service.js')
  const orders = read('server/services/order.service.js')
  assert.match(cart, /const cart_include = [\s\S]*?media:\s*\{where:\s*\{media_type:\s*'image'/)
  assert.match(orders, /const product_with_preview = [\s\S]*?media:\s*\{where:\s*\{media_type:\s*'image'/)
  assert.match(orders, /getAdminOrderById[\s\S]*?product:product_with_preview/)
})

test('cart, customer order and admin order share a cover thumbnail', () => {
  for (const path of [
    'app/components/cart/CartItemCard/CartItemCard.vue',
    'app/pages/admin/orders/[id].vue',
    'app/pages/orders/[id].vue'
  ]) {
    assert.match(read(path), /<ProductImage\s+:product="item.product"/)
  }
  assert.match(read('app/components/ui/ProductImage.vue'), /object-fit:\s*cover/)
})

test('temporary catalog controls are hidden without deleting their scripts', () => {
  const filters = read('app/components/catalog/CatalogFilters/CatalogFilters.vue')
  assert.match(filters, /v-if="show_advanced_filters" class="catalog-filters__section catalog-filters__price-section"/)
  assert.match(filters, /v-if="show_advanced_filters" class="catalog-filters__section"/)
  assert.doesNotMatch(filters, /Фильтры применяются автоматически/)
  assert.match(filters, /toggleSortOrder/)
  assert.match(filters, /updatePriceRange/)
})

test('catalog intro and redundant three-card info panel were removed', () => {
  const home = read('app/pages/index.vue')
  assert.doesNotMatch(home, /class="home-catalog__subtitle"/)
  assert.doesNotMatch(home, /class="home-trust"/)
  assert.match(home, /align-items:center;justify-content:space-between/)
})

test('mobile menu teleports outside sticky header and restores background scroll', () => {
  const header = read('app/components/layout/TheHeader/TheHeader.vue')
  const script = read('app/components/layout/TheHeader/useTheHeader.js')
  const style = read('app/components/layout/TheHeader/the-header.scss')
  assert.match(header, /<Teleport to="body">/)
  assert.match(script, /body.style.position = 'fixed'/)
  assert.match(script, /window.scrollTo\(0, locked_scroll_y\)/)
  assert.match(style, /overflow-x:\s*hidden/)
})
