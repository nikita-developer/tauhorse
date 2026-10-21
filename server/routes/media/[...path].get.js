import prisma from '../../config/prisma.js'
import {readStoredMedia} from '../../utils/media-storage.js'
import {sendJsonError} from '../../utils/http.js'

export default defineEventHandler(async event => {
  try {
    const storage_key = getRouterParam(event, 'path')
    const media = await prisma.productMedia.findUnique({where: {storage_key}, select: {mime_type: true}})
    if (!media) throw createError({statusCode: 404, statusMessage: 'Файл не найден'})
    const data = await readStoredMedia(storage_key)
    setHeader(event, 'Content-Type', media.mime_type)
    setHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable')
    return data
  } catch (error) { sendJsonError(error) }
})
