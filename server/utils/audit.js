import prisma from '../config/prisma.js'

export const auditActions = {
  PRODUCT_CREATE:'product.create', PRODUCT_UPDATE:'product.update', PRODUCT_DELETE:'product.delete', MEDIA_ADD:'product.media_add', MEDIA_DELETE:'product.media_delete',
  CATEGORY_CREATE:'category.create', CATEGORY_UPDATE:'category.update', CATEGORY_DELETE:'category.delete',
  DISCOUNT_CREATE:'discount.create', DISCOUNT_UPDATE:'discount.update', DISCOUNT_DELETE:'discount.delete',
  CAMPAIGN_CREATE:'campaign.create', CAMPAIGN_SEND:'campaign.send',
  ORDER_ASSIGN:'order.assign', ORDER_STATUS:'order.status', ORDER_UPDATE:'order.update', ORDER_CUSTOMER_CANCEL:'order.customer_cancel',
  STAFF_UPDATE:'staff.update'
}

export const writeAuditLog = async ({request, action, entity_type, entity_id=null, entity_label=null, details=null, actor_user_id}) => {
  try {
    return await prisma.auditLog.create({data:{
      actor_user_id: actor_user_id ?? request?.user?.id ?? null,
      action, entity_type, entity_id: entity_id ? Number(entity_id) : null,
      entity_label: entity_label ? String(entity_label).slice(0,240) : null,
      details: details == null ? undefined : JSON.parse(JSON.stringify(details)),
      ip_address: request?.ip || null
    }})
  } catch (error) {
    console.error('Audit log write failed', error)
    return null
  }
}
