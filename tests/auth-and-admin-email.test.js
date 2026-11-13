import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

const makeJwtModule = () => {
  const calls = []
  const src = read('server/utils/jwt.js')
    .replace(/^import .*$/gm, '')
    .replaceAll('export const ', 'const ')
  const create = new Function('crypto', 'jwt', 'useRuntimeConfig', `${src}\nreturn {generateRefreshToken,getRefreshTokenLifetime}`)
  const module = create({randomUUID: () => 'test-uuid'}, {
    sign: (_payload, _secret, options) => {calls.push(options);return 'signed-token'}
  }, () => ({jwtAccessSecret:'x',jwtRefreshSecret:'secret',jwtRefreshExpiresIn:'7d',jwtCustomerRefreshExpiresIn:'30d'}))
  return {calls, ...module}
}

test('refresh JWT живёт 30 дней у покупателей и 7 дней у сотрудников', () => {
  const {calls, generateRefreshToken, getRefreshTokenLifetime} = makeJwtModule()
  assert.equal(getRefreshTokenLifetime('user'), '30d')
  assert.equal(getRefreshTokenLifetime('admin'), '7d')
  assert.equal(getRefreshTokenLifetime('manager'), '7d')
  generateRefreshToken({id:1,role:'user'})
  generateRefreshToken({id:2,role:'admin'})
  generateRefreshToken({id:3,role:'manager'})
  assert.deepEqual(calls.map(x=>x.expiresIn), ['30d', '7d', '7d'])
})

test('cookie получает точный срок из JWT вместо фиксированных 7 дней', () => {
  const src = read('server/utils/cookies.js').replaceAll('export const ', 'const ')
  const create = new Function('process', 'Buffer', `${src}\nreturn {refreshCookieOptionsForToken, refresh_cookie_options}`)
  const {refreshCookieOptionsForToken, refresh_cookie_options} = create({env:{COOKIE_SECURE:'true',NUXT_PUBLIC_APP_URL:'https://tauhorse.ru'}}, Buffer)
  const expiry = Math.floor(Date.now()/1000) + 30*86400
  const token = `a.${Buffer.from(JSON.stringify({exp: expiry})).toString('base64url')}.c`
  assert.equal(refreshCookieOptionsForToken(token).maxAge >= 30*86400-1,true)
  assert.equal(refreshCookieOptionsForToken(token).httpOnly,true)
  assert.equal(refreshCookieOptionsForToken(token).secure,true)
  assert.equal(refresh_cookie_options.maxAge,undefined)
})

test('письмо администратору содержит полные сведения и прямую ссылку', async () => {
  const sent = []
  const src = read('server/services/mail.service.js')
    .replace(/^import .*$/gm, '')
    .replace('export default {', 'return {')
  const create = new Function('nodemailer','getOrderStatusLabel','buildMarketingHtml','getDeliveryMethodLabel','useRuntimeConfig','process','console',src)
  const mail = create({createTransport:()=>({sendMail:async message=>{sent.push(message);return {messageId:'ok'}}})},
    x=>x, ()=>'', x=>x==='russian_post'?'Почта России':'Самовывоз',
    ()=>({smtpHost:'smtp.test',smtpPort:465,smtpUser:'user',smtpPass:'pass',smtpSecure:'true',mailFrom:'TauHorse <no-reply@tauhorse.ru>',orderNotificationEmail:'admin@example.test',public:{appUrl:'https://tauhorse.ru'}}),
    {env:{NUXT_PUBLIC_APP_URL:'https://tauhorse.ru',SMTP_HOST:'smtp.test',SMTP_PORT:'465',SMTP_USER:'user',SMTP_PASS:'pass',SMTP_SECURE:'true',MAIL_FROM:'TauHorse <no-reply@tauhorse.ru>',ORDER_NOTIFICATION_EMAIL:'admin@example.test'}},
    {error:()=>{}})
  const order={id:42,created_at:new Date('2026-11-13T12:00:00Z'),email:'customer@example.test',name:'Тестовый Покупатель',phone:'+79990000000',address:'Москва',postal_code:'123456',delivery_method:'russian_post',delivery_price_confirmed:false,total_price:8500,subtotal:10000,discount_amount:1500,discount_percent:15,items:[{product_id:3,product:{name:'Мюсли'},quantity:2,price:5000}]}
  assert.equal(await mail.sendOrderCreatedEmails(order),true)
  assert.equal(sent.length,2)
  const admin = sent.find(message=>message.to==='admin@example.test')
  assert.match(admin.subject,/новый заказ №42/)
  assert.match(admin.text,/Тестовый Покупатель/)
  assert.match(admin.text,/Мюсли: 2 × 5\s?000 ₽/)
  assert.match(admin.text,/Скидка:/)
  assert.match(admin.text,/Почта России/)
  assert.match(admin.text,/Оплата: согласуется/)
  assert.match(admin.text,/https:\/\/tauhorse\.ru\/admin\/orders\/42/)
  assert.match(admin.html,/Открыть заказ в админке/)
  const customer = sent.find(message=>message.to==='customer@example.test')
  assert.match(customer.text,/https:\/\/tauhorse\.ru\/orders\/42/)
  assert.doesNotMatch(customer.text,/\/admin\/orders/)
})

