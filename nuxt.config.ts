import {defineNuxtConfig} from 'nuxt/config'

const isProduction = process.env.NODE_ENV === 'production'

const securityHeaders = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '0',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Content-Security-Policy': "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; frame-src 'none'; img-src 'self' https: data:; media-src 'self' https:; font-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; connect-src 'self'; form-action 'self'; worker-src 'self' blob:; manifest-src 'self'"
}

const noStoreHeaders = {'Cache-Control': 'no-store'}

export default defineNuxtConfig({
    compatibilityDate: '2025-01-01',
    devtools: {enabled: !isProduction},
    modules: ['@pinia/nuxt'],
    css: ['@/assets/styles/main.scss'],
    runtimeConfig: {
        jwtAccessSecret: '',
        jwtRefreshSecret: '',
        jwtAccessExpiresIn: '15m',
        jwtRefreshExpiresIn: '7d',
        smtpHost: process.env.SMTP_HOST || '',
        smtpPort: process.env.SMTP_PORT || '',
        smtpSecure: process.env.SMTP_SECURE || 'false',
        smtpUser: process.env.SMTP_USER || '',
        smtpPass: process.env.SMTP_PASS || '',
        mailFrom: process.env.MAIL_FROM || '',
        orderNotificationEmail: process.env.ORDER_NOTIFICATION_EMAIL || '',
        public: {
            apiBase: '/api',
            appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
            shopName: process.env.NUXT_PUBLIC_SHOP_NAME || 'TauHorse',
            brandName: process.env.NUXT_PUBLIC_BRAND_NAME || 'TauHorse',
            shopEmail: process.env.NUXT_PUBLIC_SHOP_EMAIL || 'zoloto666@inbox.ru',
            shopPhone: process.env.NUXT_PUBLIC_SHOP_PHONE || '+79013520534',
            shopPhoneDisplay: process.env.NUXT_PUBLIC_SHOP_PHONE_DISPLAY || '+7 901 352-05-34',
            shopAddress: process.env.NUXT_PUBLIC_SHOP_ADDRESS || 'г. Долгопрудный, Хлебниково, ул. Ленинградская, д. 24',
            sellerName: process.env.NUXT_PUBLIC_SELLER_NAME || 'ИП Туманова Елена Владимировна',
            sellerId: process.env.NUXT_PUBLIC_SELLER_ID || '321508100345153',
            sellerInn: process.env.NUXT_PUBLIC_SELLER_INN || '507803101860',
            sellerOgrnip: process.env.NUXT_PUBLIC_SELLER_OGRNIP || process.env.NUXT_PUBLIC_SELLER_ID || '321508100345153',
            sellerLegalAddress: process.env.NUXT_PUBLIC_SELLER_LEGAL_ADDRESS || 'г. Долгопрудный, Хлебниково, ул. Ленинградская, д. 24',
            sellerRegistrationAuthority: process.env.NUXT_PUBLIC_SELLER_REGISTRATION_AUTHORITY || '',
            contactPerson: process.env.NUXT_PUBLIC_CONTACT_PERSON || 'Юлия Котова',
            socialMax: process.env.NUXT_PUBLIC_SOCIAL_MAX || 'https://max.ru/u/f9LHodD0cOIOGWFsEvii_RphX3uoWncwmI6Cmhe8CIJ6NIbYsUrdgfSyWLM',
            socialWhatsapp: process.env.NUXT_PUBLIC_SOCIAL_WHATSAPP || 'https://wa.me/79013520534',
            socialAvito: process.env.NUXT_PUBLIC_SOCIAL_AVITO || 'https://www.avito.ru/dolgoprudnyy/tovary_dlya_zhivotnyh/lizunets_konfeta_dlya_loshadey_8222244356',
            relatedProjectUrl: process.env.NUXT_PUBLIC_RELATED_PROJECT_URL || 'https://ledenkon.ru/',
            claimsEmail: process.env.NUXT_PUBLIC_CLAIMS_EMAIL || process.env.NUXT_PUBLIC_SHOP_EMAIL || 'zoloto666@inbox.ru'

        }
    },
    app: {
        head: {
            htmlAttrs: {lang: 'ru'},
            title: 'TauHorse — корма и лизунцы для лошадей',
            link: [
                {rel: 'icon', type: 'image/png', sizes: '128x128', href: '/brand/tauhorse-favicon.png'},
                {rel: 'apple-touch-icon', href: '/brand/tauhorse-favicon.png'}
            ],
            meta: [
                {name: 'viewport', content: 'width=device-width, initial-scale=1'},
                {name: 'description', content: 'TauHorse — корма и лизунцы для лошадей с доставкой по Москве и Московской области, самовывозом и отправкой по России.'},
                {property: 'og:site_name', content: 'TauHorse'},
                {property: 'og:locale', content: 'ru_RU'},
                {name: 'theme-color', content: '#6f5230'},
                {name: 'referrer', content: 'strict-origin-when-cross-origin'}
            ]
        }
    },
    routeRules: {
        '/**': {headers: securityHeaders},
        '/admin/**': {ssr: false, headers: {...securityHeaders, ...noStoreHeaders, 'X-Robots-Tag': 'noindex, nofollow, noarchive'}},
        '/account/**': {ssr: false, headers: {...securityHeaders, ...noStoreHeaders, 'X-Robots-Tag': 'noindex, nofollow, noarchive'}},
        '/cart': {headers: {...securityHeaders, ...noStoreHeaders, 'X-Robots-Tag': 'noindex, nofollow, noarchive'}},
        '/checkout': {headers: {...securityHeaders, ...noStoreHeaders, 'X-Robots-Tag': 'noindex, nofollow, noarchive'}},
        '/orders/**': {headers: {...securityHeaders, ...noStoreHeaders, 'X-Robots-Tag': 'noindex, nofollow, noarchive'}},
        '/shared-cart/**': {headers: {...securityHeaders, ...noStoreHeaders, 'X-Robots-Tag': 'noindex, nofollow, noarchive'}},
        '/login': {headers: {...securityHeaders, ...noStoreHeaders, 'X-Robots-Tag': 'noindex, nofollow, noarchive'}},
        '/register': {headers: {...securityHeaders, ...noStoreHeaders, 'X-Robots-Tag': 'noindex, nofollow, noarchive'}},
        '/forgot-password': {headers: {...securityHeaders, ...noStoreHeaders, 'X-Robots-Tag': 'noindex, nofollow, noarchive'}},
        '/reset-password': {headers: {...securityHeaders, ...noStoreHeaders, 'X-Robots-Tag': 'noindex, nofollow, noarchive'}},
        '/verify-email': {headers: {...securityHeaders, ...noStoreHeaders, 'X-Robots-Tag': 'noindex, nofollow, noarchive'}},
        '/api/auth/**': {headers: {...securityHeaders, ...noStoreHeaders}},
        '/api/orders/**': {headers: {...securityHeaders, ...noStoreHeaders}},
        '/api/staff/**': {headers: {...securityHeaders, ...noStoreHeaders}},
        '/api/audit/**': {headers: {...securityHeaders, ...noStoreHeaders}},
        '/api/security/**': {headers: {...securityHeaders, ...noStoreHeaders}},
        '/media/**': {headers: {...securityHeaders, 'Cross-Origin-Resource-Policy': 'same-origin'}}
    }
})
