import {computed, toValue} from 'vue'

const DEFAULT_TITLE = 'TauHorse — корма и лизунцы для лошадей'
const DEFAULT_DESCRIPTION = 'TauHorse — корма и лизунцы для лошадей с доставкой по Москве и Московской области, самовывозом и отправкой по России.'
const DEFAULT_IMAGE = '/brand/tauhorse-og.jpg'

const absoluteUrl = (base, value) => {
  const text = String(value || '').trim()
  if (!text) return ''
  if (/^https?:\/\//i.test(text)) return text
  try { return new URL(text, `${base}/`).toString() } catch { return text }
}

export const useSiteSeo = ({title, description, image, type = 'website', noindex = false} = {}) => {
  const route = useRoute()
  const config = useRuntimeConfig().public
  const base = String(config.appUrl || 'https://tauhorse.ru').replace(/\/$/, '')
  const canonical = computed(() => `${base}${route.path === '/' ? '' : route.path}`)
  const resolvedTitle = computed(() => String(toValue(title) || DEFAULT_TITLE))
  const resolvedDescription = computed(() => String(toValue(description) || DEFAULT_DESCRIPTION))
  const resolvedImage = computed(() => absoluteUrl(base, toValue(image) || DEFAULT_IMAGE))
  const resolvedType = computed(() => String(toValue(type) || 'website'))
  const robots = noindex ? 'noindex, nofollow, noarchive' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'

  useSeoMeta({
    title: resolvedTitle,
    description: resolvedDescription,
    robots,
    ogSiteName: config.shopName || 'TauHorse',
    ogLocale: 'ru_RU',
    ogType: resolvedType,
    ogTitle: resolvedTitle,
    ogDescription: resolvedDescription,
    ogUrl: canonical,
    ogImage: resolvedImage,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageAlt: computed(() => `${config.shopName || 'TauHorse'} — корма и лизунцы для лошадей`),
    twitterCard: 'summary_large_image',
    twitterTitle: resolvedTitle,
    twitterDescription: resolvedDescription,
    twitterImage: resolvedImage
  })

  useHead({
    link: [{rel: 'canonical', href: canonical}]
  })

  return {canonical, image: resolvedImage}
}
