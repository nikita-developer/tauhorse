import test from 'node:test'
import assert from 'node:assert/strict'
import {slugify} from '../server/utils/slug.js'

test('slug сохраняет кириллицу, цифры и нормализует пробелы', () => {
  assert.equal(slugify('  Корм Для Лошадей №1!  '), 'корм-для-лошадей-1')
  assert.equal(slugify('a---b   c'), 'a-b-c')
  assert.equal(slugify('---Тест---'), 'тест')
})
