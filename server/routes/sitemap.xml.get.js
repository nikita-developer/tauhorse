import prisma from '../config/prisma'

const escapeXml = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&apos;')

export default defineEventHandler(async event => {
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600, s-maxage=3600')
  const base = String(useRuntimeConfig().public.appUrl || 'https://tauhorse.ru').replace(/\/$/, '')
  const products = await prisma.product.findMany({where: {is_deleted: false}, select: {id: true, created_at: true}, orderBy:{id:'asc'}})
  const staticUrls = [
    {path:'/', priority:'1.0', changefreq:'daily'},
    {path:'/about', priority:'0.6', changefreq:'monthly'},
    {path:'/faq', priority:'0.5', changefreq:'monthly'},
    {path:'/feeding-guide', priority:'0.5', changefreq:'monthly'},
    {path:'/contacts', priority:'0.5', changefreq:'monthly'},
    {path:'/legal/delivery', priority:'0.4', changefreq:'monthly'},
    {path:'/legal/terms', priority:'0.3', changefreq:'monthly'},
    {path:'/legal/returns', priority:'0.3', changefreq:'monthly'},
    {path:'/legal/privacy', priority:'0.2', changefreq:'monthly'},
    {path:'/legal/cookies', priority:'0.2', changefreq:'monthly'},
    {path:'/legal/requisites', priority:'0.3', changefreq:'monthly'}
  ]
  const productUrls = products.map(item => ({path:`/products/${item.id}`, priority:'0.8', changefreq:'weekly', lastmod:item.created_at?.toISOString?.()}))
  const nodes = [...staticUrls, ...productUrls].map(item => {
    const lastmod = item.lastmod ? `<lastmod>${escapeXml(item.lastmod)}</lastmod>` : ''
    return `<url><loc>${escapeXml(`${base}${item.path}`)}</loc>${lastmod}<changefreq>${item.changefreq}</changefreq><priority>${item.priority}</priority></url>`
  }).join('')
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${nodes}</urlset>`
})
