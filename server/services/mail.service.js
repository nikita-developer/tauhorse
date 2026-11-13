import nodemailer from 'nodemailer'
import {getOrderStatusLabel} from '../utils/order-status.js'
import {buildMarketingHtml} from '../utils/marketing-email.js'
import {getDeliveryMethodLabel} from '../utils/delivery.js'

const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;')

const formatMoney = value => {
  const numeric = Number(value)
  return Number.isFinite(numeric)
    ? new Intl.NumberFormat('ru-RU', {minimumFractionDigits: 0, maximumFractionDigits: 2}).format(numeric)
    : String(value ?? '0')
}


const getDeliveryText = order => {
  if (order.delivery_method === 'pickup') return 'Самовывоз — без доплаты'
  if (order.delivery_price_confirmed !== true) return `${getDeliveryMethodLabel(order.delivery_method)} — стоимость согласуем до оплаты`
  return `${getDeliveryMethodLabel(order.delivery_method)} — ${formatMoney(order.delivery_price)} ₽`
}

const getOrderTotalLabel = order => order.delivery_method !== 'pickup' && order.delivery_price_confirmed !== true ? 'Сумма товаров' : 'Итого'

const getAppUrl = () => String(process.env.NUXT_PUBLIC_APP_URL || useRuntimeConfig().public.appUrl || 'http://localhost:3000').replace(/\/$/, '')

const createTransporter = () => {
  const config = useRuntimeConfig()
  const host = process.env.SMTP_HOST || config.smtpHost
  const port_value = process.env.SMTP_PORT || config.smtpPort
  const user = process.env.SMTP_USER || config.smtpUser
  const pass = process.env.SMTP_PASS || config.smtpPass
  const secure_value = process.env.SMTP_SECURE ?? config.smtpSecure

  if (!host || !port_value || !user || !pass) {
    return null
  }

  const port = Number(port_value)
  const secure = String(secure_value) === 'true' || port === 465

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    },
    disableFileAccess: true,
    disableUrlAccess: true,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000
  })
}

const getFrom = () => {
  const config = useRuntimeConfig()
  return process.env.MAIL_FROM || config.mailFrom || process.env.SMTP_USER || config.smtpUser
}

const sendEmailVerificationEmail = async ({email, verification_link}) => {
  const transporter = createTransporter()
  if (!transporter) throw new Error('SMTP не настроен')

  const safe_link = escapeHtml(verification_link)
  await transporter.sendMail({
    from: getFrom(),
    to: email,
    subject: 'TauHorse — подтвердите email',
    text: `Подтвердите email для завершения регистрации. Ссылка действует 24 часа:\n${verification_link}\n\nЕсли вы не регистрировались, просто проигнорируйте письмо.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2f2418;max-width:620px;margin:0 auto;padding:24px">
        <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8a6a42">Безопасность аккаунта</div>
        <h2 style="margin:8px 0 16px">Подтвердите email</h2>
        <p>Нажмите кнопку ниже, чтобы завершить регистрацию. Ссылка действует 24 часа.</p>
        <p style="margin:24px 0"><a href="${safe_link}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#6f5230;color:#fff;text-decoration:none;font-weight:700">Подтвердить email</a></p>
        <p style="color:#756b60;font-size:14px">Если вы не создавали аккаунт, это письмо можно проигнорировать.</p>
      </div>
    `
  })

  return true
}

const sendPasswordResetEmail = async ({email, reset_link}) => {
  const transporter = createTransporter()

  if (!transporter) {
    if (process.env.NODE_ENV === 'production') {
      console.error('SMTP не настроен: письмо сброса пароля не отправлено')
    } else {
      console.warn('SMTP не настроен. Dev-ссылка для сброса пароля:', reset_link)
    }
    return false
  }

  const safe_link = escapeHtml(reset_link)
  await transporter.sendMail({
    from: getFrom(),
    to: email,
    subject: 'TauHorse — восстановление пароля',
    text: `Вы запросили восстановление пароля. Ссылка действует 15 минут:\n${reset_link}\n\nЕсли это были не вы, просто проигнорируйте письмо.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2f2418;max-width:620px;margin:0 auto;padding:24px">
        <h2 style="margin:0 0 16px">Восстановление пароля</h2>
        <p>Вы запросили восстановление пароля. Ссылка действует 15 минут.</p>
        <p style="margin:24px 0"><a href="${safe_link}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#6f5230;color:#fff;text-decoration:none;font-weight:700">Создать новый пароль</a></p>
        <p style="color:#756b60;font-size:14px">Если это были не вы, просто проигнорируйте письмо.</p>
      </div>
    `
  })

  return true
}

