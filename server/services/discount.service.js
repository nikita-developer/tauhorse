import prisma from '../config/prisma.js'
import {ApiError} from '../utils/api-error.js'
import {parseFiniteNumber, parsePositiveInteger, roundMoney} from '../utils/validation.js'

const normalizeRule = rule => ({...rule, min_subtotal:Number(rule.min_subtotal), percent:Math.round(Number(rule.percent))})
const listActive = async () => (await prisma.discountRule.findMany({where:{is_active:true}, orderBy:{min_subtotal:'asc'}})).map(normalizeRule)
const listAll = async () => (await prisma.discountRule.findMany({orderBy:{min_subtotal:'asc'}})).map(normalizeRule)
const validate = body => {
  const raw = parseFiniteNumber(body.min_subtotal, 'Минимальная сумма')
  const min_subtotal = roundMoney(raw)
  if (min_subtotal <= 0 || min_subtotal > 100000000) throw ApiError.badRequest('Минимальная сумма должна быть больше 0')
  const percent = Number(body.percent)
  if (!Number.isInteger(percent) || percent <= 0 || percent > 30) throw ApiError.badRequest('Скидка должна быть целым числом от 1 до 30%')
  return {min_subtotal, percent, is_active: body.is_active !== false}
}
const create = body => prisma.discountRule.create({data:validate(body)})
const update = (id, body) => prisma.discountRule.update({where:{id:parsePositiveInteger(id,'id')}, data:validate(body)})
const remove = id => prisma.discountRule.delete({where:{id:parsePositiveInteger(id,'id')}})
export default {listActive,listAll,create,update,remove}
