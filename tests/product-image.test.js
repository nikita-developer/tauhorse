import test from 'node:test'
import assert from 'node:assert/strict'
import {getProductImage} from '../app/utils/product-image.js'

test('ProductMedia with image is the canonical product photo', () => {
  assert.equal(getProductImage({media: [
    {media_type: 'video', url: '/uploads/clip.mp4'},
    {media_type: 'image', url: '/uploads/horse.webp'}
  ], image_url: 'https://example.com/old.jpg'}), '/uploads/horse.webp')
})

test('legacy image_url works for older products', () => {
  assert.equal(getProductImage({media: [], image_url: '/legacy.jpg'}), '/legacy.jpg')
})

test('videos and blank links are not used as images', () => {
  assert.equal(getProductImage({media: [
    {media_type: 'video', url: '/video.mp4'},
    {media_type: 'image', url: '   '}
  ]}), '')
})

test('missing product has no thumbnail', () => {
  assert.equal(getProductImage(null), '')
})
