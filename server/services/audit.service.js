import prisma from '../config/prisma.js'
import {ApiError} from '../utils/api-error.js'

const list=async({page=1,limit=50,actor_user_id,entity_type,action,search,date_from,date_to}={})=>{
  if(!Number.isSafeInteger(page)||page<1)throw ApiError.badRequest('Некорректная страница')
  if(!Number.isSafeInteger(limit)||limit<1||limit>100)throw ApiError.badRequest('Некорректный лимит')
  const where={}
  if(actor_user_id){const id=Number(actor_user_id);if(!Number.isInteger(id)||id<=0)throw ApiError.badRequest('Некорректный сотрудник');where.actor_user_id=id}
  if(entity_type)where.entity_type=String(entity_type).slice(0,60)
  if(action)where.action=String(action).slice(0,100)
  if(search){const q=String(search).trim();if(q)where.OR=[{entity_label:{contains:q,mode:'insensitive'}},{action:{contains:q,mode:'insensitive'}}]}
  if(date_from||date_to){where.created_at={};if(date_from){const d=new Date(date_from);if(Number.isNaN(d.getTime()))throw ApiError.badRequest('Некорректная дата');where.created_at.gte=d}if(date_to){const d=new Date(date_to);if(Number.isNaN(d.getTime()))throw ApiError.badRequest('Некорректная дата');d.setHours(23,59,59,999);where.created_at.lte=d}}
  const [items,total]=await prisma.$transaction([
    prisma.auditLog.findMany({where,include:{actor:{select:{id:true,email:true,role:true}}},orderBy:{created_at:'desc'},skip:(page-1)*limit,take:limit}),
    prisma.auditLog.count({where})
  ])
  return {items,meta:{page,limit,total,total_pages:Math.ceil(total/limit)}}
}
export default {list}
