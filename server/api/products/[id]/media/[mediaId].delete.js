import prisma from '../../../../config/prisma.js'
import {sendJsonError} from '../../../../utils/http.js'
import {requirePermission} from '../../../../utils/access.js'
import {writeAuditLog,auditActions} from '../../../../utils/audit.js'
import {parsePositiveInteger} from '../../../../utils/validation.js'
import {deleteStoredMedia} from '../../../../utils/media-storage.js'
import {ApiError} from '../../../../utils/api-error.js'

export default defineEventHandler(async event => {
  try {
    const request = await requirePermission(event,'can_manage_catalog')
    const product_id = parsePositiveInteger(getRouterParam(event, 'id'), 'id товара')
    const id = parsePositiveInteger(getRouterParam(event, 'mediaId'), 'id медиа')
    const media = await prisma.productMedia.findFirst({where: {id, product_id}})
    if (!media) throw ApiError.notFound('Медиафайл не найден')
    await prisma.productMedia.delete({where: {id}})
    await deleteStoredMedia(media.storage_key)
    await writeAuditLog({request,action:auditActions.MEDIA_DELETE,entity_type:'product',entity_id:product_id,details:{media_id:id}})
    return {message: 'Медиафайл удалён'}
  } catch (error) { sendJsonError(error) }
})
