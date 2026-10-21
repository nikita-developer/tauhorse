import {mkdir, writeFile, unlink, readFile} from 'node:fs/promises'
import {join, resolve, extname} from 'node:path'
import {randomUUID} from 'node:crypto'
import {ApiError} from './api-error.js'

const ROOT = resolve(process.env.MEDIA_ROOT || '/app/uploads')
const MAX_SIZE = Number(process.env.MEDIA_MAX_BYTES || 25 * 1024 * 1024)
const allowed = new Map([
  ['image/jpeg', '.jpg'], ['image/png', '.png'], ['image/webp', '.webp'], ['image/gif', '.gif'],
  ['video/mp4', '.mp4'], ['video/webm', '.webm']
])

const startsWithBytes = (buffer, bytes, offset = 0) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < offset + bytes.length) return false
  return bytes.every((byte, index) => buffer[offset + index] === byte)
}

const asciiAt = (buffer, value, offset = 0) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < offset + value.length) return false
  return buffer.subarray(offset, offset + value.length).toString('ascii') === value
}

export const hasAllowedMediaSignature = (mime, data) => {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data || [])
  switch (mime) {
    case 'image/jpeg': return startsWithBytes(buffer, [0xff, 0xd8, 0xff])
    case 'image/png': return startsWithBytes(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    case 'image/gif': return asciiAt(buffer, 'GIF87a') || asciiAt(buffer, 'GIF89a')
    case 'image/webp': return asciiAt(buffer, 'RIFF') && asciiAt(buffer, 'WEBP', 8)
    case 'video/mp4': return asciiAt(buffer, 'ftyp', 4)
    case 'video/webm': return startsWithBytes(buffer, [0x1a, 0x45, 0xdf, 0xa3])
    default: return false
  }
}

export const mediaKind = mime => mime?.startsWith('video/') ? 'video' : 'image'
export const saveProductMedia = async (productId, part) => {
  if (!part?.data?.length || !part.type || !allowed.has(part.type)) throw ApiError.badRequest('Разрешены JPG, PNG, WEBP, GIF, MP4 и WEBM')
  if (!hasAllowedMediaSignature(part.type, part.data)) throw ApiError.badRequest('Содержимое файла не соответствует заявленному типу')
  if (part.data.length > MAX_SIZE) throw ApiError.badRequest(`Файл слишком большой. Максимум ${Math.floor(MAX_SIZE / 1024 / 1024)} МБ`)
  const dir = join(ROOT, 'products', String(productId))
  await mkdir(dir, {recursive: true})
  const extension = allowed.get(part.type) || extname(part.filename || '')
  const name = `${randomUUID()}${extension}`
  const storageKey = `products/${productId}/${name}`
  await writeFile(join(dir, name), part.data, {flag: 'wx'})
  return {storageKey, url: `/media/${storageKey}`, media_type: mediaKind(part.type), mime_type: part.type, size_bytes: part.data.length}
}

export const deleteStoredMedia = async storageKey => {
  if (!storageKey || storageKey.includes('..')) return
  const target = resolve(ROOT, storageKey)
  if (!target.startsWith(ROOT + '/')) return
  try { await unlink(target) } catch (e) { if (e?.code !== 'ENOENT') throw e }
}

export const readStoredMedia = async storageKey => {
  if (!storageKey || storageKey.includes('..')) throw ApiError.notFound('Файл не найден')
  const target = resolve(ROOT, storageKey)
  if (!target.startsWith(ROOT + '/')) throw ApiError.notFound('Файл не найден')
  try { return await readFile(target) } catch { throw ApiError.notFound('Файл не найден') }
}