const buildOrderLines = order => (order.items || []).map(item => {
  const product_name = item.product?.name || `Товар #${item.product_id}`
  return `${product_name}: ${item.quantity} × ${formatMoney(item.price)} ₽`
})

const buildAdminOrderMessage = order => {
  const link = `${getAppUrl()}/admin/orders/${order.id}`
  const date = new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Moscow'
  }).format(new Date(order.created_at || Date.now()))
  const lines = buildOrderLines(order)
  const discount = Number(order.discount_amount || 0)
  const rows = [
    `Новый заказ №${order.id} — ${date} (МСК)`,
    `Покупатель: ${order.name}`,
    `Телефон: ${order.phone}`,
    `Email: ${order.email}`,
    `Получение: ${getDeliveryText(order)}`,
    `Адрес: ${order.address || 'Не указан'}`,
    ...(order.postal_code ? [`Почтовый индекс: ${order.postal_code}`] : []),
    ...(order.comment ? [`Комментарий: ${order.comment}`] : []),
    'Оплата: согласуется с покупателем',
    '',
    'Товары:',
    ...lines,
    `Стоимость товаров до скидки: ${formatMoney(order.subtotal)} ₽`,
    ...(discount > 0 ? [`Скидка: ${formatMoney(discount)} ₽ (${formatMoney(order.discount_percent)}%)`] : []),
    `${getOrderTotalLabel(order)}: ${formatMoney(order.total_price)} ₽`,
    '',
    `Открыть в админке: ${link}`
  ]
  const details = [
    ['Покупатель', order.name],
    ['Телефон', order.phone],
    ['Email', order.email],
    ['Получение', getDeliveryText(order)],
    ['Адрес', order.address || 'Не указан'],
    ...(order.postal_code ? [['Индекс', order.postal_code]] : []),
    ...(order.comment ? [['Комментарий', order.comment]] : []),
    ['Оплата', 'По согласованию']
  ]
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2f2418;max-width:620px;margin:0 auto;padding:24px">
      <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8a6a42">TauHorse · новый заказ</div>
      <h2 style="margin:8px 0 4px">Заказ №${order.id}</h2>
      <p style="margin:0 0 18px;color:#756b60">${escapeHtml(date)} (МСК)</p>
      <h3>Данные покупателя</h3>
      ${details.map(([name, value]) => `<p style="margin:5px 0"><strong>${escapeHtml(name)}:</strong> ${escapeHtml(value)}</p>`).join('')}
      <h3>Состав заказа</h3>
      <ul>${lines.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>
      <p>Товары до скидки: <strong>${formatMoney(order.subtotal)} ₽</strong></p>
      ${discount > 0 ? `<p>Скидка: <strong>${formatMoney(discount)} ₽ (${formatMoney(order.discount_percent)}%)</strong></p>` : ''}
      <p><strong>${escapeHtml(getOrderTotalLabel(order))}: ${formatMoney(order.total_price)} ₽</strong></p>
      ${order.delivery_method !== 'pickup' && order.delivery_price_confirmed !== true ? '<p style="color:#765e43">Стоимость доставки ещё не согласована и не включена в сумму.</p>' : ''}
      <p style="margin:24px 0"><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#6f5230;color:#fff;text-decoration:none;font-weight:700">Открыть заказ в админке</a></p>
    </div>`
  return {subject: `TauHorse — новый заказ №${order.id}`, text: rows.join('\n'), html}
}

const sendOrderCreatedEmails = async order => {
  const transporter = createTransporter()
  if (!transporter) {
    console.error(`SMTP не настроен: письма о заказе №${order.id} не отправлены`)
    return false
  }

  const config = useRuntimeConfig()
  const admin_email = String(process.env.ORDER_NOTIFICATION_EMAIL || config.orderNotificationEmail || '').trim()
  const lines = buildOrderLines(order)
  const order_link = `${getAppUrl()}/orders/${order.id}`
  const text = `TauHorse получил заказ №${order.id}. Он будет подтверждён после связи с вами.\n\n${lines.join('\n')}\n\nПолучение: ${getDeliveryText(order)}\n${getOrderTotalLabel(order)}: ${formatMoney(order.total_price)} ₽\nПолучатель: ${order.name}\nТелефон: ${order.phone}\nДанные доставки: ${order.address}\n\nСтатус заказа: ${order_link}`
  const html_lines = lines.map(line => `<li>${escapeHtml(line)}</li>`).join('')
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2f2418;max-width:620px;margin:0 auto;padding:24px">
      <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#8a6a42">TauHorse</div>
      <h2 style="margin:8px 0 16px">Заказ №${order.id} получен</h2>
      <p>Спасибо! Мы получили заказ. Мы свяжемся с вами, чтобы подтвердить наличие, способ получения, стоимость доставки и оплату.</p>
      <ul>${html_lines}</ul>
      <p><strong>Получение:</strong> ${escapeHtml(getDeliveryText(order))}<br><strong>${escapeHtml(getOrderTotalLabel(order))}:</strong> ${formatMoney(order.total_price)} ₽</p>
      ${order.delivery_method !== 'pickup' && order.delivery_price_confirmed !== true ? '<p style="padding:10px 12px;border-radius:10px;background:#f7f1e8;color:#6d5d4d;font-size:14px">Стоимость доставки пока не включена в сумму: мы согласуем тариф до оплаты.</p>' : ''}
      <p><strong>Получатель:</strong> ${escapeHtml(order.name)}<br><strong>Телефон:</strong> ${escapeHtml(order.phone)}<br><strong>Данные доставки:</strong> ${escapeHtml(order.address)}</p>
      <p style="margin:24px 0"><a href="${escapeHtml(order_link)}" style="color:#6f5230;font-weight:700">Открыть заказ</a></p>
    </div>`

  // Отдельные отправки: сбой письма покупателю не должен мешать администратору.
  // Повторная отправка при повторном POST не происходит благодаря idempotency_key заказа.
  const deliveries = [{to: order.email, subject: `TauHorse — заказ №${order.id} получен`, text, html}]
  if (admin_email) deliveries.push({to: admin_email, ...buildAdminOrderMessage(order)})
  else console.error('ORDER_NOTIFICATION_EMAIL не задан: администратор не получит письмо о новом заказе')

  const results = await Promise.allSettled(deliveries.map(message => transporter.sendMail({
    from: getFrom(),
    ...message
  })))
  for (const [index, result] of results.entries()) {
    if (result.status === 'rejected') {
      console.error(`Не удалось отправить письмо о заказе №${order.id} (${index === 0 ? 'покупателю' : 'администратору'}):`, result.reason)
    }
  }
  return results.every(result => result.status === 'fulfilled')
}

