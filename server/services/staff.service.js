import prisma from '../config/prisma.js'
import {ApiError} from '../utils/api-error.js'
import {normalizeEmail, parsePositiveInteger} from '../utils/validation.js'
import {writeAuditLog, auditActions} from '../utils/audit.js'

const publicFields={id:true,email:true,role:true,is_active:true,created_at:true,email_verified_at:true,can_manage_orders:true,can_manage_catalog:true,can_manage_discounts:true,can_manage_campaigns:true}

const parseStatsDate=(value,name)=>{
  if(!value)return null
  const date=new Date(value)
  if(Number.isNaN(date.getTime()))throw ApiError.badRequest(`Некорректный ${name}`)
  return date
}

const listUsers=async({search='',page=1,limit=50,stats_from,stats_to}={})=>{
  if(!Number.isSafeInteger(page)||page<1) throw ApiError.badRequest('Некорректная страница')
  if(!Number.isSafeInteger(limit)||limit<1||limit>100) throw ApiError.badRequest('Некорректный лимит')
  const q=typeof search==='string'?search.trim():''
  const where=q?{email:{contains:q,mode:'insensitive'}}:{}
  const periodFrom=parseStatsDate(stats_from,'начало периода')
  const periodTo=parseStatsDate(stats_to,'конец периода')
  if(periodFrom&&periodTo&&periodFrom>=periodTo)throw ApiError.badRequest('Начало периода должно быть раньше конца')
  const [items,total]=await prisma.$transaction([
    prisma.user.findMany({where,select:publicFields,orderBy:[{role:'asc'},{created_at:'desc'}],skip:(page-1)*limit,take:limit}),
    prisma.user.count({where})
  ])
  const enriched=await Promise.all(items.map(async u=>{
    if(u.role!=='manager') return {...u,success_orders_period:0,success_orders_all:0,active_orders:0}
    const periodWhere={credited_manager_id:u.id,status:'completed',...(periodFrom||periodTo?{completed_at:{...(periodFrom?{gte:periodFrom}:{}),...(periodTo?{lt:periodTo}:{})}}:{})}
    const [successPeriod,successAll,active]=await Promise.all([
      prisma.order.count({where:periodWhere}),
      prisma.order.count({where:{credited_manager_id:u.id,status:'completed'}}),
      prisma.order.count({where:{assigned_manager_id:u.id,status:{notIn:['completed','cancelled']}}})
    ])
    return {...u,success_orders_period:successPeriod,success_orders_all:successAll,active_orders:active}
  }))
  return {items:enriched,meta:{page,limit,total,total_pages:Math.ceil(total/limit),stats_from:periodFrom?.toISOString()||null,stats_to:periodTo?.toISOString()||null}}
}

const listManagers=()=>prisma.user.findMany({where:{role:'manager',is_active:true,can_manage_orders:true},select:{id:true,email:true,role:true,is_active:true},orderBy:{email:'asc'}})

const updateUser=async(request,idValue,changes={})=>{
  const id=parsePositiveInteger(idValue,'id пользователя')
  const allowed=new Set(['role','is_active','can_manage_orders','can_manage_catalog','can_manage_discounts','can_manage_campaigns'])
  const unknown=Object.keys(changes||{}).filter(k=>!allowed.has(k)); if(unknown.length) throw ApiError.badRequest('Недопустимые поля')

  let result
  for(let attempt=0;attempt<2;attempt+=1){
    try{
      result=await prisma.$transaction(async tx=>{
        const target=await tx.user.findUnique({where:{id},select:publicFields})
        if(!target) throw ApiError.notFound('Пользователь не найден')
        const data={}
        if(Object.prototype.hasOwnProperty.call(changes,'role')){
          if(!['user','manager','admin'].includes(changes.role)) throw ApiError.badRequest('Некорректная роль')
          data.role=changes.role
        }
        if(Object.prototype.hasOwnProperty.call(changes,'is_active')){if(typeof changes.is_active!=='boolean')throw ApiError.badRequest('is_active должен быть boolean');data.is_active=changes.is_active}
        for(const key of ['can_manage_orders','can_manage_catalog','can_manage_discounts','can_manage_campaigns']) if(Object.prototype.hasOwnProperty.call(changes,key)){if(typeof changes[key]!=='boolean')throw ApiError.badRequest(`${key} должен быть boolean`);data[key]=changes[key]}
        const nextRole=data.role??target.role; const nextActive=data.is_active??target.is_active
        if(target.role==='admin' && (nextRole!=='admin'||!nextActive)){
          const admins=await tx.user.count({where:{role:'admin',is_active:true}})
          if(admins<=1) throw ApiError.badRequest('Нельзя отключить или понизить последнего активного администратора')
        }
        if(nextRole==='user') Object.assign(data,{can_manage_orders:false,can_manage_catalog:false,can_manage_discounts:false,can_manage_campaigns:false})
        if(target.role==='user'&&nextRole==='manager'){
          if(!Object.prototype.hasOwnProperty.call(changes,'can_manage_orders')) data.can_manage_orders=true
        }
        const updated=await tx.user.update({where:{id},data,select:publicFields})
        if(updated.is_active===false) await tx.refreshToken.deleteMany({where:{user_id:id}})
        return {target,updated}
      },{isolationLevel:'Serializable'})
      break
    }catch(error){
      if(error?.code==='P2034'&&attempt===0) continue
      throw error
    }
  }
  if(!result) throw new Error('Не удалось обновить пользователя после конкурентного изменения')
  await writeAuditLog({request,action:auditActions.STAFF_UPDATE,entity_type:'user',entity_id:id,entity_label:result.updated.email,details:{before:result.target,after:result.updated}})
  return result.updated
}

export default {listUsers,listManagers,updateUser}
