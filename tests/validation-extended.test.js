import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeEmail,
  parsePositiveInteger,
  parseNonNegativeInteger,
  parseFiniteNumber,
  requireTrimmedString,
  roundMoney
} from '../server/utils/validation.js'

test('email нормализуется и проверяется', () => {
  assert.equal(normalizeEmail('  User@Example.COM  '), 'user@example.com')
  assert.throws(() => normalizeEmail('not-an-email'), /Некорректный email/)
})

test('целочисленные валидаторы не принимают ноль, дроби и отрицательные значения', () => {
  assert.equal(parsePositiveInteger('12', 'id'), 12)
  assert.throws(() => parsePositiveInteger(0, 'id'), /больше 0/)
  assert.throws(() => parsePositiveInteger(1.5, 'id'), /больше 0/)
  assert.equal(parseNonNegativeInteger(0, 'stock'), 0)
  assert.throws(() => parseNonNegativeInteger(-1, 'stock'), />= 0/)
})

test('числа, строки и деньги валидируются предсказуемо', () => {
  assert.equal(parseFiniteNumber('12.5', 'price'), 12.5)
  assert.throws(() => parseFiniteNumber('abc', 'price'), /должен быть числом/)
  assert.equal(requireTrimmedString('  Конюшня  ', 'Имя'), 'Конюшня')
  assert.throws(() => requireTrimmedString('   ', 'Имя'), /обязателен/)
  assert.equal(roundMoney(0.1 + 0.2), 0.3)
  assert.equal(roundMoney(12.345), 12.35)
})
