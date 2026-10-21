import prisma from '../../../config/prisma.js'
import {requireAdmin, sendJsonError} from '../../../utils/http.js'
import {getRateLimitSecurityStats} from '../../../utils/rate-limit.js'
export default defineEventHandler(async event=>{try{await requireAdmin(event);const since=new Date(Date.now()-24*60*60*1000);const [registrations_24h,unverified,verified_24h]=await Promise.all([prisma.user.count({where:{created_at:{gte:since}}}),prisma.user.count({where:{email_verified_at:null}}),prisma.user.count({where:{email_verified_at:{gte:since}}})]);return{registrations_24h,verified_24h,unverified,...getRateLimitSecurityStats(),note:'Счётчик блокировок rate limit хранится в памяти и сбрасывается при перезапуске приложения.'}}catch(e){sendJsonError(e)}})
