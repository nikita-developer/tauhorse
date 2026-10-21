import test from 'node:test'
import assert from 'node:assert/strict'
import {catalogFiltersFromQuery,catalogFiltersToQuery,defaultCatalogFilters,getCatalogPriceRangeError,normalizeCatalogPriceRange} from '../app/utils/catalog-filters.js'

test('catalog filters round-trip through URL query',()=>{
  const filters={...defaultCatalogFilters(),search:'мюсли',min_price:'500',max_price:'5000',in_stock:true,on_sale:true,category_id:'7',sort_by:'price',sort_order:'desc'}
  assert.deepEqual(catalogFiltersFromQuery(catalogFiltersToQuery(filters)),filters)
})

test('catalog query ignores invalid sorting and parses booleans',()=>{
  const result=catalogFiltersFromQuery({sort_by:'hack',sort_order:'sideways',in_stock:'1',on_sale:'true'})
  assert.equal(result.sort_by,'catalog_position')
  assert.equal(result.sort_order,'asc')
  assert.equal(result.in_stock,true)
  assert.equal(result.on_sale,true)
})

test('default filters produce clean URL query',()=>assert.deepEqual(catalogFiltersToQuery(defaultCatalogFilters()),{}))

test('invalid price range is detected before request',()=>{
  assert.match(getCatalogPriceRangeError({min_price:'2000',max_price:'1000'}),/Максимальная цена/)
  assert.equal(getCatalogPriceRangeError({min_price:'1000',max_price:'2000'}),'')
})

test('invalid price range from URL is normalized instead of causing API 400',()=>{
  const result=catalogFiltersFromQuery({min_price:'2000',max_price:'1000'})
  assert.equal(result.min_price,'1000')
  assert.equal(result.max_price,'2000')
  assert.deepEqual(normalizeCatalogPriceRange({min_price:'9',max_price:'2'}),{min_price:'2',max_price:'9'})
})
