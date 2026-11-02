import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read = name => readFileSync(new URL(`../${name}`, import.meta.url), 'utf8')

test('Prisma cart reads rows in stable creation order', () => {
  const source = read('server/services/cart.service.js')
  assert.match(source, /const cart_include\s*=\s*\{\s*items:\s*\{\s*orderBy:\s*\{id:\s*'asc'\}/)
})

test('cart quantity control fills available card width', () => {
  const source = read('app/components/cart/CartItemCard/cart-item-card.scss')
  assert.match(source, /\.cart-item-card__quantity--unified\s*\{[^}]*width:\s*100%/)
  assert.match(source, /\.cart-item-card__quantity--unified\s*\{[^}]*max-width:\s*none/)
  assert.match(source, /\.cart-item-card[^\{]*\.app-number\.is-compact\s*\{[^}]*grid-template-columns:/)
})

test('mobile filter uses compact vertical layout, advanced filters remain hidden', () => {
  const css = read('app/components/catalog/CatalogFilters/catalog-filters.scss')
  const vue = read('app/components/catalog/CatalogFilters/CatalogFilters.vue')
  const flags = read('app/utils/catalog-filters.js')
  assert.match(css, /\.catalog-filters__body\s*\{\s*display:\s*flex;\s*flex-direction:\s*column/)
  assert.match(vue, /'Поиск, категории и наличие'/)
  assert.match(flags, /SHOW_ADVANCED_CATALOG_FILTERS\s*=\s*false/)
})

test('detail gallery cover fills image area and video remains independently styled', () => {
  const source = read('app/pages/products/[id].vue')
  assert.match(source, /\.product-page__image\{position:absolute;inset:0;[^}]*object-fit:cover;/)
  assert.match(source, /\.product-page__video\{object-fit:contain;/)
})
