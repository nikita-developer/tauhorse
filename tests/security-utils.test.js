import test from 'node:test'
import assert from 'node:assert/strict'
import {hashToken} from '../server/utils/hash.js'
import {generateGuestToken} from '../server/utils/guest.js'
import {generateOrderToken} from '../server/utils/order-token.js'
import {generatePasswordResetToken} from '../server/utils/password-reset.js'
import {generateEmailVerificationToken} from '../server/utils/email-verification.js'

test('SHA-256 токена детерминирован и не хранит исходный секрет', () => {
  const token = 'secret-token-value'
  const hash = hashToken(token)
  assert.equal(hash.length, 64)
  assert.notEqual(hash, token)
  assert.equal(hashToken(token), hash)
  assert.notEqual(hashToken(token + 'x'), hash)
})

test('security-токены имеют достаточную длину и уникальны', () => {
  for (const generate of [generateGuestToken, generateOrderToken, generatePasswordResetToken, generateEmailVerificationToken]) {
    const values = new Set(Array.from({length: 32}, () => generate()))
    assert.equal(values.size, 32)
    for (const value of values) assert.match(value, /^[a-f0-9]{64}$/)
  }
})