test('ошибка отправки покупателю не блокирует отправку администратору', async () => {
  const sent=[]
  const src=read('server/services/mail.service.js').replace(/^import .*$/gm,'').replace('export default {','return {')
  const create=new Function('nodemailer','getOrderStatusLabel','buildMarketingHtml','getDeliveryMethodLabel','useRuntimeConfig','process','console',src)
  const mail=create({createTransport:()=>({sendMail:async msg=>{sent.push(msg.to);if(msg.to==='buyer@test.ru')throw new Error('temporary');return {messageId:'ok'}}})},
    x=>x,()=>'',()=> 'Самовывоз',
    ()=>({smtpHost:'smtp.test',smtpPort:465,smtpUser:'user',smtpPass:'pass',smtpSecure:'true',mailFrom:'test',orderNotificationEmail:'admin@test.ru',public:{appUrl:'https://tauhorse.ru'}}),
    {env:{SMTP_HOST:'smtp.test',SMTP_PORT:'465',SMTP_USER:'user',SMTP_PASS:'pass',MAIL_FROM:'test',ORDER_NOTIFICATION_EMAIL:'admin@test.ru'}},
    {error:()=>{}})
  const ok=await mail.sendOrderCreatedEmails({id:5,email:'buyer@test.ru',name:'Покупатель',phone:'1',address:'Москва',items:[],delivery_method:'pickup',delivery_price_confirmed:true,subtotal:100,discount_amount:0,total_price:100})
  assert.equal(ok,false)
  assert.deepEqual(sent,['buyer@test.ru','admin@test.ru'])
})

test('логика создания заказа остаётся идемпотентной', () => {
  const source=read('server/services/order.service.js')
  assert.match(source,/if \(existing_order\) return idempotentOrderResult/)
  assert.match(source,/if \(raced_order\) return idempotentOrderResult/)
  assert.match(source,/sendOrderCreatedEmails\(created_order\)/)
})

test('интерфейс не содержит удалённых описаний и поддерживает узкие экраны', () => {
  const orders=read('app/pages/admin/orders.vue')
  const detail=read('app/pages/admin/orders/[id].vue')
  assert.doesNotMatch(orders,/Сразу видно, кто ведёт заказ/)
  assert.doesNotMatch(detail,/«Ответственный» показывает, кто ведёт заказ/)
  assert.match(orders,/@media\(max-width:760px\)/)
  assert.match(detail,/@media\(max-width:620px\)/)
})

test('несколько вкладок используют общий Web Lock для refresh, а 5xx не разлогинивает', () => {
  const src=read('app/stores/auth.js')
  assert.match(src,/navigator\.locks\.request\('tauhorse-auth-refresh'/)
  assert.match(src,/isDefinitiveAuthError\(refresh_error\)/)
  assert.match(src,/if \(isDefinitiveAuthError\(error\)\)/)
  for(const route of ['auth','staff','admin']) {
    assert.match(read(`app/middleware/${route}.js`),/statusCode:\s*503/)
  }
})

test('одновременные обновления в двух вкладках не используют устаревшую cookie', async () => {
  let cookieVersion = 0
  let next = Promise.resolve()
  const navigatorMock = {locks: {request: (_name, fn) => {
    const current = next.then(fn)
    next = current.catch(() => {})
    return current
  }}}
  const $fetch = async path => {
    assert.match(path,/auth\/refresh/)
    const presented = cookieVersion
    await new Promise(resolve=>setTimeout(resolve,10))
    if (presented !== cookieVersion) throw {statusCode: 401}
    cookieVersion += 1
    return {access_token: `access-${cookieVersion}`}
  }
  const source = read('app/stores/auth.js')
    .replace(/^import .*$/gm,'')
    .replaceAll('import.meta.server','false')
    .replaceAll('import.meta.client','true')
    .replace('export const useAuthStore =', 'const useAuthStore =')
  const init = new Function('defineStore','useRequestHeaders','createApiUrl','getApiErrorMessage','getAuthHeaders','isJwtExpiring','$fetch','navigator','console',`${source}\nreturn useAuthStore`)
  const options = init((_name, opts) => opts,()=>({}), x=>`/api${x}`,()=>'',()=>({}),()=>true,$fetch,navigatorMock,{warn:()=>{}})
  const makeStore = () => {
    const store = options.state()
    for (const [name, action] of Object.entries(options.actions)) store[name]=action.bind(store)
    return store
  }
  const tabOne = makeStore()
  const tabTwo = makeStore()
  await Promise.all([tabOne.refreshToken(),tabTwo.refreshToken()])
  assert.equal(cookieVersion,2)
  assert.match(tabOne.access_token,/access-/)
  assert.match(tabTwo.access_token,/access-/)
})

test('временная ошибка обновления токена не очищает пользователя', async () => {
  const source = read('app/stores/auth.js')
    .replace(/^import .*$/gm,'')
    .replaceAll('import.meta.server','false')
    .replaceAll('import.meta.client','true')
    .replace('export const useAuthStore =', 'const useAuthStore =')
  const init = new Function('defineStore','useRequestHeaders','createApiUrl','getApiErrorMessage','getAuthHeaders','isJwtExpiring','$fetch','navigator','console',`${source}\nreturn useAuthStore`)
  const options = init((_name, opts)=>opts,()=>({}), x=>`/api${x}`,()=>'',()=>({}),()=>true,async()=>{throw {statusCode:503}}, {locks:undefined}, {warn:()=>{}})
  const store = options.state()
  for(const [name,fn] of Object.entries(options.actions)) store[name]=fn.bind(store)
  store.user = {id:1,role:'user'}
  store.access_token='old-access'
  await assert.rejects(store.authFetch('/api/orders/my'), err=>err.statusCode===503)
  assert.equal(store.user.id,1)
  assert.equal(store.access_token,'old-access')
})
