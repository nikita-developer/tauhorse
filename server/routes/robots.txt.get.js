export default defineEventHandler(event => {
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  const base = String(useRuntimeConfig().public.appUrl || 'https://tauhorse.ru').replace(/\/$/, '')
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /account',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /orders',
    'Disallow: /shared-cart',
    'Disallow: /login',
    'Disallow: /register',
    'Disallow: /forgot-password',
    'Disallow: /reset-password',
    'Disallow: /verify-email',
    `Sitemap: ${base}/sitemap.xml`,
    `Host: ${base.replace(/^https?:\/\//, '')}`,
    ''
  ].join('\n')
})
