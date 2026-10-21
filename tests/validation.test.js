import test from 'node:test'
import assert from 'node:assert/strict'
import {validatePassword} from '../server/utils/validation.js'

test('password requires at least 12 characters', () => {
  assert.throws(() => validatePassword('govno1994'), /12/)
})

test('password requires a letter and a digit', () => {
  assert.throws(() => validatePassword('abcdefghijkl'), /букву и одну цифру/)
  assert.throws(() => validatePassword('123456789012'), /букву и одну цифру/)
})

test('reasonable long password passes', () => {
  assert.equal(validatePassword('konvita-horse-1994'), 'konvita-horse-1994')
})