const sendOrderStatusEmail = async order => {
  const transporter = createTransporter()
  if (!transporter) return false

  const status_label = getOrderStatusLabel(order.status)
  const order_link = `${getAppUrl()}/orders/${order.id}`
  const subject = `TauHorse — заказ №${order.id}: ${status_label}`
  const text = `Статус заказа №${order.id} изменён: ${status_label}.\n\nОткрыть заказ: ${order_link}`
  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#2f2418;max-width:620px;margin:0 auto;padding:24px">
      <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#8a6a42">TauHorse · обновление заказа</div>
      <h2 style="margin:8px 0 16px">Заказ №${order.id}</h2>
      <p>Новый статус: <strong>${escapeHtml(status_label)}</strong>.</p>
      <p style="margin:24px 0"><a href="${escapeHtml(order_link)}" style="display:inline-block;padding:12px 18px;border-radius:10px;background:#6f5230;color:#fff;text-decoration:none;font-weight:700">Посмотреть заказ</a></p>
      <p style="color:#756b60;font-size:14px">Уведомления о статусах можно отключить в личном кабинете.</p>
    </div>`

  await transporter.sendMail({
    from: getFrom(),
    to: order.email,
    subject,
    text,
    html
  })
  return true
}

const sendMarketingEmail = async ({email, subject, body}) => {
  const transporter = createTransporter()
  if (!transporter) throw new Error('SMTP не настроен')
  const appUrl = getAppUrl()
  await transporter.sendMail({
    from:getFrom(), to:email, subject,
    text:`${subject}\n\n${body}\n\nТовары со скидкой: ${appUrl}/?on_sale=1#catalog\nУправление рекламными рассылками: ${appUrl}/account`,
    html:buildMarketingHtml({subject,body,appUrl})
  })
  return true
}

const verifyConfiguration = async () => {
  const transporter = createTransporter()
  if (!transporter) return false
  await transporter.verify()
  return true
}


export default {
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
  sendOrderCreatedEmails,
  sendOrderStatusEmail,
  sendMarketingEmail,
  verifyConfiguration
}
