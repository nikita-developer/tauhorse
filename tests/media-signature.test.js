import test from 'node:test'
import assert from 'node:assert/strict'
import {hasAllowedMediaSignature,mediaKind} from '../server/utils/media-storage.js'

const withPadding = bytes => Buffer.concat([Buffer.from(bytes), Buffer.alloc(24)])

test('accepts JPEG signature',()=>assert.equal(hasAllowedMediaSignature('image/jpeg',withPadding([0xff,0xd8,0xff])),true))
test('accepts PNG signature',()=>assert.equal(hasAllowedMediaSignature('image/png',withPadding([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a])),true))
test('accepts GIF signatures',()=>{
  assert.equal(hasAllowedMediaSignature('image/gif',Buffer.from('GIF87a payload')),true)
  assert.equal(hasAllowedMediaSignature('image/gif',Buffer.from('GIF89a payload')),true)
})
test('accepts WEBP RIFF signature',()=>assert.equal(hasAllowedMediaSignature('image/webp',Buffer.from('RIFFxxxxWEBPpayload')),true))
test('accepts MP4 ftyp signature',()=>assert.equal(hasAllowedMediaSignature('video/mp4',Buffer.from('xxxxftypisom')),true))
test('accepts WebM EBML signature',()=>assert.equal(hasAllowedMediaSignature('video/webm',withPadding([0x1a,0x45,0xdf,0xa3])),true))
test('rejects MIME spoofing and unknown types',()=>{
  assert.equal(hasAllowedMediaSignature('image/png',Buffer.from('<script>alert(1)</script>')),false)
  assert.equal(hasAllowedMediaSignature('image/jpeg',Buffer.from('GIF89a payload')),false)
  assert.equal(hasAllowedMediaSignature('application/octet-stream',Buffer.from('anything')),false)
})
test('media kind distinguishes video and image',()=>{
  assert.equal(mediaKind('video/mp4'),'video')
  assert.equal(mediaKind('image/webp'),'image')
})
