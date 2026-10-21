import prisma from '../config/prisma.js'
import {ApiError} from './api-error.js'
import {requireAuth} from './http.js'

import {staffPermissions,hasStaffPermission} from './permissions.js'

export const staff_permissions=staffPermissions
export const hasPermission=hasStaffPermission

export const requireStaff = async event => {
  const request = await requireAuth(event)
  const user = await prisma.user.findUnique({
    where: {id: request.user.id},
    select: {id:true,email:true,role:true,is_active:true,can_manage_orders:true,can_manage_catalog:true,can_manage_discounts:true,can_manage_campaigns:true}
  })
  if (!user || user.is_active === false) throw ApiError.forbidden('Доступ отключён')
  if (!['admin','manager'].includes(user.role)) throw ApiError.forbidden('Доступ запрещён')
  request.user = {...user, sid: request.user.sid}
  return request
}

export const requirePermission = async (event, permission) => {
  if (!staff_permissions.includes(permission)) throw new Error(`Unknown permission ${permission}`)
  const request = await requireStaff(event)
  if (!hasPermission(request.user, permission)) throw ApiError.forbidden('Недостаточно прав для этого раздела')
  return request
}
