// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@pinia/nuxt'
  ],

  devtools: {
    enabled: process.env.NODE_ENV === 'development'
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { ssr: false }
  },

  compatibilityDate: '2026-06-30',

  nitro: {
    preset: 'vercel'
  },

  vite: {
    optimizeDeps: {
      include: ['konva', 'vue-konva', 'jspdf', 'zod']
    }
  },

  typescript: {
    strict: true
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
