import prisma from '../../../../config/prisma.js'
import {sendJsonError} from '../../../../utils/http.js'
import {requirePermission} from '../../../../utils/access.js'
import {writeAuditLog,auditActions} from '../../../../utils/audit.js'
import {parsePositiveInteger} from '../../../../utils/validation.js'
import {saveProductMedia, deleteStoredMedia} from '../../../../utils/media-storage.js'
import {ApiError} from '../../../../utils/api-error.js'

export default defineEventHandler(async event => {
  let saved = []
  try {
    const request = await requirePermission(event,'can_manage_catalog')
    const product_id = parsePositiveInteger(getRouterParam(event, 'id'), 'id товара')
    const product = await prisma.product.findFirst({where: {id: product_id, is_deleted: false}})
    if (!product) throw ApiError.notFound('Товар не найден')
    const parts = (await readMultipartFormData(event)) || []
    const files = parts.filter(p => p.name === 'files' && p.filename)
    if (!files.length) throw ApiError.badRequest('Выберите хотя бы один файл')
    if (files.length > 8) throw ApiError.badRequest('За один раз можно загрузить не более 8 файлов')
    const max_request_bytes = Number(process.env.MEDIA_MAX_REQUEST_BYTES || 60 * 1024 * 1024)
    const total_bytes = files.reduce((sum, file) => sum + Number(file.data?.length || 0), 0)
    if (!Number.isFinite(max_request_bytes) || max_request_bytes <= 0) throw new Error('MEDIA_MAX_REQUEST_BYTES настроен некорректно')
    if (total_bytes > max_request_bytes) throw ApiError.badRequest(`Суммарный размер файлов превышает ${Math.floor(max_request_bytes / 1024 / 1024)} МБ`)
    const current = await prisma.productMedia.count({where: {product_id}})
    if (current + files.length > 12) throw ApiError.badRequest('У товара может быть не более 12 медиафайлов')
    for (let i = 0; i < files.length; i++) saved.push(await saveProductMedia(product_id, files[i]))
    const created = await prisma.$transaction(saved.map((m, i) => prisma.productMedia.create({data: {product_id, url: m.url, storage_key: m.storageKey, media_type: m.media_type, mime_type: m.mime_type, size_bytes: m.size_bytes, sort_order: current + i}})))
    await writeAuditLog({request,action:auditActions.MEDIA_ADD,entity_type:'product',entity_id:product_id,entity_label:product.name,details:{count:created.length}})
    return {items: created}
  } catch (error) {
    await Promise.all(saved.map(m => deleteStoredMedia(m.storageKey).catch(() => {})))
    sendJsonError(error)
  }
})
