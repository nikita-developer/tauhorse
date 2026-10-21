import prisma from '../config/prisma.js'
import {ApiError} from '../utils/api-error.js'
import {requireTrimmedString, parsePositiveInteger} from '../utils/validation.js'
import mailService from './mail.service.js'

const list = () => prisma.marketingCampaign.findMany({orderBy:{created_at:'desc'},take:100})
const create = payload => prisma.marketingCampaign.create({data:{subject:requireTrimmedString(payload.subject,'Тема',{max_length:160}),body:requireTrimmedString(payload.body,'Текст',{max_length:10000})}})

const send = async idValue => {
  const id=parsePositiveInteger(idValue,'id рассылки')
  const claimed=await prisma.marketingCampaign.updateMany({where:{id,status:'draft'},data:{status:'sending'}})
  if(claimed.count!==1){
    const current=await prisma.marketingCampaign.findUnique({where:{id},select:{status:true}})
    if(!current) throw ApiError.notFound('Рассылка не найдена')
    if(current.status==='sent') throw ApiError.badRequest('Рассылка уже отправлена')
    if(current.status==='sending') throw ApiError.badRequest('Рассылка уже отправляется')
    throw ApiError.badRequest('Рассылка недоступна для отправки')
  }

  const campaign=await prisma.marketingCampaign.findUnique({where:{id}})
  let sent=0, failed=0, cursor=null
  try {
    while(true){
      const users=await prisma.user.findMany({
        where:{marketing_emails_enabled:true,email_verified_at:{not:null},is_active:true},
        select:{id:true,email:true},
        orderBy:{id:'asc'},
        take:500,
        ...(cursor?{cursor:{id:cursor},skip:1}:{})
      })
      if(!users.length) break
      for(let i=0;i<users.length;i+=20){
        const batch=await Promise.allSettled(users.slice(i,i+20).map(user=>mailService.sendMarketingEmail({email:user.email,subject:campaign.subject,body:campaign.body})))
        sent+=batch.filter(x=>x.status==='fulfilled').length
        failed+=batch.filter(x=>x.status==='rejected').length
      }
      cursor=users.at(-1).id
      if(users.length<500) break
    }
    return await prisma.marketingCampaign.update({where:{id},data:{status:'sent',sent_count:sent,failed_count:failed,sent_at:new Date()}})
  } catch(error) {
    // A crash after some SMTP deliveries must not make an automatic retry duplicate messages.
    await prisma.marketingCampaign.updateMany({where:{id,status:'sending'},data:{status:'failed',sent_count:sent,failed_count:failed}}).catch(()=>{})
    throw error
  }
}
export default {list,create,send}
